<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { computed } from 'vue';

const props = defineProps({
    summary: {
        type: Object,
        required: true,
        // { totalPosts, statusCounts: {pending, approved, rejected, published}, scheduledCount, publishedInPeriod, averageTimeToPublishHours|null, rangeDays }
    },
    daily: {
        type: Array,
        required: true,
        // [{ date: 'YYYY-MM-DD', published: number }]
    },
});

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const averageLabel = computed(() => {
    const v = props.summary?.averageTimeToPublishHours;
    if (v === null || typeof v === 'undefined') return '—';
    try { return `${decimalFormatter.format(v)} hrs`; } catch { return `${v}`; }
});

const recentDaily = computed(() => {
    const list = Array.isArray(props.daily) ? props.daily : [];
    const count = Math.min(14, list.length);
    return count > 0 ? list.slice(-count) : [];
});

const formatDate = (value) => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
    } catch { return value; }
};

const statusMeta = [
    { key: 'pending', label: 'Pending review', tone: 'muted' },
    { key: 'approved', label: 'Approved', tone: 'default' },
    { key: 'rejected', label: 'Rejected', tone: 'muted' },
    { key: 'published', label: 'Published', tone: 'default' },
];
</script>

<template>
    <AppLayout title="Analytics">
        <Head title="Analytics" />
        <div class="space-y-6">
            <div>
                <h2 class="text-2xl font-semibold text-zinc-900">Analytics</h2>
                <p class="text-sm text-zinc-600">Track how your LinkedIn posts are performing over the last {{ summary.rangeDays }} days.</p>
            </div>

            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Total posts</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ numberFormatter.format(summary.totalPosts ?? 0) }}</div>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Published (last {{ summary.rangeDays }} days)</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ numberFormatter.format(summary.publishedInPeriod ?? 0) }}</div>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Scheduled</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ numberFormatter.format(summary.scheduledCount ?? 0) }}</div>
                </div>
                <div class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Avg. time to publish</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ averageLabel }}</div>
                </div>
            </section>

            <section class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 class="text-base font-medium text-zinc-900">Status breakdown</h3>
                <div class="mt-3 space-y-3">
                    <div v-for="item in statusMeta" :key="item.key" class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2">
                            <span
                                class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide"
                                :class="item.tone === 'muted' ? 'border-zinc-300 text-zinc-700' : 'border-zinc-900 bg-zinc-900 text-white'"
                            >
                                {{ item.label }}
                            </span>
                        </div>
                        <span class="font-medium text-zinc-900">{{ numberFormatter.format(summary.statusCounts?.[item.key] ?? 0) }}</span>
                    </div>
                </div>
            </section>

            <section class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 class="text-base font-medium text-zinc-900">Publishing cadence</h3>
                <div class="mt-3">
                    <p v-if="recentDaily.length === 0" class="text-sm text-zinc-600">No published posts in this period.</p>
                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full text-left text-sm">
                            <thead>
                                <tr class="text-zinc-600">
                                    <th scope="col" class="px-3 py-2 font-medium">Date</th>
                                    <th scope="col" class="px-3 py-2 text-right font-medium">Published</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="entry in recentDaily" :key="entry.date" class="border-t border-zinc-200">
                                    <td class="px-3 py-2 text-zinc-800">{{ formatDate(entry.date) }}</td>
                                    <td class="px-3 py-2 text-right font-medium">{{ numberFormatter.format(entry.published ?? 0) }}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p class="mt-3 text-xs text-zinc-500">Showing the most recent {{ recentDaily.length }} days within this window.</p>
                    </div>
                </div>
            </section>
        </div>
    </AppLayout>
    
</template>
