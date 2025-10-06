<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router, useForm, usePage } from '@inertiajs/vue3';
import { computed, nextTick, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import { formatDateTime } from '@/utils/datetime';

const props = defineProps({
    invites: { type: Array, default: () => [] },
    mode: { type: String, default: 'invite' },
    contactEmail: { type: String, required: true },
});

const page = usePage();
const flash = computed(() => page.props.flash ?? {});
const statusMessage = computed(() => flash.value?.status ?? null);

const createForm = useForm({
    email: '',
    maxUses: 1,
    expiresAt: '',
    notes: '',
});

const emailInput = ref(null);
const maxUsesInput = ref(null);
const expiresAtInput = ref(null);
const notesInput = ref(null);
const attempted = ref(false);

const focusFirstError = (errors) => {
    if (!attempted.value) {
        return;
    }

    nextTick(() => {
        if (errors.email && emailInput.value) {
            emailInput.value.focus();
            emailInput.value.select?.();
            return;
        }

        if (errors.maxUses && maxUsesInput.value) {
            maxUsesInput.value.focus();
            return;
        }

        if (errors.expiresAt && expiresAtInput.value) {
            expiresAtInput.value.focus();
            return;
        }

        if (errors.notes && notesInput.value) {
            notesInput.value.focus();
            notesInput.value.select?.();
        }
    });
};

watch(
    () => createForm.errors,
    (errors) => {
        focusFirstError(errors);
    },
    { deep: true },
);

const submitInvite = () => {
    attempted.value = true;
    createForm.post('/admin/invites', {
        preserveState: false,
        onSuccess: () => {
            createForm.reset();
            attempted.value = false;
        },
    });
};

const deletingId = ref(null);
const confirmDeleteId = ref(null);
const confirmDeleteVisible = computed({
    get: () => confirmDeleteId.value !== null,
    set: (value) => {
        if (!value) {
            confirmDeleteId.value = null;
        }
    },
});

const openDelete = (inviteId) => {
    confirmDeleteId.value = inviteId;
};

const closeDelete = () => {
    confirmDeleteId.value = null;
};

const destroyInvite = (inviteId) => {
    if (!inviteId) {
        return;
    }
    deletingId.value = inviteId;
    router.delete(`/admin/invites/${inviteId}`, {
        preserveScroll: true,
        onFinish: () => {
            if (deletingId.value === inviteId) {
                deletingId.value = null;
            }
            closeDelete();
        },
    });
};

const inviteLink = (code) => {
    try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/register?code=${encodeURIComponent(code)}`;
    } catch (error) {
        return `/register?code=${encodeURIComponent(code)}`;
    }
};

const copyStatus = ref({});

const copyInviteLink = async (inviteId, code) => {
    const link = inviteLink(code);
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(link);
            copyStatus.value = { ...copyStatus.value, [inviteId]: 'Copied!' };
            setTimeout(() => {
                copyStatus.value = { ...copyStatus.value, [inviteId]: null };
            }, 2000);
        }
    } catch (error) {
        copyStatus.value = { ...copyStatus.value, [inviteId]: 'Copy failed' };
        setTimeout(() => {
            copyStatus.value = { ...copyStatus.value, [inviteId]: null };
        }, 2000);
    }
};
</script>

<template>
    <AppLayout title="Invites">
        <Head title="Manage invites" />

        <div class="space-y-8">
            <header>
                <h1 class="text-2xl font-semibold text-zinc-900">Invite management</h1>
                <p class="mt-2 max-w-2xl text-sm text-zinc-600">
                    Registration is currently set to <span class="font-medium text-zinc-900">{{ props.mode }}</span> mode.
                    Share invite links directly with contacts. If someone needs access, have them reach out at
                    <a :href="`mailto:${props.contactEmail}`" class="text-zinc-900 underline-offset-4 hover:underline">
                        {{ props.contactEmail }}
                    </a>.
                </p>
                <p
                    v-if="statusMessage"
                    class="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
                    role="status"
                >
                    {{ statusMessage }}
                </p>
            </header>

            <section class="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-zinc-900">Create invite</h2>
                <p class="mt-1 text-sm text-zinc-600">Generate a new invite code. Invites default to single-use.</p>

                <form class="mt-6 grid gap-4 md:grid-cols-2" @submit.prevent="submitInvite" @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !createForm.processing) { e.preventDefault(); submitInvite(); } }" novalidate>
                    <div class="md:col-span-1 space-y-2">
                        <label for="invite-email" class="block text-sm font-medium text-zinc-800">Restrict to email (optional)</label>
                        <input
                            id="invite-email"
                            ref="emailInput"
                            v-model.trim="createForm.email"
                            type="email"
                            inputmode="email"
                            autocomplete="off"
                            spellcheck="false"
                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            :aria-describedby="createForm.errors.email ? 'invite-email-error' : undefined"
                            placeholder="guest@example.com"
                        />
                        <p
                            v-if="createForm.errors.email"
                            id="invite-email-error"
                            class="text-sm text-red-600"
                            role="alert"
                        >
                            {{ createForm.errors.email }}
                        </p>
                    </div>

                    <div class="md:col-span-1 space-y-2">
                        <label for="invite-max-uses" class="block text-sm font-medium text-zinc-800">Maximum uses</label>
                        <input
                            id="invite-max-uses"
                            ref="maxUsesInput"
                            v-model.number="createForm.maxUses"
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            required
                            inputmode="numeric"
                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            :aria-describedby="createForm.errors.maxUses ? 'invite-max-uses-error' : undefined"
                        />
                        <p
                            v-if="createForm.errors.maxUses"
                            id="invite-max-uses-error"
                            class="text-sm text-red-600"
                            role="alert"
                        >
                            {{ createForm.errors.maxUses }}
                        </p>
                    </div>

                    <div class="md:col-span-1 space-y-2">
                        <label for="invite-expires" class="block text-sm font-medium text-zinc-800">Expiration (optional)</label>
                        <input
                            id="invite-expires"
                            ref="expiresAtInput"
                            v-model="createForm.expiresAt"
                            type="datetime-local"
                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            :aria-describedby="createForm.errors.expiresAt ? 'invite-expires-error' : undefined"
                        />
                        <p
                            v-if="createForm.errors.expiresAt"
                            id="invite-expires-error"
                            class="text-sm text-red-600"
                            role="alert"
                        >
                            {{ createForm.errors.expiresAt }}
                        </p>
                    </div>

                    <div class="md:col-span-1 space-y-2">
                        <label for="invite-notes" class="block text-sm font-medium text-zinc-800">Notes (optional)</label>
                        <textarea
                            id="invite-notes"
                            ref="notesInput"
                            v-model.trim="createForm.notes"
                            rows="2"
                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                            :aria-describedby="createForm.errors.notes ? 'invite-notes-error' : 'invite-notes-help'"
                            placeholder="Team leaders, customer pilots, etc."
                        />
                        <p
                            id="invite-notes-help"
                            class="text-xs text-zinc-500"
                            :class="{ hidden: !!createForm.errors.notes }"
                        >
                            Optional context for teammates.
                        </p>
                        <p
                            v-if="createForm.errors.notes"
                            id="invite-notes-error"
                            class="text-sm text-red-600"
                            role="alert"
                        >
                            {{ createForm.errors.notes }}
                        </p>
                    </div>

                    <div class="md:col-span-2 flex justify-end">
                        <PrimeButton
                            type="submit"
                            label="Create invite"
                            :loading="createForm.processing"
                            :disabled="createForm.processing"
                            class="!bg-zinc-900 !border-none !px-4 !py-2 !text-sm !font-medium !text-white !rounded-md hover:!bg-zinc-800 focus-visible:!ring-2 focus-visible:!ring-offset-2 focus-visible:!ring-zinc-900"
                        />
                    </div>
                </form>
            </section>

            <section class="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-lg font-semibold text-zinc-900">Active invites</h2>
                        <p class="mt-1 text-sm text-zinc-600">Share the invite URLs or codes below.</p>
                    </div>
                </div>

                <div v-if="props.invites.length === 0" class="mt-6 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
                    No invites yet. Create one above to get started.
                </div>

                <div v-else class="mt-6 overflow-hidden rounded-lg border border-zinc-200">
                    <table class="min-w-full divide-y divide-zinc-200 text-sm">
                        <thead class="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                            <tr>
                                <th scope="col" class="px-4 py-3">Code</th>
                                <th scope="col" class="px-4 py-3">Email</th>
                                <th scope="col" class="px-4 py-3">Uses</th>
                                <th scope="col" class="px-4 py-3">Expires</th>
                                <th scope="col" class="px-4 py-3">Notes</th>
                                <th scope="col" class="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-200 bg-white">
                            <tr v-for="invite in props.invites" :key="invite.id">
                                <td class="px-4 py-3 align-top">
                                    <div class="font-mono text-xs text-zinc-900">{{ invite.code }}</div>
                                    <div class="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                                        <button
                                            type="button"
                                            class="rounded px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                            @click="copyInviteLink(invite.id, invite.code)"
                                        >
                                            Copy link
                                        </button>
                                        <span class="min-h-[1rem] text-xs" aria-live="polite">{{ copyStatus[invite.id] ?? '' }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="text-sm text-zinc-900">
                                        {{ invite.email ?? 'Any email' }}
                                    </div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="text-sm text-zinc-900">{{ invite.uses }} / {{ invite.maxUses }}</div>
                                    <div class="text-xs text-zinc-500">
                                        <span v-if="invite.remainingUses === null">Unlimited</span>
                                        <span v-else>{{ invite.remainingUses }} remaining</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="text-sm text-zinc-900">
                                        {{ invite.expiresAt ? formatDateTime(invite.expiresAt) : 'No expiry' }}
                                    </div>
                                    <div v-if="invite.lastUsedAt" class="text-xs text-zinc-500">
                                        Last used {{ formatDateTime(invite.lastUsedAt) }}
                                    </div>
                                </td>
                                <td class="px-4 py-3 align-top text-sm text-zinc-700">
                                    <span v-if="invite.notes && invite.notes.trim() !== ''">{{ invite.notes }}</span>
                                    <span v-else class="text-zinc-400">—</span>
                                </td>
                                <td class="px-4 py-3 align-top">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            class="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                                            @click="openDelete(invite.id)"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>

        <Dialog
            v-model:visible="confirmDeleteVisible"
            modal
            dismissable-mask
            block-scroll
            :style="{ width: '24rem' }"
            header="Remove invite"
        >
            <p class="text-sm text-zinc-600">This will remove the invite and prevent future sign-ups with its code. Existing users stay active.</p>
            <div class="mt-6 flex justify-end gap-3">
                <PrimeButton
                    type="button"
                    label="Cancel"
                    severity="secondary"
                    class="!px-4 !py-2 !text-sm"
                    @click="closeDelete"
                />
                <PrimeButton
                    type="button"
                    label="Remove invite"
                    severity="danger"
                    class="!px-4 !py-2 !text-sm"
                    :loading="deletingId !== null && deletingId === confirmDeleteId"
                    :disabled="deletingId !== null"
                    @click="destroyInvite(confirmDeleteId)"
                />
            </div>
        </Dialog>
    </AppLayout>
</template>
