<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import { useNotifications } from '@/utils/notifications';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import HookWorkbenchDrawer from './components/HookWorkbenchDrawer.vue';
import ProjectHeaderStatus from './components/ProjectHeaderStatus.vue';
import ProjectTabs from './components/ProjectTabs.vue';
import TranscriptEditor from './components/TranscriptEditor.vue';
import PostsToolbar from './components/PostsToolbar.vue';
import PostsSidebar from './components/PostsSidebar.vue';
import PostEditor from './components/PostEditor.vue';
import RegenerateDialog from './components/RegenerateDialog.vue';
import ScheduleDialog from './components/ScheduleDialog.vue';
import { formatForDateTimeLocal, localInputToUtcIso, currentTimePlusMinutes } from '@/utils/timezone';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { mergeHookIntoContent } from './utils/hookWorkbench';
import { composePresetInstruction, findPresetHint, postTypePresetOptions } from './utils/regeneratePresets';
// datetime formatting handled in child components
import { arraysEqual } from '@/utils/arrays';
import { useRealtimeChannels } from './composables/useRealtimeChannels';
import { usePostsSelection } from './composables/usePostsSelection';
import { useHashtags } from './composables/useHashtags';
import analytics from '@/lib/telemetry';

const props = defineProps({
    project: { type: Object, required: true },
    posts: { type: Array, default: () => [] },
    channels: {
        type: Object,
        default: () => ({ project: null, user: null }),
    },
    linkedIn: {
        type: Object,
        default: () => ({ connected: false }),
    },
    // Provided by controller from user scheduling preferences
    preferences: {
        type: Object,
        default: () => ({ timezone: 'UTC' }),
    },
    initialTab: { type: String, default: 'transcript' },
});

const { push: pushNotification } = useNotifications();

const getCsrfToken = () => {
    try {
        const el = document.head?.querySelector('meta[name="csrf-token"]');
        return el?.getAttribute('content') || null;
    } catch {
        return null;
    }
};

const activeTab = ref(['transcript', 'posts'].includes(props.initialTab) ? props.initialTab : 'transcript');
const processingError = ref(null);
const isDeleting = ref(false);
const deleteConfirmVisible = ref(false);
// Realtime status provided by composable
// Placeholder ref until composable is initialized
let isRealtimeUnavailable = ref(false);

const projectState = ref({ ...props.project });
const progress = ref(projectState.value.processingProgress ?? 0);
const processingStep = ref(projectState.value.processingStep ?? null);

const form = useForm({
    title: projectState.value.title ?? '',
    transcript: projectState.value.transcript ?? '',
});

// Transcript input focusing handled inside TranscriptEditor

watch(
    () => props.project,
    (incoming) => {
        projectState.value = { ...incoming };
        progress.value = incoming.processingProgress ?? 0;
        processingStep.value = incoming.processingStep ?? null;
        form.defaults({
            title: incoming.title ?? '',
            transcript: incoming.transcript ?? '',
        });
        if (!form.processing) {
            form.reset();
        }
    },
    { deep: true },
);

// header formatting moved into ProjectHeaderStatus

// Using shared datetime utils

const resetForm = () => {
    form.reset();
    processingError.value = null;
};

const saveDetails = () => {
    form.put(`/projects/${projectState.value.id}`, {
        preserveScroll: true,
        onSuccess: () => {
            processingError.value = null;
        },
    });
};

// Clear hashtags confirmation (shadcn AlertDialog)
const clearHashtagsVisible = ref(false);
const requestClearHashtags = () => {
    const current = Array.isArray(editorHashtags.value) ? editorHashtags.value : [];
    if (current.length === 0) return;
    clearHashtagsVisible.value = true;
};
const confirmClearHashtags = () => {
    editorHashtags.value = [];
    clearHashtagsVisible.value = false;
    try { pushNotification('success', 'Removed all hashtags.'); } catch {}
};

// Unsaved changes guard moved below after postDirty is defined

let isReloadingProject = false;

const reloadProject = () => {
    if (isReloadingProject) {
        return;
    }

    isReloadingProject = true;
    router.reload({
        only: ['project', 'posts'],
        preserveScroll: true,
        onSuccess: () => {
            processingError.value = null;
        },
        onFinish: () => {
            isReloadingProject = false;
        },
    });
};

// Reconnect handler is provided to realtime composable

// Removed manual re-run processing; processing is initiated by backend lifecycle

const handleProgress = (event) => {
    progress.value = event.progress ?? progress.value;
    processingStep.value = event.step ?? processingStep.value;
    projectState.value.processingProgress = progress.value;
    projectState.value.processingStep = processingStep.value;
    projectState.value.currentStage = 'processing';
    processingError.value = null;
    // Track first progress as processing started
    if (!window.__vp_processingTracked && (progress.value ?? 0) > 0) {
        window.__vp_processingTracked = true;
        analytics.capture('app.processing_started', { projectId: String(projectState.value.id), step: processingStep.value || 'queued' });
    }
};

const handleCompleted = () => {
    progress.value = 100;
    processingStep.value = 'complete';
    projectState.value.currentStage = 'posts';
    processingError.value = null;
    analytics.capture('app.processing_completed', { projectId: String(projectState.value.id) });
    // Signal to track generation count after posts reload
    window.__vp_trackGeneratedAfterReload = true;
    // Move to Posts tab and update URL
    if (activeTab.value !== 'posts') {
        activeTab.value = 'posts';
        router.visit(`/projects/${projectState.value.id}/posts`, { preserveScroll: true, preserveState: true, replace: true });
    }
    reloadProject();
};

const handleFailed = (event) => {
    processingError.value = event.message ?? 'Processing failed.';
    processingStep.value = event.message ?? 'processing_failed';
    projectState.value.currentStage = 'processing';
};

const regeneratingPostIds = ref([]);

const addRegeneratingIds = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
        return;
    }
    const unique = new Set(regeneratingPostIds.value);
    ids.forEach((id) => {
        const safeId = typeof id === 'string' ? id : (id != null ? String(id) : '');
        if (safeId !== '') {
            unique.add(safeId);
        }
    });
    regeneratingPostIds.value = Array.from(unique);
};

const removeRegeneratingIds = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
        return;
    }
    const unique = new Set(regeneratingPostIds.value);
    let changed = false;
    ids.forEach((id) => {
        const safeId = typeof id === 'string' ? id : (id != null ? String(id) : '');
        if (safeId !== '' && unique.delete(safeId)) {
            changed = true;
        }
    });
    if (changed) {
        regeneratingPostIds.value = Array.from(unique);
    }
};

const handlePostRegenerated = (event) => {
    const payload = event?.post;
    if (!payload || !payload.id) {
        reloadProject();
        return;
    }
    removeRegeneratingIds([payload.id]);
    const id = String(payload.id);
    const hasExisting = allPostsLocal.value.some((post) => post.id === id);
    if (hasExisting) {
        allPostsLocal.value = allPostsLocal.value.map((post) => (post.id === id ? { ...post, ...payload } : post));
    } else {
        allPostsLocal.value = [...allPostsLocal.value, payload];
    }
    pushNotification('success', 'Regenerated draft ready.');
    nextTick(() => setSelectedPost(id));
    reloadPosts();
};

const deleteProject = () => {
    if (isDeleting.value) return;
    deleteConfirmVisible.value = true;
};

const confirmDeleteProject = () => {
    if (isDeleting.value) return;
    isDeleting.value = true;
    router.delete(`/projects/${projectState.value.id}`, {
        headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
        onFinish: () => { isDeleting.value = false; deleteConfirmVisible.value = false; },
    });
};

const { isRealtimeUnavailable: realtimeUnavailableRef, init: initRealtime, dispose: disposeRealtime } = useRealtimeChannels({
    projectChannel: props.channels?.project,
    userChannel: props.channels?.user,
    onProgress: (e) => handleProgress(e),
    onCompleted: () => handleCompleted(),
    onFailed: (e) => handleFailed(e),
    onPostRegenerated: (e) => handlePostRegenerated(e),
    onReconnect: () => reloadProject(),
});
isRealtimeUnavailable = realtimeUnavailableRef;

onMounted(() => {
    initRealtime();
});

onBeforeUnmount(() => {
    disposeRealtime();
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (minScheduleTimer) {
        clearInterval(minScheduleTimer);
        minScheduleTimer = null;
    }
});

const allPostsLocal = ref([]);
watch(
    () => props.posts,
    (next) => {
        const items = Array.isArray(next) ? next.map((post) => ({ ...post })) : [];
        allPostsLocal.value = items;
    },
    { immediate: true, deep: true },
);

const postFilters = [
    { value: 'all', label: 'All posts' },
    { value: 'needsApproval', label: 'Needs approval' },
    { value: 'unscheduled', label: 'Unscheduled' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
];
const postFilter = ref('all');

const isPublished = (post) => Boolean(post?.publishedAt) || (post?.status ?? '') === 'published';
const isScheduled = (post) => Boolean(post?.scheduledAt) || (post?.scheduleStatus ?? '') === 'scheduled';
const needsReview = (post) => !isPublished(post) && (post?.status ?? 'pending') !== 'approved';
const filteredPosts = computed(() => {
    const source = Array.isArray(allPostsLocal.value) ? allPostsLocal.value : [];
    switch (postFilter.value) {
        case 'needsApproval':
            return source.filter((post) => needsReview(post));
        case 'unscheduled':
            return source.filter((post) => !isPublished(post) && !isScheduled(post));
        case 'scheduled':
            return source.filter((post) => !isPublished(post) && isScheduled(post));
        case 'published':
            return source.filter((post) => isPublished(post));
        case 'all':
        default:
            return source.slice();
    }
});
const filterOptions = computed(() => {
    const source = Array.isArray(allPostsLocal.value) ? allPostsLocal.value : [];
    const counts = source.reduce(
        (acc, post) => {
            acc.all += 1;
            if (needsReview(post)) {
                acc.needsApproval += 1;
            }
            const scheduled = isScheduled(post);
            const published = isPublished(post);
            if (!published && !scheduled) {
                acc.unscheduled += 1;
            }
            if (!published && scheduled) {
                acc.scheduled += 1;
            }
            if (published) {
                acc.published += 1;
            }
            return acc;
        },
        { all: 0, needsApproval: 0, unscheduled: 0, scheduled: 0, published: 0 },
    );
    return postFilters.map((option) => ({
        ...option,
        count: counts[option.value] ?? counts.all,
    }));
});
const totalPostCount = computed(() => Array.isArray(allPostsLocal.value) ? allPostsLocal.value.length : 0);
const filteredPostCount = computed(() => filteredPosts.value.length);

const {
    localPosts,
    selectedPostId,
    selectionRows,
    selectedIds,
    allSelectedModel,
    hasSelection,
    setSelectedPost,
    currentPost,
} = usePostsSelection(filteredPosts);
const setAllSelected = (val) => {
    allSelectedModel.value = val;
};
const updateSelectionRows = (rows) => {
    selectionRows.value = Array.isArray(rows) ? rows : [];
};
const setPostFilter = (val) => {
    postFilter.value = typeof val === 'string' ? val : 'all';
};
const linkedInConnected = computed(() => Boolean(props.linkedIn?.connected));
const startLinkedInAuth = () => {
    analytics.capture('app.linkedin_connect_clicked');
    window.location.href = '/settings/linked-in/auth';
};
// Selection helpers provided by composable
// Allow auto-scheduling without any manual selection; backend will select all eligible approved posts
const canBulkAutoSchedule = computed(() => linkedInConnected.value);
const bulkActionDisabled = computed(() => !hasSelection.value);

// currentPost, selection syncing, deep-linking handled by usePostsSelection
const hookWorkbenchOpen = ref(false);

// Editor state
const editorContent = ref('');
const editorHashtags = ref([]);
// Keep sanitizer for normalization; input events handled in PostEditor
const { sanitizeHashtag } = useHashtags(editorHashtags);
const editorSaving = ref(false);
const postDirty = computed(() => {
    const cp = currentPost.value;
    if (!cp) return false;
    const contentEqual = (editorContent.value ?? '') === (cp.content ?? '');
    const hashtagsEqual = arraysEqual(editorHashtags.value, Array.isArray(cp.hashtags) ? cp.hashtags : []);
    return !(contentEqual && hashtagsEqual);
});

// Unsaved changes guard for transcript and post editor
const transcriptDirty = computed(() => {
    return (
        (form.title ?? '') !== (projectState.value.title ?? '') ||
        (form.transcript ?? '') !== (projectState.value.transcript ?? '')
    );
});
const anyDirty = computed(() => transcriptDirty.value || postDirty.value);
const handleBeforeUnload = (e) => {
    if (anyDirty.value) {
        e.preventDefault();
        e.returnValue = '';
    }
};
watch(anyDirty, (dirty) => {
    if (dirty) {
        window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    }
}, { immediate: true });
const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Published', value: 'published', disabled: true },
];

watch(
    () => currentPost.value,
    (post, previous) => {
        if (!post) {
            editorContent.value = '';
            editorHashtags.value = [];
            hookWorkbenchOpen.value = false;
            return;
        }
        if (previous && post.id !== previous.id) {
            hookWorkbenchOpen.value = false;
        }
        editorContent.value = post.content ?? '';
        editorHashtags.value = Array.isArray(post.hashtags) ? post.hashtags.slice() : [];
    },
    { immediate: true },
);

watch(
    editorHashtags,
    (values) => {
        if (!Array.isArray(values)) {
            editorHashtags.value = [];
            return;
        }
        const normalized = [];
        values.forEach((entry) => {
            const cleaned = sanitizeHashtag(entry);
            if (cleaned && !normalized.includes(cleaned)) {
                normalized.push(cleaned);
            }
        });
        const unchanged = normalized.length === values.length && normalized.every((value, index) => value === values[index]);
        if (!unchanged) {
            editorHashtags.value = normalized;
        }
    },
    { deep: true },
);

// no-op

const reloadPosts = () => {
    router.reload({
        only: ['posts'],
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
            try {
                if (window.__vp_trackGeneratedAfterReload) {
                    const count = Array.isArray(allPostsLocal.value) ? allPostsLocal.value.length : 0;
                    analytics.capture('app.posts_generated', { projectId: String(projectState.value.id), count });
                    window.__vp_trackGeneratedAfterReload = false;
                }
            } catch {}
        },
    });
};

// Selection syncing and allSelectedModel provided by usePostsSelection

const updatePostStatus = (postId, status) => {
    router.patch(
        `/projects/${projectState.value.id}/posts/${postId}`,
        { status },
        {
            // Keep current editor/selection focused on the same post
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onSuccess: () => {
                // Optimistically update local state so UI enables publish immediately
                allPostsLocal.value = allPostsLocal.value.map((p) => (p.id === postId ? { ...p, status } : p));
                maybeMarkProjectReady();
                if (status === 'approved') {
                    analytics.capture('app.post_approved', { projectId: String(projectState.value.id), postId: String(postId) });
                } else if (status === 'rejected') {
                    analytics.capture('app.post_rejected', { projectId: String(projectState.value.id), postId: String(postId) });
                } else if (status === 'pending') {
                    analytics.capture('app.post_pending', { projectId: String(projectState.value.id), postId: String(postId) });
                }
            },
            onError: () => {},
        },
    );
};

const savePost = () => {
    if (!currentPost.value || editorSaving.value) return;
    editorSaving.value = true;
    router.patch(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}`,
        {
            content: editorContent.value?.slice(0, 3000) ?? '',
            hashtags: Array.isArray(editorHashtags.value) ? editorHashtags.value : [],
        },
        {
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onFinish: () => { editorSaving.value = false; },
            onSuccess: () => { reloadPosts(); },
        },
    );
};

const applyHookToDraft = (hook) => {
    if (!hook) {
        return;
    }
    const merged = mergeHookIntoContent(editorContent.value ?? '', hook);
    editorContent.value = merged.slice(0, 3000);
};

const bulkSetStatus = (ids, status) => {
    const list = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id !== '') : [];
    if (list.length === 0) {
        return;
    }
    router.post(
        `/projects/${projectState.value.id}/posts/bulk-status`,
        { ids: list, status },
        {
            // Keep selection and editor state stable while refreshing posts
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onSuccess: () => {
                // Optimistic update
                const next = allPostsLocal.value.map((p) => (list.includes(p.id) ? { ...p, status } : p));
                allPostsLocal.value = next;
                selectedIds.value = selectedIds.value.filter((id) => !list.includes(id));
                selectionRows.value = selectionRows.value.filter((row) => !list.includes(row.id));
                maybeMarkProjectReady();
            },
        },
    );
};

const publishNow = () => {
    if (!currentPost.value) return;
    analytics.capture('app.publish_now_requested', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) });
    router.post(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/publish`,
        {},
        {
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onSuccess: () => { analytics.capture('app.publish_now_succeeded', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) }); reloadPosts(); },
            onError: () => { analytics.capture('app.publish_now_failed', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) }); },
        },
    );
};

// Scheduling
const showSchedule = ref(false);
// Store as `YYYY-MM-DDTHH:MM` in the user's timezone to avoid implicit browser TZ conversions.
const scheduleDate = ref('');
const scheduleError = ref('');
const isScheduling = ref(false);
const isUnscheduling = ref(false);
const isAutoScheduling = ref(false);
const bulkAutoScheduling = ref(false);

const userTimezone = computed(() => props.preferences?.timezone ?? 'UTC');
const userLeadTimeMinutes = computed(() => props.preferences?.leadTimeMinutes ?? 30);
const minScheduleTime = ref('');
let minScheduleTimer = null;

const refreshMinScheduleTime = () => {
    minScheduleTime.value = currentTimePlusMinutes(userLeadTimeMinutes.value, userTimezone.value);
};

watch([userLeadTimeMinutes, userTimezone], () => {
    refreshMinScheduleTime();
}, { immediate: true });

const earliestScheduleSummary = computed(() => {
    if (!minScheduleTime.value) {
        return '';
    }
    const iso = localInputToUtcIso(minScheduleTime.value, userTimezone.value);
    const absolute = formatDateTime(iso);
    const relative = formatRelativeTime(iso);
    return relative ? `${absolute} (${relative})` : absolute;
});

const humanLeadRequirement = computed(() => {
    const lead = userLeadTimeMinutes.value;
    if (lead <= 0) return 'Schedule any time in the future.';
    return `Schedule at least ${lead} minute${lead === 1 ? '' : 's'} ahead.`;
});

const scheduleHelperText = computed(() => {
    const earliest = earliestScheduleSummary.value;
    if (!earliest) {
        return humanLeadRequirement.value;
    }
    return `${humanLeadRequirement.value} Earliest available: ${earliest}.`;
});

const applyMinimumScheduleTime = () => {
    refreshMinScheduleTime();
    if (!minScheduleTime.value) {
        return;
    }
    scheduleDate.value = minScheduleTime.value;
    scheduleError.value = validateScheduleDate(scheduleDate.value);
};

const openScheduleDialog = () => {
    const tz = userTimezone.value;
    refreshMinScheduleTime();
    if (currentPost.value?.scheduledAt) {
        scheduleDate.value = formatForDateTimeLocal(currentPost.value.scheduledAt, tz);
    } else {
        scheduleDate.value = minScheduleTime.value;
    }
    scheduleError.value = scheduleDate.value ? validateScheduleDate(scheduleDate.value) : '';
    showSchedule.value = true;
};

const updateScheduleVisibility = (visible) => {
    showSchedule.value = visible;
};

const updateScheduleDate = (value) => {
    scheduleDate.value = value;
};

const validateScheduleDate = (value) => {
    if (!value) {
        return 'Choose a date and time.';
    }
    try {
        const tz = userTimezone.value;
        const selectedIso = localInputToUtcIso(value, tz);
        const selectedMs = Date.parse(selectedIso);
        if (Number.isNaN(selectedMs)) {
            return 'Enter a valid date and time.';
        }
        const nowMs = Date.now();
        if (selectedMs <= nowMs) {
            return 'Scheduled time must be in the future.';
        }
        if (minScheduleTime.value) {
            const minIso = localInputToUtcIso(minScheduleTime.value, tz);
            const minMs = Date.parse(minIso);
            if (!Number.isNaN(minMs) && selectedMs < minMs) {
                return humanLeadRequirement.value;
            }
        }
        return '';
    } catch (error) {
        return 'Enter a valid date and time.';
    }
};

watch(scheduleDate, (value) => {
    if (!showSchedule.value) {
        return;
    }
    scheduleError.value = validateScheduleDate(value);
});

watch(showSchedule, (isOpen) => {
    if (isOpen) {
        refreshMinScheduleTime();
        scheduleError.value = scheduleDate.value ? validateScheduleDate(scheduleDate.value) : '';
        if (minScheduleTimer) {
            clearInterval(minScheduleTimer);
        }
        minScheduleTimer = setInterval(() => {
            refreshMinScheduleTime();
        }, 30000);
    } else {
        if (minScheduleTimer) {
            clearInterval(minScheduleTimer);
            minScheduleTimer = null;
        }
        scheduleError.value = '';
    }
});

// hashtags handled by useHashtags(editorHashtags)

const schedulePost = () => {
    if (!currentPost.value) return;
    refreshMinScheduleTime();
    scheduleError.value = validateScheduleDate(scheduleDate.value);
    if (scheduleError.value) {
        return;
    }
    isScheduling.value = true;
    const tz = userTimezone.value;
    const iso = localInputToUtcIso(scheduleDate.value, tz);
    router.post(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/schedule`,
        { scheduledAt: iso },
        {
            headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
            preserveScroll: true,
            onFinish: () => { isScheduling.value = false; },
            onSuccess: () => {
                showSchedule.value = false;
                scheduleError.value = '';
                reloadPosts();
                analytics.capture('app.post_scheduled', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) });
            },
            onError: () => {
                try {
                    const err = (window?.__inertia ?? {}).page?.props?.flash?.error;
                    if (err) {
                        scheduleError.value = err;
                        pushNotification('error', err);
                    } else {
                        scheduleError.value = 'Unable to schedule post. Try again.';
                    }
                } catch {}
                analytics.capture('app.post_schedule_failed', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) });
            },
        },
    );
};

const unschedulePost = () => {
    if (!currentPost.value) return;
    isUnscheduling.value = true;
    router.delete(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/schedule`,
        {
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
            onFinish: () => { isUnscheduling.value = false; },
            onSuccess: () => { analytics.capture('app.post_unscheduled', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) }); reloadPosts(); },
        },
    );
};

const autoSchedulePost = () => {
    if (!currentPost.value) return;
    isAutoScheduling.value = true;
    router.post(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/auto-schedule`,
        {},
        {
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onFinish: () => { isAutoScheduling.value = false; },
            onSuccess: () => { analytics.capture('app.post_auto_scheduled', { projectId: String(projectState.value.id), postId: String(currentPost.value.id) }); reloadPosts(); },
        },
    );
};

const autoScheduleSelected = () => {
    if (bulkAutoScheduling.value || !linkedInConnected.value) {
        return;
    }
    const ids = selectedIds.value.slice();
    const targetList = ids.length > 0 ? localPosts.value.filter((p) => ids.includes(p.id)) : localPosts.value;
    const eligible = targetList.filter((p) => p.status === 'approved' && !p.scheduledAt);
    if (eligible.length === 0) {
        toast.add({ severity: 'warn', summary: 'No approved posts', detail: 'There needs to be approved posts.', life: 4000 });
        return;
    }
    const payload = ids.length > 0 ? { ids } : {};
    bulkAutoScheduling.value = true;
    router.post(
        `/projects/${projectState.value.id}/posts/auto-schedule`,
        payload,
        {
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onFinish: () => { bulkAutoScheduling.value = false; },
            onSuccess: () => {
                if (ids.length > 0) {
                    selectionRows.value = selectionRows.value.filter((row) => !ids.includes(row.id));
                    selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id));
                }
                reloadPosts();
                analytics.capture('app.posts_auto_scheduled', { projectId: String(projectState.value.id), count: ids.length || undefined });
            },
        },
    );
};

const bulkUnscheduleSelected = () => {
    const ids = selectedIds.value.slice();
    if (ids.length === 0) return;
    const count = ids.length;
    confirm.require({
        message: `Unschedule ${count} selected post${count > 1 ? 's' : ''}?`,
        header: 'Unschedule Posts',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Unschedule',
        acceptClass: 'p-button-danger',
        accept: () => {
            router.post(
                `/projects/${projectState.value.id}/posts/bulk-unschedule`,
                { ids },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['posts'],
                    onSuccess: () => {
                        const set = new Set(ids);
                        allPostsLocal.value = allPostsLocal.value.map((p) => set.has(p.id)
                            ? { ...p, scheduledAt: null, scheduleStatus: null, scheduleError: null, scheduleAttemptedAt: null }
                            : p);
                        selectionRows.value = selectionRows.value.filter((row) => !set.has(row.id));
                        selectedIds.value = selectedIds.value.filter((id) => !set.has(id));
                        toast.add({ severity: 'success', summary: 'Unscheduling complete', detail: `${count} post${count > 1 ? 's' : ''} unscheduled.`, life: 3000 });
                        analytics.capture('app.posts_bulk_unscheduled', { projectId: String(projectState.value.id), count });
                    },
                },
            );
        },
    });
};

// Regenerate
const regenOpen = ref(false);
const regenCustom = ref('');
const regenPostType = ref('');
const isRegenerating = ref(false);
const presetOptions = postTypePresetOptions;
const selectedPresetHint = computed(() => findPresetHint(regenPostType.value));

const currentPostIsRegenerating = computed(() => {
    const id = currentPost.value?.id;
    if (!id) return false;
    return regeneratingPostIds.value.includes(id);
});

const resetRegenerateState = () => {
    regenOpen.value = false;
    regenCustom.value = '';
    regenPostType.value = '';
};

watch(regenOpen, (isOpen) => {
    if (!isOpen) {
        regenCustom.value = '';
        regenPostType.value = '';
    }
});

const regenerateSelected = () => {
    const selected = Array.isArray(selectedIds.value)
        ? selectedIds.value.filter((id) => typeof id === 'string' && id !== '')
        : [];
    const fallbackId = currentPost.value?.id ? String(currentPost.value.id) : null;
    const combined = selected.length > 0 ? selected : (fallbackId ? [fallbackId] : []);
    const list = Array.from(new Set(combined.map((id) => String(id))));
    if (list.length === 0) {
        pushNotification('warn', 'Select a post to regenerate.');
        return;
    }
    const anchorId = currentPost.value?.id && list.includes(String(currentPost.value.id))
        ? String(currentPost.value.id)
        : list[0];
    if (anchorId) {
        setSelectedPost(anchorId);
    }
    addRegeneratingIds(list);
    isRegenerating.value = true;
    const composedCustom = composePresetInstruction(regenCustom.value, regenPostType.value);
    const payload = { ids: list };
    if (composedCustom && composedCustom.trim() !== '') {
        payload.customInstructions = composedCustom;
    }
    if (regenPostType.value) {
        payload.postType = regenPostType.value;
    }
    router.post(
        `/projects/${projectState.value.id}/posts/bulk-regenerate`,
        payload,
        {
            preserveScroll: true,
            preserveState: true,
            only: ['posts'],
            onFinish: () => { isRegenerating.value = false; },
            onSuccess: () => {
                resetRegenerateState();
                allPostsLocal.value = allPostsLocal.value.map((p) => (list.includes(String(p.id)) ? { ...p, status: 'pending' } : p));
                analytics.capture('app.posts_regeneration_queued', { projectId: String(projectState.value.id), count: list.length, postType: regenPostType.value || undefined, hasCustom: Boolean(composedCustom) });
            },
            onError: () => {
                removeRegeneratingIds(list);
                pushNotification('error', 'Unable to queue regeneration. Please try again.');
                analytics.capture('app.posts_regeneration_queue_failed', { projectId: String(projectState.value.id), count: list.length });
            },
        },
    );
};

// If all posts are reviewed (no pending) and stage is posts, advance to ready
let updatingStage = false;
const maybeMarkProjectReady = async () => {
    if (updatingStage) return;
    if ((projectState.value.currentStage ?? 'posts') !== 'posts') return;
    const hasPending = allPostsLocal.value.some((p) => (p.status ?? 'pending') === 'pending');
    if (hasPending) return;
    try {
        const projectId = projectState.value?.id;
        if (!projectId) {
            return;
        }
        updatingStage = true;
        await router.put(`/projects/${projectId}/stage`, { nextStage: 'ready' }, { preserveScroll: true });
        projectState.value.currentStage = 'ready';
    } catch (error) {
        console.error('Failed to update stage', error);
    } finally {
        updatingStage = false;
    }
};

const handleTabChange = (tab) => {
    if (activeTab.value === tab) return;
    const projectId = projectState.value?.id;
    if (!projectId) {
        console.warn('Unable to change project tab: missing project id');
        return;
    }
    activeTab.value = tab;
    router.visit(`/projects/${projectId}/${tab}`, { preserveState: true, preserveScroll: true, replace: true });
};
</script>

<template>
    <AppLayout :title="projectState.title ?? 'Project'">
        <Head :title="projectState.title ?? 'Project'" />
        <section class="space-y-6">
            <ProjectHeaderStatus
                :title="projectState.title ?? 'Project'"
                :createdAt="projectState.createdAt"
                :updatedAt="projectState.updatedAt"
                :stage="projectState.currentStage"
                :progress="progress"
                :step="processingStep"
                :processingError="processingError"
                :isRealtimeUnavailable="isRealtimeUnavailable"
                :isDeleting="isDeleting"
                @delete="deleteProject"
            />

            <div>
                <ProjectTabs :activeTab="activeTab" @change="handleTabChange" />

                <TranscriptEditor v-if="activeTab === 'transcript'" :form="form" @save="saveDetails" @reset="resetForm" />

                <section v-else class="space-y-4 rounded-b-md border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
                    <p v-if="totalPostCount === 0" class="text-sm text-zinc-600">
                        No posts generated yet.
                    </p>
                    <p v-else-if="filteredPostCount === 0" class="text-sm text-zinc-600">
                        No posts match your filter.
                    </p>

                    <div v-else class="space-y-4">
                        <div v-if="!linkedInConnected" class="rounded-md border border-zinc-200 bg-white p-4">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-zinc-700">Connect LinkedIn to enable publishing and scheduling.</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  @click="startLinkedInAuth"
                                >
                                  Connect LinkedIn
                                </Button>
                            </div>
                        </div>

                        <div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div class="space-y-3 md:col-span-1">
                                <PostsToolbar
                                    :selectedCount="selectedIds.length"
                                    :filters="filterOptions"
                                    :filterValue="postFilter"
                                    :bulkActionDisabled="bulkActionDisabled"
                                    :canBulkAutoSchedule="canBulkAutoSchedule"
                                    :bulkAutoScheduling="bulkAutoScheduling"
                                    @update:filter="setPostFilter"
                                    @approve="() => bulkSetStatus(selectedIds, 'approved')"
                                    @markPending="() => bulkSetStatus(selectedIds, 'pending')"
                                    @reject="() => bulkSetStatus(selectedIds, 'rejected')"
                                    @openRegenerate="() => { regenOpen = true; }"
                                    @bulkUnschedule="bulkUnscheduleSelected"
                                    @autoSchedule="autoScheduleSelected"
                                />
                                <PostsSidebar
                                    :posts="localPosts"
                                    :selection="selectionRows"
                                    :selectedPostId="selectedPostId"
                                    :regeneratingIds="regeneratingPostIds"
                                    :allSelected="allSelectedModel"
                                    :indeterminate="selectedIds.length>0 && selectedIds.length<localPosts.length"
                                    @update:selection="updateSelectionRows"
                                    @update:allSelected="setAllSelected"
                                    @select="(id) => setSelectedPost(id)"
                                />
                            </div>

                            <PostEditor
                                class="md:col-span-2"
                                :post="currentPost"
                                :content="editorContent"
                                :hashtags="editorHashtags"
                                :statusOptions="statusOptions"
                                :editorSaving="editorSaving"
                                :postDirty="postDirty"
                                :linkedInConnected="linkedInConnected"
                                :isAutoScheduling="isAutoScheduling"
                                :isUnscheduling="isUnscheduling"
                                :isRegenerating="currentPostIsRegenerating"
                                @update:content="(v) => { editorContent = v; }"
                                @update:hashtags="(v) => { editorHashtags = v; }"
                                @changeStatus="(val) => { if (currentPost) updatePostStatus(currentPost.id, val); }"
                                @openWorkbench="() => { if (currentPost) { hookWorkbenchOpen = true; } }"
                                @openRegenerate="() => { regenOpen = true; }"
                                @save="savePost"
                                @scheduleOpen="openScheduleDialog"
                                @publishNow="publishNow"
                                @unschedulePost="unschedulePost"
                                @autoSchedulePost="autoSchedulePost"
                                @clearHashtags="requestClearHashtags"
                            />
                        </div>
                    </div>

                    <RegenerateDialog
                        :visible="regenOpen"
                        :regenPostType="regenPostType"
                        :regenCustom="regenCustom"
                        :presetOptions="presetOptions"
                        :selectedPresetHint="selectedPresetHint"
                        :isRegenerating="isRegenerating"
                        @update:visible="(v) => { if (!v) resetRegenerateState(); else regenOpen = v; }"
                        @update:regenPostType="(v) => { regenPostType = v; }"
                        @update:regenCustom="(v) => { regenCustom = v; }"
                        @regenerate="regenerateSelected"
                    />

                    <ScheduleDialog
                        :visible="showSchedule"
                        :scheduleDate="scheduleDate"
                        :isScheduling="isScheduling"
                        :canUnschedule="Boolean(currentPost && currentPost.scheduledAt)"
                        :isUnscheduling="isUnscheduling"
                        :minScheduleTime="minScheduleTime"
                        :helperText="scheduleHelperText"
                        :errorMessage="scheduleError"
                        @useMinimum="applyMinimumScheduleTime"
                        @update:visible="updateScheduleVisibility"
                        @update:scheduleDate="updateScheduleDate"
                        @schedule="schedulePost"
                        @unschedule="unschedulePost"
                    />

                    <HookWorkbenchDrawer
                        :open="hookWorkbenchOpen"
                        :post="currentPost"
                        :baseContent="editorContent"
                        :onClose="() => { hookWorkbenchOpen = false; }"
                        :onApplyHook="applyHookToDraft"
                    />

                    <AlertDialog v-model:open="deleteConfirmVisible">
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete project</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this project and all its generated posts. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel asChild>
                                    <Button type="button" variant="secondary" size="sm" :disabled="isDeleting">Cancel</Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Button type="button" variant="destructive" size="sm" :disabled="isDeleting" @click="confirmDeleteProject">
                                        <span v-if="isDeleting" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                                        Delete project
                                    </Button>
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <!-- Clear hashtags confirmation -->
                    <AlertDialog v-model:open="clearHashtagsVisible">
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear all hashtags?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This removes all hashtags from the current post. You can add them back later.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel asChild>
                                    <Button type="button" variant="secondary" size="sm">Cancel</Button>
                                </AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Button type="button" variant="destructive" size="sm" @click="confirmClearHashtags">
                                        Clear
                                    </Button>
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </section>
            </div>
        </section>
    </AppLayout>
</template>
