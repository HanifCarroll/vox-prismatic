<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useNotifications } from '@/utils/notifications';
import { formatDateTime, formatRelativeTime } from '@/utils/datetime';
import TrialDialog from './components/TrialDialog.vue';
import DeleteUserDialog from './components/DeleteUserDialog.vue';
import RangeSelector from './components/RangeSelector.vue';
import StatsCards from './components/StatsCards.vue';
import UsersTable from './components/UsersTable.vue';
import { useAdminUsage } from './composables/useAdminUsage';

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

const { push: pushNotification } = useNotifications();

const {
  selectedRange,
  usage,
  loading,
  errorMessage,
  currentFrom,
  currentTo,
  applyRange,
  refreshCurrentRange,
  resolveErrorMessage,
} = useAdminUsage({
  initialRange: props.initialRange,
  initialFrom: props.initialFrom,
  initialTo: props.initialTo,
  initialUsage: props.initialUsage,
  notify: (type, message) => pushNotification(type, message),
});

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

// using shared datetime utils

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
    if (!isOpen) {
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

// focus handled in child component via native focus order; keep simple here

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
        await refreshCurrentRange();
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
        await refreshCurrentRange();
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
                    <RangeSelector :options="rangeOptions" :selected="selectedRange" @change="applyRange" @refresh="refreshCurrentRange" />
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
                    <Link
                        href="/admin/invites"
                        class="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                        Manage invites
                    </Link>
                </div>
            </header>

            <!-- Notifications use Toast via useNotifications; no inline stack needed -->

            <StatsCards :totals="totals" :formatCurrency="formatCurrency" :formatNumber="formatNumber" />

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

                <UsersTable
                    v-else
                    :usage="usage"
                    :currentUserId="currentUserId"
                    :formatCurrency="formatCurrency"
                    :formatNumber="formatNumber"
                    :formatDateTime="formatDateTime"
                    :formatRelativeTime="formatRelativeTime"
                    :resolveSubscriptionBadge="resolveSubscriptionBadge"
                    :isTrialActive="isTrialActive"
                    @manageTrial="openManageTrial"
                    @deleteUser="openDeleteUser"
                />
            </section>
        </section>

        <TrialDialog
            :visible="trialDialogOpen"
            :trialEndsAt="trialForm.trialEndsAt"
            :trialNotes="trialForm.trialNotes"
            :submitting="trialSubmitting"
            :error="trialError"
            @update:visible="(v) => { trialDialogOpen = v; if (!v) closeTrialDialog(); }"
            @update:trialEndsAt="(v) => { trialForm.trialEndsAt = v; }"
            @update:trialNotes="(v) => { trialForm.trialNotes = v; }"
            @setDays="(days) => setTrialDays(days)"
            @clear="clearTrialFields"
            @submit="submitTrial"
            @cancel="closeTrialDialog"
        />

        <DeleteUserDialog
            :visible="deleteDialogOpen"
            :confirmValue="deleteConfirm"
            :canSubmit="canSubmitDelete"
            :submitting="deleteSubmitting"
            :error="deleteError"
            @update:visible="(v) => { deleteDialogOpen = v; if (!v) closeDeleteDialog(); }"
            @update:confirmValue="(v) => { deleteConfirm = v; }"
            @submit="submitDelete"
            @cancel="closeDeleteDialog"
        />
    </AppLayout>
</template>
