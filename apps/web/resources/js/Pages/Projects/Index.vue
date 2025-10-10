<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Link, router } from '@inertiajs/vue3';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useNotifications } from '@/utils/notifications';
import { Button } from '@/components/ui/button';
import { formatProcessingStep } from '@/utils/processing';

const props = defineProps({
    projects: { type: Object, required: true },
    filters: {
        type: Object,
        default: () => ({ search: '' }),
    },
});

const search = ref(props.filters.search ?? '');
const paginationLinks = computed(() => props.projects?.links ?? []);
const isEmpty = computed(() => (props.projects?.data ?? []).length === 0);

let searchDebounce = null;
let filterVisitCancelToken = null;

const applyFilters = (overrides = {}) => {
    const params = {};
    if (search.value.trim() !== '') {
        params.search = search.value.trim();
    }

    if (overrides.page) {
        params.page = overrides.page;
    }

    filterVisitCancelToken?.cancel?.();
    filterVisitCancelToken = null;

    router.get('/projects', params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onCancelToken: (token) => {
            filterVisitCancelToken = token;
        },
        onFinish: () => {
            filterVisitCancelToken = null;
        },
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

onBeforeUnmount(() => {
    clearTimeout(searchDebounce);
    filterVisitCancelToken?.cancel?.();
    filterVisitCancelToken = null;
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

const deletingId = ref(null);
const confirmDeleteId = ref(null);
const confirmDeleteVisible = ref(false);

const openDelete = (project) => {
    if (!project?.id) return;
    confirmDeleteId.value = project.id;
    confirmDeleteVisible.value = true;
};

const closeDelete = () => {
    confirmDeleteVisible.value = false;
    confirmDeleteId.value = null;
};

const destroyProject = () => {
    const id = confirmDeleteId.value;
    if (!id || deletingId.value) return;
    deletingId.value = id;
    router.delete(`/projects/${id}`, {
        headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
        onFinish: () => { if (deletingId.value === id) deletingId.value = null; },
        onSuccess: () => { pushNotification('success', 'Project deleted'); closeDelete(); },
        onError: () => { closeDelete(); },
    });
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

const stageBadge = (stage, step = null) => {
    const normalized = stage ?? '';
    if (normalized === 'ready' || normalized === 'posts') {
        return { label: 'Ready for review', classes: 'border-emerald-200 bg-emerald-100 text-emerald-800' };
    }

    return { label: formatProcessingStep(step) ?? 'Processing transcript…', classes: 'border-amber-200 bg-amber-100 text-amber-800' };
};

// Replaced by PrimeVue ConfirmDialog variant defined above
</script>

<template>
    <AppLayout title="Projects">
        <section class="space-y-6">
            <header class="space-y-1">
                <h2 class="text-2xl font-semibold text-zinc-900">Projects</h2>
                <p class="text-sm text-zinc-600">Create and manage projects to generate LinkedIn-ready posts.</p>
            </header>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div class="relative flex-1">
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
                <Link
                    href="/projects/new"
                    class="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 sm:ml-3"
                >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
                    </svg>
                    New project
                </Link>
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
                                :class="stageBadge(project.currentStage, project.processingStep).classes"
                            >
                                {{ stageBadge(project.currentStage, project.processingStep).label }}
                            </span>
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                class="inline-flex items-center gap-1"
                                @click="openDelete(project)"
                            >
                                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                            </Button>
                        </div>
                    </div>
                    <div v-if="project.currentStage && !['ready', 'posts'].includes(project.currentStage)" class="mt-3">
                        <div class="flex items-center justify-between text-xs text-zinc-500">
                            <span>{{ formatProcessingStep(project.processingStep) ?? 'Processing transcript…' }}</span>
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

    <AlertDialog v-model:open="confirmDeleteVisible">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this project and all of its generated posts. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="secondary" size="sm" :disabled="deletingId !== null" @click="closeDelete">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" variant="destructive" size="sm" :disabled="deletingId !== null" @click="destroyProject">
              <span v-if="deletingId !== null && confirmDeleteId !== null && deletingId === confirmDeleteId" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
              Delete project
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
</template>
