<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, usePage } from '@inertiajs/vue3';
import Dialog from 'primevue/dialog';
import { computed, nextTick, reactive, ref, watch } from 'vue';

const props = defineProps({
    initialRange: { type: String, default: '30d' },
    initialFrom: { type: String, default: null },
    initialTo: { type: String, default: null },
    initialUsage: { type: Array, default: () => [] },
});

const page = usePage();
const currentUserId = computed(() => page.props.auth?.user?.id ?? null);

const rangeOptions = [
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
    { key: 'all', label: 'All' },
];

const selectedRange = ref(rangeOptions.some((option) => option.key === props.initialRange) ? props.initialRange : '30d');
const usage = ref(Array.isArray(props.initialUsage) ? [...props.initialUsage] : []);
const loading = ref(false);
const errorMessage = ref(null);
const currentFrom = ref(props.initialFrom ?? null);
const currentTo = ref(props.initialTo ?? null);

const notifications = ref([]);
let notificationId = 0;
const pushNotification = (type, message) => {
    if (!message) {
        return;
    }
    notificationId += 1;
    const id = notificationId;
    notifications.value = [...notifications.value, { id, type, message }];
    setTimeout(() => {
        notifications.value = notifications.value.filter((entry) => entry.id !== id);
    }, 5000);
};

const resolveErrorMessage = (error, fallback) => {
    if (error && typeof error === 'object') {
        if ('response' in error && error.response && typeof error.response === 'object') {
            const data = error.response.data;
            if (data && typeof data.error === 'string' && data.error.trim() !== '') {
                return data.error;
            }
        }
        if ('message' in error && typeof error.message === 'string' && error.message.trim() !== '') {
            return error.message;
        }
    }
    return fallback;
};

const computeRangeBoundaries = (rangeKey) => {
    if (rangeKey === 'all') {
        return { from: null, to: null };
    }

    const days = Number.parseInt(rangeKey, 10);
    if (Number.isNaN(days) || days <= 0) {
        return { from: null, to: null };
    }

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
};

const loadUsage = async ({ from, to, showLoading }) => {
    const params = {};
    if (from) {
        params.from = from;
    }
    if (to) {
        params.to = to;
    }

    if (showLoading) {
        loading.value = true;
    }
    errorMessage.value = null;

    try {
        const response = await window.axios.get('/admin/usage', { params });
        const incoming = Array.isArray(response.data?.usage) ? response.data.usage : [];
        usage.value = incoming;
        currentFrom.value = from ?? null;
        currentTo.value = to ?? null;
    } catch (error) {
        const message = resolveErrorMessage(error, 'Failed to load usage metrics.');
        errorMessage.value = message;
        pushNotification('error', message);
    } finally {
        if (showLoading) {
            loading.value = false;
        }
    }
};

const applyRange = async (rangeKey) => {
    selectedRange.value = rangeKey;
    const { from, to } = computeRangeBoundaries(rangeKey);
    await loadUsage({ from, to, showLoading: true });
};

const refreshCurrentRange = async () => {
    await loadUsage({ from: currentFrom.value, to: currentTo.value, showLoading: true });
};

const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const formatCurrency = (value) => {
    const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? 0);
    if (!Number.isFinite(amount)) {
        return '$0.00';
    }
    try {
        return currencyFormatter.format(amount);
    } catch (error) {
        return `$${amount.toFixed(2)}`;
    }
};

const formatNumber = (value) => {
    const amount = typeof value === 'number' ? value : Number.parseFloat(value ?? 0);
    if (!Number.isFinite(amount)) {
        return '0';
    }
    try {
        return integerFormatter.format(amount);
    } catch (error) {
        return `${Math.round(amount)}`;
    }
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const formatRelativeTime = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const divisions = [
        { amount: 60, unit: 'second' },
        { amount: 60, unit: 'minute' },
        { amount: 24, unit: 'hour' },
        { amount: 7, unit: 'day' },
        { amount: 4.34524, unit: 'week' },
        { amount: 12, unit: 'month' },
        { amount: Number.POSITIVE_INFINITY, unit: 'year' },
    ];
    let duration = (date.getTime() - Date.now()) / 1000;
    for (const division of divisions) {
        if (Math.abs(duration) < division.amount) {
            return relativeTimeFormatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }
    return '';
};

const formatDateTime = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(date);
    } catch (error) {
        return date.toLocaleString();
    }
};

const totals = computed(() => {
    const entries = Array.isArray(usage.value) ? usage.value : [];
    let totalSpend = 0;
    let totalActions = 0;
    let activeSubscriptions = 0;
    let activeTrials = 0;
    const now = Date.now();

    for (const entry of entries) {
        totalSpend += Number.parseFloat(entry.totalCostUsd ?? 0) || 0;
        totalActions += Number.parseInt(entry.totalActions ?? 0, 10) || 0;
        if ((entry.subscriptionStatus ?? '').toLowerCase() === 'active') {
            activeSubscriptions += 1;
        }
        if (entry.trialEndsAt) {
            const trialDate = new Date(entry.trialEndsAt);
            if (!Number.isNaN(trialDate.getTime()) && trialDate.getTime() > now) {
                activeTrials += 1;
            }
        }
    }

    return {
        totalSpend,
        totalActions,
        activeSubscriptions,
        activeTrials,
    };
});

const subscriptionStatusMeta = {
    active: { label: 'Active', classes: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    trialing: { label: 'Trialing', classes: 'bg-blue-100 text-blue-800 border border-blue-200' },
    past_due: { label: 'Past due', classes: 'bg-amber-100 text-amber-800 border border-amber-200' },
    inactive: { label: 'Inactive', classes: 'bg-zinc-100 text-zinc-700 border border-zinc-200' },
    canceled: { label: 'Canceled', classes: 'bg-zinc-100 text-zinc-600 border border-zinc-200' },
};

const resolveSubscriptionBadge = (status) => {
    const key = (status ?? '').toLowerCase();
    return subscriptionStatusMeta[key] ?? { label: status || 'Unknown', classes: 'bg-zinc-100 text-zinc-700 border border-zinc-200' };
};

const usageEmpty = computed(() => (usage.value?.length ?? 0) === 0);

const isTrialActive = (value) => {
    if (!value) {
        return false;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return false;
    }
    return date.getTime() > Date.now();
};

const canSubmitDelete = computed(() => deleteConfirm.value.trim().toUpperCase() === deleteConfirmKeyword);

const trialDialogOpen = ref(false);
const managingUser = ref(null);
const trialForm = reactive({ trialEndsAt: '', trialNotes: '' });
const trialSubmitting = ref(false);
const trialError = ref(null);
const trialEndsInput = ref(null);

const deleteDialogOpen = ref(false);
const deletingUser = ref(null);
const deleteConfirm = ref('');
const deleteSubmitting = ref(false);
const deleteError = ref(null);
const deleteConfirmInput = ref(null);
const deleteConfirmKeyword = 'DELETE';

const toLocalInputValue = (isoString) => {
    if (!isoString) {
        return '';
    }
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoOrNull = (value) => {
    if (!value || typeof value !== 'string') {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString();
};

const openManageTrial = (user) => {
    managingUser.value = user;
    trialForm.trialEndsAt = toLocalInputValue(user?.trialEndsAt ?? null);
    trialForm.trialNotes = user?.trialNotes ?? '';
    trialError.value = null;
    trialDialogOpen.value = true;
};

const closeTrialDialog = () => {
    trialDialogOpen.value = false;
    managingUser.value = null;
    trialError.value = null;
};

watch(trialDialogOpen, (isOpen) => {
    if (isOpen) {
        nextTick(() => {
            trialEndsInput.value?.focus();
        });
    } else {
        trialForm.trialEndsAt = '';
        trialForm.trialNotes = '';
    }
});

const setTrialDays = (days) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    trialForm.trialEndsAt = toLocalInputValue(base.toISOString());
};

const clearTrialFields = () => {
    trialForm.trialEndsAt = '';
    trialForm.trialNotes = '';
};

const openDeleteUser = (user) => {
    deletingUser.value = user;
    deleteConfirm.value = '';
    deleteError.value = null;
    deleteDialogOpen.value = true;
};

const closeDeleteDialog = () => {
    deleteDialogOpen.value = false;
    deletingUser.value = null;
    deleteError.value = null;
    deleteConfirm.value = '';
};

watch(deleteDialogOpen, (isOpen) => {
    if (isOpen) {
        nextTick(() => {
            deleteConfirmInput.value?.focus();
        });
    }
});

const submitTrial = async () => {
    if (!managingUser.value) {
        return;
    }
    trialError.value = null;
    trialSubmitting.value = true;

    const payload = {
        trialEndsAt: toIsoOrNull(trialForm.trialEndsAt),
        trialNotes: trialForm.trialNotes && trialForm.trialNotes.trim() !== '' ? trialForm.trialNotes.trim() : null,
    };

    try {
        await window.axios.patch(`/admin/users/${managingUser.value.userId}/trial`, payload);
        pushNotification('success', 'Trial updated.');
        trialDialogOpen.value = false;
        await loadUsage({ from: currentFrom.value, to: currentTo.value, showLoading: false });
    } catch (error) {
        const message = resolveErrorMessage(error, 'Failed to update trial.');
        trialError.value = message;
        pushNotification('error', message);
    } finally {
        trialSubmitting.value = false;
    }
};

const submitDelete = async () => {
    if (!deletingUser.value) {
        return;
    }

    if (!canSubmitDelete.value) {
        deleteError.value = "Type DELETE to confirm.";
        return;
    }

    deleteSubmitting.value = true;
    deleteError.value = null;

    try {
        await window.axios.delete(`/admin/users/${deletingUser.value.userId}`);
        pushNotification('success', 'Account deleted.');
        deleteDialogOpen.value = false;
        await loadUsage({ from: currentFrom.value, to: currentTo.value, showLoading: true });
    } catch (error) {
        const message = resolveErrorMessage(error, 'Failed to delete account.');
        deleteError.value = message;
        pushNotification('error', message);
    } finally {
        deleteSubmitting.value = false;
    }
};
</script>

<template>
    <AppLayout title="Admin">
        <Head title="Admin" />

        <section class="space-y-6">
            <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 class="text-2xl font-semibold text-zinc-900">Admin dashboard</h1>
                    <p class="text-sm text-zinc-600">Monitor spend, usage, and trials to keep subscriptions on track.</p>
                    <p v-if="currentFrom || currentTo" class="mt-2 text-xs text-zinc-500">
                        Showing
                        <span v-if="currentFrom">from {{ formatDateTime(currentFrom) }}</span>
                        <span v-if="currentFrom && currentTo"> to </span>
                        <span v-if="currentTo">{{ formatDateTime(currentTo) }}</span>
                    </p>
                </div>
                <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-medium uppercase tracking-wide text-zinc-500">Range</span>
                        <div class="inline-flex rounded-md border border-zinc-300 bg-white p-1 shadow-sm" role="group" aria-label="Usage range">
                            <button
                                v-for="option in rangeOptions"
                                :key="option.key"
                                type="button"
                                class="relative rounded px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                :class="option.key === selectedRange
                                    ? 'bg-zinc-900 text-white shadow'
                                    : 'text-zinc-600 hover:bg-zinc-100'
                                "
                                :aria-pressed="option.key === selectedRange"
                                @click="applyRange(option.key)"
                            >
                                {{ option.label }}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        @click="refreshCurrentRange"
                        :disabled="loading"
                    >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 4.5v5h5" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 19.5v-5h-5" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="m5.64 18.36 2.36-2.36m8-8 2.36-2.36" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 7a7.5 7.5 0 0 1 12 2.25M17 17a7.5 7.5 0 0 1-12-2.25" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </header>

            <div aria-live="polite" aria-atomic="true" class="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-xs flex-col gap-2">
                <div
                    v-for="note in notifications"
                    :key="note.id"
                    class="pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg"
                    :class="note.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'"
                >
                    {{ note.message }}
                </div>
            </div>

            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Total spend</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ formatCurrency(totals.totalSpend) }}</div>
                </article>
                <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Total AI actions</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ formatNumber(totals.totalActions) }}</div>
                </article>
                <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Active subscriptions</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ formatNumber(totals.activeSubscriptions) }}</div>
                </article>
                <article class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                    <div class="text-sm font-medium text-zinc-500">Active trials</div>
                    <div class="mt-1 text-2xl font-semibold text-zinc-900">{{ formatNumber(totals.activeTrials) }}</div>
                </article>
            </section>

            <section class="rounded-lg border border-zinc-200 bg-white shadow-sm">
                <header class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                    <h2 class="text-base font-semibold text-zinc-900">Users</h2>
                    <span v-if="loading" class="flex items-center gap-2 text-sm text-zinc-500" role="status">
                        <span class="inline-flex h-2 w-2 animate-pulse rounded-full bg-zinc-400"></span>
                        Loading usage…
                    </span>
                    <span v-else-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</span>
                </header>

                <div v-if="!loading && usageEmpty" class="flex flex-col items-center gap-3 px-6 py-12 text-center text-zinc-600">
                    <svg class="h-10 w-10 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" role="img" aria-labelledby="admin-empty">
                        <title id="admin-empty">No usage yet</title>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7c0-1.1.9-2 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 13h10M7 17h6" />
                    </svg>
                    <h3 class="text-lg font-semibold text-zinc-900">No usage in this range</h3>
                    <p class="max-w-sm text-sm text-zinc-500">Adjust the time range to see historical data or wait for new activity.</p>
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-zinc-200 text-left text-sm">
                        <thead class="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            <tr>
                                <th scope="col" class="px-4 py-3">User</th>
                                <th scope="col" class="px-4 py-3">Usage</th>
                                <th scope="col" class="px-4 py-3">Last active</th>
                                <th scope="col" class="px-4 py-3">Subscription</th>
                                <th scope="col" class="px-4 py-3">Trial</th>
                                <th scope="col" class="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="entry in usage" :key="entry.userId" class="divide-y divide-transparent border-b border-zinc-200 hover:bg-zinc-50">
                                <td class="whitespace-nowrap px-4 py-3 align-top">
                                    <div class="font-medium text-zinc-900">{{ entry.name || entry.email || 'Unknown user' }}</div>
                                    <div class="text-xs text-zinc-500" :title="entry.email">{{ entry.email || '—' }}</div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="font-medium text-zinc-900">{{ formatCurrency(entry.totalCostUsd) }}</div>
                                    <div class="text-xs text-zinc-500">{{ formatNumber(entry.totalActions) }} actions</div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="text-sm text-zinc-800">
                                        <span v-if="entry.lastActionAt">{{ formatRelativeTime(entry.lastActionAt) }}</span>
                                        <span v-else>No usage yet</span>
                                    </div>
                                    <div v-if="entry.lastActionAt" class="text-xs text-zinc-500">{{ formatDateTime(entry.lastActionAt) }}</div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="inline-flex items-center gap-2">
                                        <span class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" :class="resolveSubscriptionBadge(entry.subscriptionStatus).classes">
                                            {{ resolveSubscriptionBadge(entry.subscriptionStatus).label }}
                                        </span>
                                        <span v-if="entry.subscriptionPlan" class="text-xs text-zinc-500">{{ entry.subscriptionPlan }}</span>
                                    </div>
                                    <div v-if="entry.subscriptionCurrentPeriodEnd" class="text-xs text-zinc-500">
                                        Renews {{ formatDateTime(entry.subscriptionCurrentPeriodEnd) }}
                                        <span class="ml-1">({{ formatRelativeTime(entry.subscriptionCurrentPeriodEnd) }})</span>
                                    </div>
                                    <div v-if="entry.cancelAtPeriodEnd" class="text-xs font-medium text-amber-600">Cancels at period end</div>
                                    <div v-if="entry.stripeCustomerId" class="text-xs text-zinc-500">Customer: {{ entry.stripeCustomerId }}</div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div v-if="entry.trialEndsAt" class="text-sm" :class="isTrialActive(entry.trialEndsAt) ? 'text-emerald-700' : 'text-zinc-600'">
                                        <template v-if="isTrialActive(entry.trialEndsAt)">
                                            Active until {{ formatDateTime(entry.trialEndsAt) }}
                                            <span class="ml-1 text-xs text-emerald-600">({{ formatRelativeTime(entry.trialEndsAt) }})</span>
                                        </template>
                                        <template v-else>
                                            Ended {{ formatRelativeTime(entry.trialEndsAt) }}
                                            <span class="ml-1 text-xs text-zinc-500">({{ formatDateTime(entry.trialEndsAt) }})</span>
                                        </template>
                                    </div>
                                    <div v-else class="text-sm text-zinc-600">No trial</div>
                                    <p v-if="entry.trialNotes" class="mt-1 max-w-xs text-xs text-zinc-500" :title="entry.trialNotes">{{ entry.trialNotes }}</p>
                                </td>
                                <td class="px-4 py-3 text-right align-top">
                                    <div class="flex flex-col items-end gap-2">
                                        <button
                                            type="button"
                                            class="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                            @click="openManageTrial(entry)"
                                        >
                                            Manage trial
                                            <span class="sr-only">for {{ entry.name || entry.email || entry.userId }}</span>
                                        </button>
                                        <button
                                            type="button"
                                            class="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                                            :class="entry.userId === currentUserId
                                                ? 'border-zinc-300 text-zinc-400 cursor-not-allowed opacity-60'
                                                : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                            "
                                            :disabled="entry.userId === currentUserId"
                                            @click="openDeleteUser(entry)"
                                        >
                                            Delete account
                                            <span class="sr-only">for {{ entry.name || entry.email || entry.userId }}</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </section>

        <Dialog
            v-model:visible="trialDialogOpen"
            modal
            :style="{ width: '32rem', maxWidth: '100%' }"
            header="Manage trial"
            dismissable-mask
            @hide="closeTrialDialog"
        >
            <form class="space-y-4" @submit.prevent="submitTrial">
                <div>
                    <label for="trial-ends-at" class="text-sm font-medium text-zinc-700">Trial end</label>
                    <input
                        id="trial-ends-at"
                        ref="trialEndsInput"
                        v-model="trialForm.trialEndsAt"
                        type="datetime-local"
                        class="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    />
                    <div class="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <button type="button" class="rounded-full border border-zinc-300 px-3 py-1 transition hover:bg-zinc-100" @click="setTrialDays(7)">+7 days</button>
                        <button type="button" class="rounded-full border border-zinc-300 px-3 py-1 transition hover:bg-zinc-100" @click="setTrialDays(14)">+14 days</button>
                        <button type="button" class="rounded-full border border-zinc-300 px-3 py-1 transition hover:bg-zinc-100" @click="clearTrialFields">Clear</button>
                    </div>
                </div>
                <div>
                    <label for="trial-notes" class="text-sm font-medium text-zinc-700">Notes</label>
                    <textarea
                        id="trial-notes"
                        v-model="trialForm.trialNotes"
                        maxlength="500"
                        rows="4"
                        class="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        placeholder="Add internal notes…"
                    ></textarea>
                    <div class="mt-1 flex justify-between text-xs text-zinc-500">
                        <span>Max 500 characters.</span>
                        <span>{{ trialForm.trialNotes.length ?? 0 }}/500</span>
                    </div>
                </div>

                <p v-if="trialError" class="text-sm text-rose-600">{{ trialError }}</p>

                <footer class="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        class="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        @click="closeTrialDialog"
                        :disabled="trialSubmitting"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
                        :disabled="trialSubmitting"
                    >
                        <span v-if="trialSubmitting" class="inline-flex h-2 w-2 rounded-full bg-white/80"></span>
                        <span>{{ trialSubmitting ? 'Saving…' : 'Save changes' }}</span>
                    </button>
                </footer>
            </form>
        </Dialog>

        <Dialog
            v-model:visible="deleteDialogOpen"
            modal
            :style="{ width: '28rem', maxWidth: '100%' }"
            header="Delete account"
            dismissable-mask
            @hide="closeDeleteDialog"
        >
            <form class="space-y-4" @submit.prevent="submitDelete">
                <p class="text-sm text-zinc-600">
                    This permanently removes the user, their projects, generated posts, and usage history. This action cannot be undone.
                </p>
                <div>
                    <label for="admin-delete-confirm" class="text-sm font-medium text-zinc-700">Type DELETE to confirm</label>
                    <input
                        id="admin-delete-confirm"
                        ref="deleteConfirmInput"
                        v-model="deleteConfirm"
                        type="text"
                        autocomplete="off"
                        spellcheck="false"
                        class="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                        placeholder="DELETE"
                        aria-describedby="admin-delete-help"
                    />
                    <p id="admin-delete-help" class="mt-1 text-xs text-zinc-500">Deletion requires confirmation to prevent mistakes.</p>
                </div>

                <p v-if="deleteError" class="text-sm text-rose-600">{{ deleteError }}</p>

                <footer class="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        class="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        @click="closeDeleteDialog"
                        :disabled="deleteSubmitting"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="deleteSubmitting || !canSubmitDelete"
                    >
                        <span v-if="deleteSubmitting" class="inline-flex h-2 w-2 rounded-full bg-white/80"></span>
                        <span>{{ deleteSubmitting ? 'Deleting…' : 'Delete' }}</span>
                    </button>
                </footer>
            </form>
        </Dialog>
    </AppLayout>
</template>
