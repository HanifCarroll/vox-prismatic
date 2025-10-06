<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';
import Chips from 'primevue/chips';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';

const props = defineProps({
    project: { type: Object, required: true },
    posts: { type: Array, default: () => [] },
    channels: {
        type: Object,
        default: () => ({ project: null, user: null }),
    },
    initialTab: { type: String, default: 'transcript' },
});

const activeTab = ref(['transcript', 'posts'].includes(props.initialTab) ? props.initialTab : 'transcript');
const processingError = ref(null);
const isDeleting = ref(false);
const isRealtimeUnavailable = ref(false);

const projectState = ref({ ...props.project });
const progress = ref(projectState.value.processingProgress ?? 0);
const processingStep = ref(projectState.value.processingStep ?? null);

const form = useForm({
    title: projectState.value.title ?? '',
    transcript: projectState.value.transcript ?? '',
});

const titleRef = ref(null);
const transcriptRef = ref(null);
const attempted = ref(false);

const focusFirstError = (errors) => {
    if (!attempted.value) return;

    nextTick(() => {
        if (errors.title && titleRef.value) {
            titleRef.value.focus();
            titleRef.value.select?.();
            return;
        }

        if (errors.transcript && transcriptRef.value) {
            transcriptRef.value.focus();
        }
    });
};

watch(
    () => form.errors,
    (errors) => focusFirstError(errors),
    { deep: true },
);

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

const formattedStage = computed(() => {
    switch (projectState.value.currentStage) {
        case 'processing':
            return { label: 'Processing', classes: 'border-amber-200 bg-amber-100 text-amber-800' };
        case 'posts':
            return { label: 'Posts', classes: 'border-blue-200 bg-blue-100 text-blue-800' };
        case 'ready':
            return { label: 'Ready', classes: 'border-emerald-200 bg-emerald-100 text-emerald-800' };
        default:
            return { label: projectState.value.currentStage ?? 'Processing', classes: 'border-zinc-200 bg-zinc-100 text-zinc-700' };
    }
});

const formattedStep = computed(() => {
    if (!processingStep.value) return null;
    return processingStep.value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
});

const formatDateTime = (value) => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(new Date(value));
    } catch (error) {
        return value;
    }
};

const formatRelativeTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    let duration = (date.getTime() - Date.now()) / 1000;
    const divisions = [
        { amount: 60, unit: 'second' },
        { amount: 60, unit: 'minute' },
        { amount: 24, unit: 'hour' },
        { amount: 7, unit: 'day' },
        { amount: 4.34524, unit: 'week' },
        { amount: 12, unit: 'month' },
        { amount: Number.POSITIVE_INFINITY, unit: 'year' },
    ];

    for (const division of divisions) {
        if (Math.abs(duration) < division.amount) {
            const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
            return formatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }

    return '';
};

const resetForm = () => {
    form.reset();
    processingError.value = null;
};

const saveDetails = () => {
    attempted.value = true;
    form.put(`/projects/${projectState.value.id}`, {
        preserveScroll: true,
        onSuccess: () => {
            processingError.value = null;
        },
    });
};

let isReloadingProject = false;
let reconnectReloadTimer = null;
let connectionReadyTimer = null;
let connectionCleanup = null;
let hasSeenInitialConnection = false;

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

const scheduleReconnectReload = () => {
    if (reconnectReloadTimer !== null) {
        return;
    }

    reconnectReloadTimer = window.setTimeout(() => {
        reconnectReloadTimer = null;
        reloadProject();
    }, 500);
};

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
    if (isDeleting.value) {
        return;
    }

    const confirmed = window.confirm('Delete this project? Posts will also be removed.');
    if (!confirmed) {
        return;
    }

    isDeleting.value = true;
    router.delete(`/projects/${projectState.value.id}`, {
        onFinish: () => {
            isDeleting.value = false;
        },
    });
};

onMounted(() => {
    hasSeenInitialConnection = false;
    if (connectionReadyTimer !== null) {
        window.clearTimeout(connectionReadyTimer);
    }
    connectionReadyTimer = null;
    connectionCleanup = null;

    if (window.Echo && props.channels?.project) {
        window.Echo
            .private(props.channels.project)
            .listen('.project.progress', (e) => handleProgress(e))
            .listen('.project.completed', () => handleCompleted())
            .listen('.project.failed', (e) => handleFailed(e))
            .listen('.post.regenerated', () => handlePostRegenerated());
    }

    if (window.Echo && props.channels?.user) {
        window.Echo
            .private(props.channels.user)
            .listen('.post.regenerated', () => handlePostRegenerated());
    }

    const registerConnectionListeners = () => {
        const connection = window.Echo?.connector?.pusher?.connection;
        if (!connection) {
            connectionReadyTimer = window.setTimeout(registerConnectionListeners, 500);
            return;
        }

        const handleConnected = () => {
            isRealtimeUnavailable.value = false;
            if (!hasSeenInitialConnection) {
                hasSeenInitialConnection = true;
                return;
            }
            scheduleReconnectReload();
        };

        const handleResumed = () => {
            isRealtimeUnavailable.value = false;
            scheduleReconnectReload();
        };

        const handleDown = () => {
            isRealtimeUnavailable.value = true;
        };

        const handleStateChange = (states) => {
            const nextState = states.current ?? connection.state;
            if (['unavailable', 'disconnected', 'failed'].includes(nextState)) {
                isRealtimeUnavailable.value = true;
            } else if (nextState === 'connected') {
                isRealtimeUnavailable.value = false;
            }
        };

        connection.bind('connected', handleConnected);
        connection.bind('resumed', handleResumed);
        connection.bind('disconnected', handleDown);
        connection.bind('unavailable', handleDown);
        connection.bind('failed', handleDown);
        connection.bind('state_change', handleStateChange);

        if (connection.state === 'connected') {
            hasSeenInitialConnection = true;
            isRealtimeUnavailable.value = false;
        } else if (['unavailable', 'disconnected', 'failed'].includes(connection.state)) {
            isRealtimeUnavailable.value = true;
        }

        connectionCleanup = () => {
            connection.unbind('connected', handleConnected);
            connection.unbind('resumed', handleResumed);
            connection.unbind('disconnected', handleDown);
            connection.unbind('unavailable', handleDown);
            connection.unbind('failed', handleDown);
            connection.unbind('state_change', handleStateChange);
            connectionCleanup = null;
        };
    };

    registerConnectionListeners();
});

onBeforeUnmount(() => {
    if (connectionReadyTimer !== null) {
        window.clearTimeout(connectionReadyTimer);
    }
    if (connectionCleanup) {
        connectionCleanup();
    }
    if (reconnectReloadTimer !== null) {
        window.clearTimeout(reconnectReloadTimer);
    }
    if (window.Echo && props.channels?.project) {
        window.Echo.leave(props.channels.project);
    }
    if (window.Echo && props.channels?.user) {
        window.Echo.leave(props.channels.user);
    }
});

const postsList = computed(() => props.posts ?? []);

// Local reactive copy for interactions
const localPosts = ref([]);
const selectedPostId = ref(null);
const selectedIds = ref([]);
const selectionRows = ref([]);
const linkedInConnected = ref(Boolean((props.linkedIn && props.linkedIn.connected) ? props.linkedIn.connected : false));

watch(
    () => props.posts,
    (next) => {
        const items = Array.isArray(next) ? next.slice() : [];
        localPosts.value = items;
        // Preserve selection if items still exist
        if (selectedPostId.value && !items.find((p) => p.id === selectedPostId.value)) {
            selectedPostId.value = items.length > 0 ? items[0].id : null;
        }
        if (!selectedPostId.value && items.length > 0) {
            selectedPostId.value = items[0].id;
        }
        // Drop any selected ids that are gone
        selectedIds.value = selectedIds.value.filter((id) => items.some((p) => p.id === id));
        // Sync selection rows to ids
        selectionRows.value = items.filter((p) => selectedIds.value.includes(p.id));
    },
    { immediate: true, deep: true },
);

const currentPost = computed(() => localPosts.value.find((p) => p.id === selectedPostId.value) ?? null);

// Editor state
const editorContent = ref('');
const editorHashtags = ref([]);
const editorSaving = ref(false);
const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Published', value: 'published', disabled: true },
];

watch(
    () => currentPost.value,
    (post) => {
        if (!post) {
            editorContent.value = '';
            editorHashtags.value = [];
            return;
        }
        editorContent.value = post.content ?? '';
        editorHashtags.value = Array.isArray(post.hashtags) ? post.hashtags.slice() : [];
    },
    { immediate: true },
);

onMounted(() => {});

const reloadPosts = () => {
    router.reload({ only: ['posts'], preserveScroll: true });
};

// Keep selectedIds in sync with selectionRows
watch(
    () => selectionRows.value,
    (rows) => {
        selectedIds.value = Array.isArray(rows) ? rows.map((r) => r.id) : [];
    },
);

const allSelectedModel = computed({
    get: () => selectedIds.value.length > 0 && selectedIds.value.length === localPosts.value.length,
    set: (checked) => {
        if (checked) {
            selectedIds.value = localPosts.value.map((p) => p.id);
            selectionRows.value = localPosts.value.slice();
        } else {
            selectedIds.value = [];
            selectionRows.value = [];
        }
    },
});

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

const bulkSetStatus = (ids, status) => {
    const list = Array.isArray(ids) && ids.length > 0 ? ids : localPosts.value.map((p) => p.id);
    router.post(
        `/projects/${projectState.value.id}/posts/bulk-status`,
        { ids: list, status },
        {
            preserveScroll: true,
            onSuccess: () => {
                // Optimistic update
                const next = localPosts.value.map((p) => (list.includes(p.id) ? { ...p, status } : p));
                localPosts.value = next;
                selectedIds.value = [];
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

const autoScheduleProject = () => {
    router.post(
        `/projects/${projectState.value.id}/posts/auto-schedule`,
        {},
        { preserveScroll: true, onSuccess: () => reloadPosts() },
    );
};

// Regenerate
const regenOpen = ref(false);
const regenCustom = ref('');
const isRegenerating = ref(false);

const regenerateSelected = (ids) => {
    const list = Array.isArray(ids) && ids.length > 0 ? ids : localPosts.value.map((p) => p.id);
    isRegenerating.value = true;
    router.post(
        `/projects/${projectState.value.id}/posts/bulk-regenerate`,
        { ids: list, ...(regenCustom.value ? { customInstructions: regenCustom.value } : {}) },
        {
            preserveScroll: true,
            onFinish: () => { isRegenerating.value = false; },
            onSuccess: () => {
                regenOpen.value = false;
                regenCustom.value = '';
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
        await window.axios.put(`/api/projects/${projectState.value.id}/stage`, { nextStage: 'ready' });
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
            <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <h2 class="text-xl font-semibold text-zinc-900">{{ projectState.title ?? 'Untitled Project' }}</h2>
                            <span
                                class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                                :class="formattedStage.classes"
                            >
                                {{ formattedStage.label }}
                            </span>
                        </div>
                        <dl class="flex flex-wrap gap-4 text-xs text-zinc-500">
                            <div class="flex items-center gap-1" v-if="projectState.createdAt">
                                <dt class="font-medium text-zinc-700">Created</dt>
                                <dd>{{ formatDateTime(projectState.createdAt) }}</dd>
                            </div>
                            <div class="flex items-center gap-1" v-if="projectState.updatedAt">
                                <dt class="font-medium text-zinc-700">Updated</dt>
                                <dd>{{ formatRelativeTime(projectState.updatedAt) }}</dd>
                            </div>
                        </dl>
                        <div v-if="projectState.currentStage === 'processing'" class="space-y-1">
                            <div class="flex items-center justify-between text-xs text-zinc-500">
                                <span>{{ formattedStep ?? 'Processing…' }}</span>
                                <span>{{ Math.round(progress) }}%</span>
                            </div>
                            <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                                <div
                                    class="h-full rounded-full bg-zinc-900 transition-all"
                                    :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
                                ></div>
                            </div>
                        </div>
                        <p v-if="processingError" class="text-sm text-red-600" role="alert">{{ processingError }}</p>
                        <p
                            v-if="isRealtimeUnavailable"
                            class="text-xs text-amber-700"
                            role="status"
                        >
                            Realtime connection lost. Re-syncing when connection is restored…
                        </p>
                    </div>
                    <div class="flex flex-col gap-2 sm:flex-row">
                        <!-- Manual re-run processing removed by request -->
                        <PrimeButton
                            type="button"
                            label="Delete project"
                            severity="danger"
                            outlined
                            :loading="isDeleting"
                            class="!px-3 !py-2 !text-sm !font-medium !rounded-md"
                            @click="deleteProject"
                        />
                    </div>
                </div>
            </div>

            <div>
                <nav class="flex gap-1 border-b border-zinc-200" aria-label="Project sections">
                    <button
                        v-for="tab in ['transcript', 'posts']"
                        :key="tab"
                        type="button"
                        class="rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition"
                        :class="activeTab === tab
                            ? 'border-zinc-900 text-zinc-900'
                            : 'border-transparent text-zinc-600 hover:text-zinc-900'"
                        :aria-current="activeTab === tab ? 'page' : undefined"
                        @click="() => { if (activeTab !== tab) { activeTab = tab; router.visit(`/projects/${projectState.value.id}/${tab}`, { preserveState: true, preserveScroll: true, replace: true }); } }"
                    >
                        {{ tab === 'transcript' ? 'Transcript' : 'Posts' }}
                    </button>
                </nav>

                <section v-if="activeTab === 'transcript'" class="space-y-4 rounded-b-md border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
                    <div class="space-y-2">
                        <label for="project-title-input" class="block text-sm font-medium text-zinc-800">Title</label>
                        <input
                            id="project-title-input"
                            ref="titleRef"
                            v-model.trim="form.title"
                            type="text"
                            maxlength="255"
                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        />
                        <p
                            v-if="form.errors.title"
                            class="text-sm text-red-600"
                            role="alert"
                        >
                            {{ form.errors.title }}
                        </p>
                    </div>
                    <div class="space-y-2">
                        <label for="project-transcript-input" class="block text-sm font-medium text-zinc-800">Transcript</label>
                        <textarea
                            id="project-transcript-input"
                            ref="transcriptRef"
                            v-model="form.transcript"
                            rows="16"
                            required
                            class="w-full resize-y rounded-md border border-zinc-300 px-3 py-3 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            aria-describedby="project-transcript-help"
                        ></textarea>
                        <p
                            id="project-transcript-help"
                            class="text-xs text-zinc-500"
                            :class="{ hidden: !!form.errors.transcript }"
                        >
                            Editing the transcript does not regenerate posts automatically.
                        </p>
                        <p
                            v-if="form.errors.transcript"
                            class="text-sm text-red-600"
                            role="alert"
                        >
                            {{ form.errors.transcript }}
                        </p>
                    </div>
                    <div class="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            class="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            @click="resetForm"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            class="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
                            :disabled="form.processing"
                            @click="saveDetails"
                        >
                            <svg
                                v-if="form.processing"
                                class="h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                            >
                                <circle cx="12" cy="12" r="9" class="opacity-25" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v6l4 2" />
                            </svg>
                            <span>{{ form.processing ? 'Saving…' : 'Save changes' }}</span>
                        </button>
                    </div>
                </section>

                <section v-else class="space-y-4 rounded-b-md border border-t-0 border-zinc-200 bg-white p-5 shadow-sm">
                    <p v-if="localPosts.length === 0" class="text-sm text-zinc-600">
                        No posts generated yet.
                    </p>

                    <div v-else class="space-y-4">
                        <div v-if="!linkedInConnected" class="rounded-md border border-zinc-200 bg-white p-4">
                            <div class="flex items-center justify-between">
                                <div class="text-sm text-zinc-700">Connect LinkedIn to enable publishing and scheduling.</div>
                                <PrimeButton size="small" label="Open Integrations" @click="() => router.visit('/settings?section=integrations')" />
                            </div>
                        </div>

                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 text-sm text-zinc-700">
                                <Checkbox binary v-model="allSelectedModel" :indeterminate="selectedIds.length>0 && selectedIds.length<localPosts.length" />
                                <span>{{ selectedIds.length > 0 ? `${selectedIds.length} selected` : `${localPosts.length} posts` }}</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <PrimeButton size="small" label="Approve" @click="() => bulkSetStatus(selectedIds, 'approved')" :disabled="localPosts.length===0 || (selectedIds.length===0 && localPosts.length===0)" />
                                <PrimeButton size="small" label="Mark Pending" outlined @click="() => bulkSetStatus(selectedIds, 'pending')" :disabled="localPosts.length===0 || (selectedIds.length===0 && localPosts.length===0)" />
                                <PrimeButton size="small" label="Reject" severity="danger" outlined @click="() => bulkSetStatus(selectedIds, 'rejected')" :disabled="localPosts.length===0 || (selectedIds.length===0 && localPosts.length===0)" />
                                <PrimeButton size="small" label="Regenerate" severity="secondary" @click="() => { regenOpen = true; }" :disabled="localPosts.length===0" />
                                <PrimeButton size="small" label="Auto-schedule Approved" @click="autoScheduleProject" :disabled="!linkedInConnected" />
                            </div>
                        </div>

                        <div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div class="md:col-span-1 rounded-md border border-zinc-200 bg-white">
                                <DataTable
                                    :value="localPosts"
                                    dataKey="id"
                                    scrollable
                                    scrollHeight="60vh"
                                    v-model:selection="selectionRows"
                                    @rowClick="(e) => { const id = e.data?.id; if (id) selectedPostId = id; }"
                                >
                                    <Column selectionMode="multiple" headerStyle="width:3rem"></Column>
                                    <Column field="status" header="Status" style="width: 8rem">
                                        <template #body="{ data }">
                                            <Tag :value="data.status" :severity="data.status==='approved' ? 'success' : data.status==='rejected' ? 'danger' : data.status==='published' ? 'info' : 'secondary'" />
                                        </template>
                                    </Column>
                                    <Column field="content" header="Post" style="min-width: 16rem">
                                        <template #body="{ data }">
                                            <div class="line-clamp-2 text-sm">{{ (data.content || '').slice(0, 160) || '—' }}</div>
                                        </template>
                                    </Column>
                                    <Column field="scheduleStatus" header="Schedule" style="width: 8rem">
                                        <template #body="{ data }">
                                            <span v-if="data.scheduleStatus" class="text-[11px] inline-flex items-center rounded border bg-sky-50 px-1.5 py-0.5 text-sky-700">{{ data.scheduleStatus }}</span>
                                            <span v-else class="text-[11px] text-zinc-400">—</span>
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>

                            <div class="md:col-span-2 flex min-h-[360px] flex-col rounded-md border border-zinc-200 bg-white p-4">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="hidden sm:flex">
                                        <SelectButton
                                            :options="statusOptions"
                                            optionLabel="label"
                                            optionValue="value"
                                            :allowEmpty="false"
                                            :modelValue="currentPost?.status ?? 'pending'"
                                            @update:modelValue="(val) => { if (val && val !== 'published' && currentPost) updatePostStatus(currentPost.id, val); }"
                                        />
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <PrimeButton size="small" label="Regenerate" severity="secondary" :disabled="!currentPost || isRegenerating" @click="() => { regenOpen = true; }" />
                                    </div>
                                </div>
                                <div class="mt-3 flex-1">
                                    <Textarea v-model="editorContent" autoResize :rows="10" class="w-full" placeholder="Edit post content…" />
                                    <div class="mt-2 flex items-center justify-between text-xs text-zinc-600">
                                        <span class="tabular-nums text-zinc-500">{{ editorContent.length }}/3000</span>
                                        <PrimeButton size="small" label="Save" severity="secondary" :disabled="!currentPost || editorSaving || (!currentPost || (editorContent === (currentPost?.content ?? '') && JSON.stringify(editorHashtags) === JSON.stringify(currentPost?.hashtags ?? [])))" @click="savePost" />
                                    </div>
                                </div>
                                <div class="mt-3">
                                    <div class="mb-1 flex items-center justify-between">
                                        <label class="block text-sm font-medium text-zinc-800">Hashtags</label>
                                        <PrimeButton
                                            size="small"
                                            label="Clear hashtags"
                                            severity="danger"
                                            outlined
                                            :disabled="!currentPost || editorHashtags.length === 0"
                                            :title="editorHashtags.length === 0 ? 'No hashtags to clear' : 'Clear all hashtags'"
                                            @click="() => { if (editorHashtags.length === 0) return; const ok = typeof globalThis !== 'undefined' && typeof globalThis.confirm === 'function' ? globalThis.confirm('Clear all hashtags for this post?') : true; if (ok) { editorHashtags = []; } }"
                                        />
                                    </div>
                                    <Chips v-model="editorHashtags" separator="," placeholder="#hashtag" addOnBlur />
                                </div>

                                <div class="mt-4 flex flex-wrap items-center gap-2 justify-end">
                                    <PrimeButton size="small" label="Schedule" :disabled="!currentPost || currentPost.status!=='approved' || editorSaving || !linkedInConnected" @click="() => { showSchedule = true; scheduleDate = currentPost?.scheduledAt ? new Date(currentPost.scheduledAt) : null; }" />
                                    <PrimeButton size="small" label="Auto-schedule" severity="secondary" :disabled="!currentPost || currentPost.status!=='approved' || editorSaving || isAutoScheduling || !linkedInConnected" @click="autoSchedulePost" />
                                    <PrimeButton
                                        size="small"
                                        label="Publish Now"
                                        :disabled="!currentPost || currentPost.status!=='approved' || editorSaving"
                                        :title="!currentPost
                                            ? 'Select a post to publish'
                                            : currentPost.status!=='approved'
                                                ? 'Approve the post before publishing'
                                                : editorSaving
                                                    ? 'Wait for save to finish'
                                                    : ''"
                                        @click="publishNow"
                                    />
                                </div>

                                <div v-if="currentPost" class="mt-3 text-xs text-zinc-600">
                                    <div v-if="currentPost.publishedAt">Published at {{ formatDateTime(currentPost.publishedAt) }}</div>
                                    <div v-else-if="currentPost.scheduledAt">Scheduled for {{ formatDateTime(currentPost.scheduledAt) }} ({{ currentPost.scheduleStatus ?? 'scheduled' }})</div>
                                    <div v-else class="text-zinc-500">Not scheduled</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Regenerate Dialog -->
                    <Dialog v-model:visible="regenOpen" modal header="Regenerate Posts" :style="{ width: '28rem' }">
                        <div class="space-y-3">
                            <p class="text-sm text-zinc-600">Optionally provide custom guidance for regeneration.</p>
                            <InputText v-model="regenCustom" class="w-full" placeholder="e.g., Emphasize a contrarian angle" />
                            <div class="flex items-center justify-end gap-2">
                                <PrimeButton label="Cancel" outlined size="small" @click="() => { regenOpen = false; regenCustom = ''; }" />
                                <PrimeButton label="Regenerate" size="small" :loading="isRegenerating" @click="() => regenerateSelected(selectedIds.length ? selectedIds : null)" />
                            </div>
                        </div>
                    </Dialog>

                    <!-- Schedule Dialog -->
                    <Dialog v-model:visible="showSchedule" modal header="Schedule Post" :style="{ width: '24rem' }">
                        <div class="space-y-4">
                            <DatePicker v-model="scheduleDate" showTime hourFormat="24" class="w-full" placeholder="Pick date & time" />
                            <div class="flex items-center justify-end gap-2">
                                <PrimeButton label="Unschedule" severity="danger" outlined size="small" :disabled="!currentPost || !currentPost.scheduledAt || isUnscheduling" @click="unschedulePost" />
                                <PrimeButton label="Schedule" size="small" :loading="isScheduling" :disabled="!scheduleDate" @click="schedulePost" />
                            </div>
                        </div>
                    </Dialog>
                </section>
            </div>
        </section>
    </AppLayout>
</template>
