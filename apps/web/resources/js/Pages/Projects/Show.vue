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
import { mergeHookIntoContent } from './utils/hookWorkbench';
import { composePresetInstruction, findPresetHint, postTypePresetOptions } from './utils/regeneratePresets';
// datetime formatting handled in child components
import { arraysEqual } from '@/utils/arrays';
import { useRealtimeChannels } from './composables/useRealtimeChannels';
import { usePostsSelection } from './composables/usePostsSelection';
import { useHashtags } from './composables/useHashtags';

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
    initialTab: { type: String, default: 'transcript' },
});

const { push: pushNotification } = useNotifications();

const activeTab = ref(['transcript', 'posts'].includes(props.initialTab) ? props.initialTab : 'transcript');
const processingError = ref(null);
const isDeleting = ref(false);
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
};

const handleCompleted = () => {
    progress.value = 100;
    processingStep.value = 'complete';
    projectState.value.currentStage = 'posts';
    processingError.value = null;
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

const handlePostRegenerated = () => {
    reloadProject();
};

const deleteProject = () => {
    if (isDeleting.value) return;
    const ok = window.confirm('Delete this project? Posts will also be removed.');
    if (!ok) return;
    isDeleting.value = true;
    router.delete(`/projects/${projectState.value.id}`, {
        onFinish: () => { isDeleting.value = false; },
    });
};

const { isRealtimeUnavailable: realtimeUnavailableRef, init: initRealtime, dispose: disposeRealtime } = useRealtimeChannels({
    projectChannel: props.channels?.project,
    userChannel: props.channels?.user,
    onProgress: (e) => handleProgress(e),
    onCompleted: () => handleCompleted(),
    onFailed: (e) => handleFailed(e),
    onPostRegenerated: () => handlePostRegenerated(),
    onReconnect: () => reloadProject(),
});
isRealtimeUnavailable = realtimeUnavailableRef;

onMounted(() => {
    initRealtime();
});

onBeforeUnmount(() => {
    disposeRealtime();
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

const postsList = computed(() => props.posts ?? []);
const {
    localPosts,
    selectedPostId,
    selectionRows,
    selectedIds,
    allSelectedModel,
    hasSelection,
    setSelectedPost,
    currentPost,
} = usePostsSelection(postsList);
const linkedInConnected = computed(() => Boolean(props.linkedIn?.connected));
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
    router.reload({ only: ['posts'], preserveScroll: true });
};

// Selection syncing and allSelectedModel provided by usePostsSelection

const updatePostStatus = (postId, status) => {
    router.patch(
        `/projects/${projectState.value.id}/posts/${postId}`,
        { status },
        {
            preserveScroll: true,
            onSuccess: () => {
                // Optimistically update local state so UI enables publish immediately
                localPosts.value = localPosts.value.map((p) => (p.id === postId ? { ...p, status } : p));
                maybeMarkProjectReady();
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
            preserveScroll: true,
            onSuccess: () => {
                // Optimistic update
                const next = localPosts.value.map((p) => (list.includes(p.id) ? { ...p, status } : p));
                localPosts.value = next;
                selectedIds.value = selectedIds.value.filter((id) => !list.includes(id));
                selectionRows.value = selectionRows.value.filter((row) => !list.includes(row.id));
                maybeMarkProjectReady();
            },
        },
    );
};

const publishNow = () => {
    if (!currentPost.value) return;
    router.post(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/publish`,
        {},
        { preserveScroll: true, onSuccess: () => reloadPosts() },
    );
};

// Scheduling
const showSchedule = ref(false);
const scheduleDate = ref(null);
const isScheduling = ref(false);
const isUnscheduling = ref(false);
const isAutoScheduling = ref(false);
const bulkAutoScheduling = ref(false);

// hashtags handled by useHashtags(editorHashtags)

const schedulePost = () => {
    if (!currentPost.value || !scheduleDate.value) return;
    isScheduling.value = true;
    const iso = new Date(scheduleDate.value).toISOString();
    router.post(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/schedule`,
        { scheduledAt: iso },
        { preserveScroll: true, onFinish: () => { isScheduling.value = false; }, onSuccess: () => { showSchedule.value = false; reloadPosts(); } },
    );
};

const unschedulePost = () => {
    if (!currentPost.value) return;
    isUnscheduling.value = true;
    router.delete(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/schedule`,
        { preserveScroll: true, onFinish: () => { isUnscheduling.value = false; }, onSuccess: () => reloadPosts() },
    );
};

const autoSchedulePost = () => {
    if (!currentPost.value) return;
    isAutoScheduling.value = true;
    router.post(
        `/projects/${projectState.value.id}/posts/${currentPost.value.id}/auto-schedule`,
        {},
        { preserveScroll: true, onFinish: () => { isAutoScheduling.value = false; }, onSuccess: () => reloadPosts() },
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
            onFinish: () => { bulkAutoScheduling.value = false; },
            onSuccess: () => {
                if (ids.length > 0) {
                    selectionRows.value = selectionRows.value.filter((row) => !ids.includes(row.id));
                    selectedIds.value = selectedIds.value.filter((id) => !ids.includes(id));
                }
                reloadPosts();
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
                    onSuccess: () => {
                        const set = new Set(ids);
                        localPosts.value = localPosts.value.map((p) => set.has(p.id)
                            ? { ...p, scheduledAt: null, scheduleStatus: null, scheduleError: null, scheduleAttemptedAt: null }
                            : p);
                        selectionRows.value = selectionRows.value.filter((row) => !set.has(row.id));
                        selectedIds.value = selectedIds.value.filter((id) => !set.has(id));
                        toast.add({ severity: 'success', summary: 'Unscheduling complete', detail: `${count} post${count > 1 ? 's' : ''} unscheduled.`, life: 3000 });
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

const regenerateSelected = (ids) => {
    const list = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && id !== '') : [];
    if (list.length === 0) {
        return;
    }
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
            onFinish: () => { isRegenerating.value = false; },
            onSuccess: () => {
                resetRegenerateState();
                localPosts.value = localPosts.value.map((p) => (list.includes(p.id) ? { ...p, status: 'pending' } : p));
            },
        },
    );
};

// If all posts are reviewed (no pending) and stage is posts, advance to ready
let updatingStage = false;
const maybeMarkProjectReady = async () => {
    if (updatingStage) return;
    if ((projectState.value.currentStage ?? 'posts') !== 'posts') return;
    const hasPending = localPosts.value.some((p) => p.status === 'pending');
    if (hasPending) return;
    try {
        updatingStage = true;
        await router.put(`/projects/${projectState.value.id}/stage`, { nextStage: 'ready' }, { preserveScroll: true });
        projectState.value.currentStage = 'ready';
    } catch (error) {
        console.error('Failed to update stage', error);
    } finally {
        updatingStage = false;
    }
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
                <ProjectTabs :activeTab="activeTab" @change="(tab) => { if (activeTab !== tab) { activeTab = tab; router.visit(`/projects/${projectState.value.id}/${tab}`, { preserveState: true, preserveScroll: true, replace: true }); } }" />

                <TranscriptEditor v-if="activeTab === 'transcript'" :form="form" @save="saveDetails" @reset="resetForm" />

                <section v-else class="space-y-4 rounded-b-md border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
                    <p v-if="localPosts.length === 0" class="text-sm text-zinc-600">
                        No posts generated yet.
                    </p>

                    <div v-else class="space-y-4">
                        <div v-if="!linkedInConnected" class="rounded-md border border-zinc-200 bg-white p-4">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-zinc-700">Connect LinkedIn to enable publishing and scheduling.</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  @click="() => { window.location.href = '/settings/linked-in/auth'; }"
                                >
                                  Connect LinkedIn
                                </Button>
                            </div>
                        </div>

                        <PostsToolbar
                            :allSelected="allSelectedModel"
                            :indeterminate="selectedIds.length>0 && selectedIds.length<localPosts.length"
                            :selectedCount="selectedIds.length"
                            :totalCount="localPosts.length"
                            :bulkActionDisabled="bulkActionDisabled"
                            :canBulkAutoSchedule="canBulkAutoSchedule"
                            :bulkAutoScheduling="bulkAutoScheduling"
                            @update:allSelected="(val) => { allSelectedModel.value = val; }"
                            @approve="() => bulkSetStatus(selectedIds, 'approved')"
                            @markPending="() => bulkSetStatus(selectedIds, 'pending')"
                            @reject="() => bulkSetStatus(selectedIds, 'rejected')"
                            @openRegenerate="() => { regenOpen = true; }"
                            @bulkUnschedule="bulkUnscheduleSelected"
                            @autoSchedule="autoScheduleSelected"
                        />

                        <div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <PostsSidebar
                                :posts="localPosts"
                                :selection="selectionRows"
                                :selectedPostId="selectedPostId"
                                @update:selection="(rows) => { selectionRows.value = rows; }"
                                @select="(id) => setSelectedPost(id)"
                                class="md:col-span-1"
                            />

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
                                @update:content="(v) => { editorContent = v; }"
                                @update:hashtags="(v) => { editorHashtags = v; }"
                                @changeStatus="(val) => { if (currentPost) updatePostStatus(currentPost.id, val); }"
                                @openWorkbench="() => { if (currentPost) { hookWorkbenchOpen = true; } }"
                                @openRegenerate="() => { regenOpen = true; }"
                                @save="savePost"
                                @scheduleOpen="() => { showSchedule = true; scheduleDate = currentPost?.scheduledAt ? new Date(currentPost.scheduledAt) : null; }"
                                @publishNow="publishNow"
                                @unschedulePost="unschedulePost"
                                @autoSchedulePost="autoSchedulePost"
                                @clearHashtags="() => { if ((editorHashtags?.length ?? 0) === 0) return; const ok = window.confirm('Clear all hashtags for this post?'); if (ok) { editorHashtags = []; } }"
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
                        @regenerate="() => regenerateSelected(selectedIds.length ? selectedIds : null)"
                    />

                    <ScheduleDialog
                        :visible="showSchedule"
                        :scheduleDate="scheduleDate"
                        :isScheduling="isScheduling"
                        :canUnschedule="Boolean(currentPost && currentPost.scheduledAt)"
                        :isUnscheduling="isUnscheduling"
                        @update:visible="(v) => { showSchedule = v; }"
                        @update:scheduleDate="(v) => { scheduleDate = v; }"
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
                </section>
            </div>
        </section>
    </AppLayout>
</template>
