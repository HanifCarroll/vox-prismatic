<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, Link, router } from '@inertiajs/vue3';

const props = defineProps({
    items: { type: Array, default: () => [] },
    meta: { type: Object, default: () => ({ page: 1, pageSize: 20, total: 0 }) },
});

const formatDateTime = (value) => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch (e) {
        return String(value);
    }
};

const goToPage = (page, pageSizeOverride = null) => {
    const pageNum = Math.max(1, Math.min(page, totalPages()));
    const size = pageSizeOverride ? Number(pageSizeOverride) : props.meta.pageSize;
    router.get(
        '/calendar',
        { page: pageNum, pageSize: size },
        { preserveState: true, preserveScroll: true, replace: true },
    );
};

const totalPages = () => {
    const total = Number(props.meta?.total ?? 0);
    const size = Number(props.meta?.pageSize ?? 1) || 1;
    return Math.max(1, Math.ceil(total / size));
};
</script>

<template>
    <AppLayout title="Calendar">
        <Head title="Scheduled Posts" />
        <div class="space-y-4">
            <div>
                <h2 class="text-2xl font-semibold text-zinc-900">Scheduled Posts</h2>
                <p class="text-sm text-zinc-600">Upcoming scheduled posts (read-only).</p>
            </div>

            <section class="rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div class="px-4 py-2">
                    <div v-if="items.length === 0" class="py-10 text-center">
                        <svg class="mx-auto h-12 w-12 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" role="img" aria-labelledby="calendar-empty-icon-title">
                            <title id="calendar-empty-icon-title">No scheduled posts</title>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <h4 class="mt-4 text-lg font-semibold text-zinc-900">Nothing on the calendar yet</h4>
                        <p class="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                            Posts will show up here after approving your drafts and scheduling them to publish.
                        </p>
                        <div class="mt-4 flex items-center justify-center gap-2">
                            <Link
                                href="/projects"
                                class="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            >
                                Go to projects
                            </Link>
                        </div>
                    </div>
                    <div v-else class="divide-y">
                        <article v-for="p in items" :key="p.id" class="flex items-center justify-between py-3">
                            <div class="min-w-0 pr-4">
                                <div class="text-sm font-medium text-zinc-900">
                                    <Link :href="`/projects/${p.projectId}/posts`" class="hover:underline">
                                        {{ p.projectTitle || 'Project' }}
                                    </Link>
                                </div>
                                <div class="text-sm text-zinc-600 truncate max-w-3xl">
                                    <Link :href="`/projects/${p.projectId}/posts`" class="hover:underline">
                                        {{ p.content }}
                                    </Link>
                                </div>
                            </div>
                            <div class="shrink-0 text-sm text-zinc-700">{{ formatDateTime(p.scheduledAt) }}</div>
                        </article>
                    </div>
                </div>
                <div v-if="items.length > 0" class="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-2 text-xs text-zinc-600">
                        <label for="page-size" class="sr-only">Items per page</label>
                        <select
                            id="page-size"
                            :value="meta.pageSize"
                            class="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            @change="(e) => goToPage(1, e.target.value)"
                        >
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="50">50</option>
                        </select>
                    </div>

                    <div class="text-center text-xs text-zinc-600" aria-live="polite">
                        Page {{ meta.page }} of {{ totalPages() }} ({{ meta.total }} total)
                    </div>

                    <div class="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            :disabled="meta.page <= 1"
                            @click="goToPage(meta.page - 1)"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            class="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60 disabled:cursor-not-allowed"
                            :disabled="meta.page >= totalPages()"
                            @click="goToPage(meta.page + 1)"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </AppLayout>
</template>
