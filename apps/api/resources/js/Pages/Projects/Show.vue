<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

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
const isProcessing = ref(false);
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

const enqueueProcessing = () => {
    if (isProcessing.value) {
        return;
    }

    processingError.value = null;
    isProcessing.value = true;
    router.post(
        `/projects/${projectState.value.id}/process`,
        {},
        {
            preserveScroll: true,
            onError: (errors) => {
                processingError.value = errors.processing ?? 'Project is already processing.';
            },
            onFinish: () => {
                isProcessing.value = false;
            },
        },
    );
};

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
    activeTab.value = 'posts';
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
                        <PrimeButton
                            type="button"
                            label="Re-run processing"
                            :loading="isProcessing"
                            class="!bg-zinc-900 !border-none !px-3 !py-2 !text-sm !font-medium !text-white !rounded-md hover:!bg-zinc-800 focus-visible:!ring-2 focus-visible:!ring-offset-2 focus-visible:!ring-zinc-900"
                            @click="enqueueProcessing"
                        />
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
                        @click="activeTab = tab"
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
                    <p v-if="postsList.length === 0" class="text-sm text-zinc-600">
                        No posts generated yet. Re-run processing to generate drafts.
                    </p>
                    <ul v-else class="space-y-3">
                        <li
                            v-for="post in postsList"
                            :key="post.id"
                            class="rounded-md border border-zinc-200 bg-zinc-50 p-4 shadow-sm"
                        >
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div class="space-y-1">
                                    <h3 class="text-sm font-semibold text-zinc-800">Post draft</h3>
                                    <p class="whitespace-pre-wrap text-sm text-zinc-700">{{ post.content }}</p>
                                </div>
                                <span
                                    class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                                    :class="post.status === 'approved'
                                        ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                        : post.status === 'rejected'
                                            ? 'border-red-200 bg-red-100 text-red-700'
                                            : 'border-zinc-200 bg-zinc-100 text-zinc-700'"
                                >
                                    {{ post.status ? post.status.charAt(0).toUpperCase() + post.status.slice(1) : 'Draft' }}
                                </span>
                            </div>
                            <div v-if="post.hashtags && post.hashtags.length" class="mt-3 flex flex-wrap gap-1 text-xs text-zinc-500">
                                <span v-for="tag in post.hashtags" :key="tag" class="rounded-full bg-zinc-100 px-2 py-0.5">#{{ tag }}</span>
                            </div>
                            <div class="mt-3 text-xs text-zinc-500" v-if="post.updatedAt">
                                Last updated {{ formatRelativeTime(post.updatedAt) }}
                            </div>
                        </li>
                    </ul>
                </section>
            </div>
        </section>
    </AppLayout>
</template>
