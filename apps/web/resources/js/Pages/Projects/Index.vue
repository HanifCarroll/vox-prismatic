<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Link, router } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';

const props = defineProps({
    projects: { type: Object, required: true },
    filters: {
        type: Object,
        default: () => ({ search: '', stages: [] }),
    },
    stageOptions: {
        type: Array,
        default: () => [],
    },
});

const search = ref(props.filters.search ?? '');
const selectedStages = ref(Array.isArray(props.filters.stages) ? [...props.filters.stages] : []);
const paginationLinks = computed(() => props.projects?.links ?? []);
const isEmpty = computed(() => (props.projects?.data ?? []).length === 0);

let searchDebounce = null;

const applyFilters = (overrides = {}) => {
    const params = {};
    if (search.value.trim() !== '') {
        params.search = search.value.trim();
    }

    if (selectedStages.value.length > 0) {
        params.stage = selectedStages.value.join(',');
    }

    if (overrides.page) {
        params.page = overrides.page;
    }

    router.get('/projects', params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
};

watch(
    () => search.value,
    () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            applyFilters({ page: 1 });
        }, 400);
    },
);

const toggleStage = (value) => {
    if (selectedStages.value.includes(value)) {
        selectedStages.value = selectedStages.value.filter((entry) => entry !== value);
    } else {
        selectedStages.value = [...selectedStages.value, value];
    }
    applyFilters({ page: 1 });
};

const clearStages = () => {
    selectedStages.value = [];
    applyFilters({ page: 1 });
};

const formatDate = (value) => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(value));
    } catch (error) {
        return value;
    }
};

const formatRelativeTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const diff = date.getTime() - Date.now();
    const divisions = [
        { amount: 60, unit: 'second' },
        { amount: 60, unit: 'minute' },
        { amount: 24, unit: 'hour' },
        { amount: 7, unit: 'day' },
        { amount: 4.34524, unit: 'week' },
        { amount: 12, unit: 'month' },
        { amount: Number.POSITIVE_INFINITY, unit: 'year' },
    ];

    let duration = diff / 1000;
    for (const division of divisions) {
        if (Math.abs(duration) < division.amount) {
            const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
            return formatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }
    return '';
};

const stageBadge = (stage) => {
    switch (stage) {
        case 'processing':
            return { label: 'Processing', classes: 'border-amber-200 bg-amber-100 text-amber-800' };
        case 'posts':
            return { label: 'Posts', classes: 'border-blue-200 bg-blue-100 text-blue-800' };
        case 'ready':
            return { label: 'Ready', classes: 'border-emerald-200 bg-emerald-100 text-emerald-800' };
        default:
            return { label: stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : 'Unknown', classes: 'border-zinc-200 bg-zinc-100 text-zinc-700' };
    }
};

const deleteProject = (project) => {
    const confirmed = window.confirm('Delete this project? Posts will also be removed.');
    if (!confirmed) {
        return;
    }

    router.delete(`/projects/${project.id}`, {
        preserveScroll: true,
    });
};
</script>

<template>
    <AppLayout title="Projects">
        <section class="space-y-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <label for="project-search" class="sr-only">Search projects</label>
                        <input
                            id="project-search"
                            v-model="search"
                            type="search"
                            placeholder="Search projects…"
                            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pl-9 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            autocomplete="off"
                        />
                        <svg class="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path stroke-linecap="round" d="m20 20-3.5-3.5" />
                        </svg>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs uppercase tracking-wide text-zinc-500">Stage</span>
                    <button
                        v-for="stage in stageOptions"
                        :key="stage.value"
                        type="button"
                        class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition"
                        :class="selectedStages.includes(stage.value)
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'"
                        @click="toggleStage(stage.value)"
                    >
                        {{ stage.label }}
                    </button>
                    <button
                        type="button"
                        class="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
                        @click="clearStages"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div v-if="isEmpty" class="mt-12 flex flex-col items-center text-center text-zinc-600">
                <svg class="h-12 w-12 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" role="img" aria-labelledby="projects-empty-icon-title">
                    <title id="projects-empty-icon-title">No projects</title>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                <h2 class="mt-4 text-lg font-semibold text-zinc-900">No projects yet</h2>
                <p class="mt-2 max-w-sm text-sm text-zinc-500">Create your first project to transform a transcript into LinkedIn-ready posts.</p>
                <Link
                    href="/projects/new"
                    class="mt-4 inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
                    </svg>
                    Create project
                </Link>
            </div>

            <div v-else class="space-y-3">
                <article
                    v-for="project in props.projects.data"
                    :key="project.id"
                    class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                >
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div class="space-y-1">
                            <Link :href="`/projects/${project.id}/posts`" class="text-base font-semibold text-zinc-900 hover:underline">
                                {{ project.title ?? 'Untitled project' }}
                            </Link>
                            <div class="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                <span v-if="project.createdAt">Created {{ formatDate(project.createdAt) }}</span>
                                <span v-if="project.createdAt && project.updatedAt" aria-hidden="true">•</span>
                                <span v-if="project.updatedAt">Last updated {{ formatRelativeTime(project.updatedAt) }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span
                                class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
                                :class="stageBadge(project.currentStage).classes"
                            >
                                {{ stageBadge(project.currentStage).label }}
                            </span>
                            <button
                                type="button"
                                class="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                @click="deleteProject(project)"
                            >
                                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                    <div v-if="project.currentStage === 'processing'" class="mt-3">
                        <div class="flex items-center justify-between text-xs text-zinc-500">
                            <span>{{ project.processingStep ? project.processingStep.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Processing…' }}</span>
                            <span>{{ Math.round(project.processingProgress ?? 0) }}%</span>
                        </div>
                        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                            <div
                                class="h-full rounded-full bg-zinc-900 transition-all"
                                :style="{ width: `${Math.min(100, Math.max(0, project.processingProgress ?? 0))}%` }"
                            ></div>
                        </div>
                    </div>
                </article>
            </div>

            <nav v-if="paginationLinks.length > 0" class="pt-4" aria-label="Pagination">
                <ul class="flex flex-wrap items-center gap-2 text-sm">
                    <li
                        v-for="link in paginationLinks"
                        :key="`${link.url ?? link.label}`"
                    >
                        <span
                            v-if="!link.url"
                            class="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border border-transparent px-3 py-1 text-zinc-400"
                            v-html="link.label"
                        ></span>
                        <Link
                            v-else
                            :href="link.url"
                            class="inline-flex min-w-[2.5rem] items-center justify-center rounded-md border px-3 py-1 transition"
                            :class="link.active
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-100'"
                            v-html="link.label"
                            preserve-scroll
                        />
                    </li>
                </ul>
            </nav>
        </section>
    </AppLayout>
</template>
