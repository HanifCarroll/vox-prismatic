<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router } from '@inertiajs/vue3';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import Card from 'primevue/card';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';

const props = defineProps({
    linkedIn: { type: Object, required: true },
    style: { type: Object, default: null },
    preferences: { type: Object, required: true },
    slots: { type: Array, default: () => [] },
    // When omitted, do not auto-scroll to any section
    initialTab: { type: String, default: null },
});

const notifications = ref([]);
let notificationId = 0;
const pushNotification = (type, message) => {
    notificationId += 1;
    const id = notificationId;
    notifications.value = [...notifications.value, { id, type, message }];
    setTimeout(() => {
        notifications.value = notifications.value.filter((entry) => entry.id !== id);
    }, 5000);
};

const resolveErrorMessage = (error, fallback) => {
    if (error && typeof error === 'object') {
        if (Object.prototype.hasOwnProperty.call(error, 'response')) {
            const response = error.response;
            if (response && typeof response === 'object') {
                const data = response.data;
                if (data && typeof data.error === 'string') {
                    return data.error;
                }
            }
        }
        if (Object.prototype.hasOwnProperty.call(error, 'message') && typeof error.message === 'string') {
            return error.message;
        }
    }
    return fallback;
};

const linkedInConnected = ref(Boolean(props.linkedIn?.connected));
const disconnectingLinkedIn = ref(false);
const connectLinkedIn = () => {
    // Use a hard navigation so the browser follows 302 to LinkedIn without XHR/CORS.
    window.location.href = '/settings/linked-in/auth';
};

const disconnectLinkedIn = async () => {
    if (disconnectingLinkedIn.value) {
        return;
    }
    disconnectingLinkedIn.value = true;
    router.post('/settings/linked-in/disconnect', {}, {
        onFinish: () => { disconnectingLinkedIn.value = false; },
        onSuccess: () => { linkedInConnected.value = false; pushNotification('success', 'Disconnected from LinkedIn.'); },
        onError: () => { pushNotification('error', 'Failed to disconnect LinkedIn.'); },
    });
};

const generateExampleId = () => {
    const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
        return cryptoApi.randomUUID();
    }
    return Math.random().toString(36).slice(2);
};

const preferredStyle = reactive({
    tone: props.style?.tone ?? '',
    audience: props.style?.audience ?? '',
    goals: props.style?.goals ?? '',
    emojiPolicy: props.style?.emojiPolicy ?? 'few',
    constraints: props.style?.constraints ?? '',
    hashtagPolicy: props.style?.hashtagPolicy ?? '',
    glossary: props.style?.glossary ?? '',
    defaultPostType: props.style?.defaultPostType ?? 'story',
});

const exampleEntries = ref(
    Array.isArray(props.style?.examples)
        ? props.style.examples
              .filter((text) => typeof text === 'string' && text.trim() !== '')
              .map((text) => ({ id: generateExampleId(), text }))
        : [],
);

const emojiOptions = [
    { label: 'None', value: 'none' },
    { label: 'Few', value: 'few' },
    { label: 'Free', value: 'free' },
];

const postTypeOptions = [
    { label: 'Story', value: 'story' },
    { label: 'How-to', value: 'how_to' },
    { label: 'Myth-bust', value: 'myth_bust' },
    { label: 'Listicle', value: 'listicle' },
    { label: 'Case study', value: 'case_study' },
    { label: 'Announcement', value: 'announcement' },
];

const savingStyle = ref(false);
const saveStyle = async () => {
    if (savingStyle.value) {
        return;
    }
    try {
        savingStyle.value = true;
        const payload = {
            tone: preferredStyle.tone || undefined,
            audience: preferredStyle.audience || undefined,
            goals: preferredStyle.goals || undefined,
            emojiPolicy: preferredStyle.emojiPolicy || undefined,
            constraints: preferredStyle.constraints || undefined,
            hashtagPolicy: preferredStyle.hashtagPolicy || undefined,
            glossary: preferredStyle.glossary || undefined,
            examples: exampleEntries.value
                .map((entry) => entry.text.trim())
                .filter((text) => text !== '')
                .slice(0, 3),
            defaultPostType: preferredStyle.defaultPostType || undefined,
        };
        router.put('/settings/style', { style: payload }, {
            onSuccess: (page) => {
                const nextStyle = page?.props?.style ?? null;
                preferredStyle.tone = nextStyle?.tone ?? preferredStyle.tone;
                preferredStyle.audience = nextStyle?.audience ?? preferredStyle.audience;
                preferredStyle.goals = nextStyle?.goals ?? preferredStyle.goals;
                preferredStyle.emojiPolicy = nextStyle?.emojiPolicy ?? preferredStyle.emojiPolicy;
                preferredStyle.constraints = nextStyle?.constraints ?? preferredStyle.constraints;
                preferredStyle.hashtagPolicy = nextStyle?.hashtagPolicy ?? preferredStyle.hashtagPolicy;
                preferredStyle.glossary = nextStyle?.glossary ?? preferredStyle.glossary;
                preferredStyle.defaultPostType = nextStyle?.defaultPostType ?? preferredStyle.defaultPostType;
                exampleEntries.value = Array.isArray(nextStyle?.examples)
                    ? nextStyle.examples
                          .filter((text) => typeof text === 'string' && text.trim() !== '')
                          .slice(0, 3)
                          .map((text) => ({ id: generateExampleId(), text }))
                    : exampleEntries.value;
                pushNotification('success', 'Writing style saved.');
            },
            onError: () => pushNotification('error', 'Failed to save writing style.'),
        });
    } catch (error) {
        pushNotification('error', resolveErrorMessage(error, 'Failed to save writing style.'));
    } finally {
        savingStyle.value = false;
    }
};

const createEmptyExample = () => ({ id: generateExampleId(), text: '' });

const timezoneZones = [
    'Etc/GMT+12',
    'Pacific/Pago_Pago',
    'Pacific/Honolulu',
    'Pacific/Marquesas',
    'America/Anchorage',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'America/Santo_Domingo',
    'America/St_Johns',
    'America/Argentina/Buenos_Aires',
    'America/Noronha',
    'Atlantic/Cape_Verde',
    'Europe/London',
    'Europe/Berlin',
    'Africa/Cairo',
    'Africa/Nairobi',
    'Asia/Tehran',
    'Asia/Dubai',
    'Asia/Kabul',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Kathmandu',
    'Asia/Dhaka',
    'Asia/Yangon',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Australia/Eucla',
    'Asia/Tokyo',
    'Australia/Darwin',
    'Australia/Sydney',
    'Australia/Lord_Howe',
    'Pacific/Noumea',
    'Pacific/Auckland',
    'Pacific/Chatham',
    'Pacific/Tongatapu',
    'Pacific/Kiritimati',
];

const formatTimezoneLabel = (zone) => {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: zone,
            timeZoneName: 'shortOffset',
            hour: '2-digit',
            minute: '2-digit',
        }).formatToParts(new Date());
        const label = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'UTC±00:00';
        return `(${label}) ${zone}`;
    } catch (error) {
        return `(UTC±00:00) ${zone}`;
    }
};

const timezoneOptions = computed(() => {
    return timezoneZones
        .map((zone) => ({ value: zone, label: formatTimezoneLabel(zone) }))
        .sort((a, b) => a.label.localeCompare(b.label));
});

const timezone = ref(props.preferences?.timezone ?? 'UTC');
const leadTimeMinutes = ref(props.preferences?.leadTimeMinutes ?? 30);

const dayOptions = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 7 },
];

const newSlotDay = ref(1);
const newSlotTime = ref('09:00');
const preferredSlots = ref(Array.isArray(props.slots) ? props.slots.map((slot) => ({ ...slot })) : []);

const updatingPreferences = ref(false);
const savePreferences = async () => {
    if (updatingPreferences.value) {
        return;
    }
    try {
        if (leadTimeMinutes.value < 0 || leadTimeMinutes.value > 1440) {
            pushNotification('error', 'Lead time must be between 0 and 1440 minutes.');
            return;
        }
        updatingPreferences.value = true;
        router.put('/settings/scheduling/preferences', {
            timezone: timezone.value,
            leadTimeMinutes: Math.round(leadTimeMinutes.value),
        }, {
            onSuccess: () => pushNotification('success', 'Scheduling preferences saved.'),
            onError: () => pushNotification('error', 'Failed to save scheduling preferences.'),
        });
    } catch (error) {
        pushNotification('error', resolveErrorMessage(error, 'Failed to save scheduling preferences.'));
    } finally {
        updatingPreferences.value = false;
    }
};

const updatingSlots = ref(false);
const syncSlots = async (items) => {
    try {
        updatingSlots.value = true;
        router.put('/settings/scheduling/slots', { items }, {
            onSuccess: () => {
                preferredSlots.value = items.map((item) => ({ ...item }));
                pushNotification('success', 'Preferred timeslots updated.');
            },
            onError: () => pushNotification('error', 'Failed to update preferred timeslots.'),
        });
    } catch (error) {
        pushNotification('error', resolveErrorMessage(error, 'Failed to update preferred timeslots.'));
    } finally {
        updatingSlots.value = false;
    }
};

const addSlot = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newSlotTime.value)) {
        pushNotification('error', 'Enter a valid time in HH:mm format.');
        return;
    }
    const existing = preferredSlots.value.some(
        (slot) => slot.isoDayOfWeek === newSlotDay.value && slot.time === newSlotTime.value,
    );
    if (existing) {
        pushNotification('error', 'This timeslot already exists.');
        return;
    }
    const next = [
        ...preferredSlots.value,
        { isoDayOfWeek: newSlotDay.value, time: newSlotTime.value, active: true },
    ];
    await syncSlots(next);
};

const removeSlot = async (index) => {
    if (preferredSlots.value.length <= 1) {
        pushNotification('error', 'Keep at least one timeslot on file.');
        return;
    }
    const next = preferredSlots.value.filter((_, idx) => idx !== index);
    await syncSlots(next);
};

const integrationsRef = ref(null);
const styleRef = ref(null);
const schedulingRef = ref(null);
const dangerRef = ref(null);

const currentTab = computed(() => props.initialTab);

const scrollToSection = (tab) => {
    const map = {
        integrations: integrationsRef,
        style: styleRef,
        scheduling: schedulingRef,
        danger: dangerRef,
    };
    const target = map[tab]?.value;
    if (target) {
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
};

watch(
    currentTab,
    (tab) => {
        nextTick(() => scrollToSection(tab));
    },
    { immediate: true },
);

onMounted(() => {
    scrollToSection(currentTab.value);
});

const dayLabel = (value) => {
    const match = dayOptions.find((option) => option.value === value);
    return match ? match.label : value;
};

// Danger Zone – Delete Account
const showDeleteModal = ref(false);
const currentPassword = ref('');
const deletingAccount = ref(false);
const canConfirmDelete = computed(() => currentPassword.value.length > 0 && !deletingAccount.value);

const openDeleteModal = () => {
    currentPassword.value = '';
    showDeleteModal.value = true;
};

const deleteAccount = async () => {
    if (!canConfirmDelete.value) {
        return;
    }
    try {
        deletingAccount.value = true;
        // Ensure CSRF cookie is available; for web, it generally is, but be safe in case of a cold session
        await window.axios.get('/api/sanctum/csrf-cookie');
        await window.axios.delete('/api/settings/account', {
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            data: { currentPassword: currentPassword.value, confirm: 'DELETE' },
        });
        // Session is invalidated server-side; navigate to login
        pushNotification('success', 'Your account was deleted. Redirecting…');
        showDeleteModal.value = false;
        setTimeout(() => {
            router.visit('/login', { replace: true });
        }, 600);
    } catch (error) {
        pushNotification('error', resolveErrorMessage(error, 'Failed to delete account.'));
    } finally {
        deletingAccount.value = false;
    }
};
</script>

<template>
    <AppLayout title="Settings" :settings-tab="currentTab">
        <Head title="Settings" />

        <section class="space-y-8">
            <header>
                <h2 class="text-2xl font-semibold text-zinc-900">Settings</h2>
                <p class="text-sm text-zinc-600">Profile, Integrations, and Defaults.</p>
            </header>

            <div class="space-y-2" aria-live="polite">
                <div
                    v-for="note in notifications"
                    :key="note.id"
                    class="rounded-md border px-4 py-3 text-sm"
                    :class="note.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-red-200 bg-red-50 text-red-700'"
                >
                    {{ note.message }}
                </div>
            </div>

            <section ref="integrationsRef" class="space-y-3">
                <h3 id="integrations" class="text-lg font-medium text-zinc-900">Integrations</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <template #title>LinkedIn</template>
                        <template #subtitle>
                            <span class="text-sm text-zinc-600">Connect your LinkedIn account to publish directly.</span>
                        </template>
                        <template #content>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-zinc-700">
                                    {{ linkedInConnected ? 'Connected' : 'Not connected' }}
                                </span>
                                <div class="flex items-center gap-2">
                                    <PrimeButton
                                        v-if="linkedInConnected"
                                        severity="secondary"
                                        size="small"
                                        :loading="disconnectingLinkedIn"
                                        label="Disconnect"
                                        @click="disconnectLinkedIn"
                                    />
                                    <PrimeButton
                                        v-else
                                        size="small"
                                        label="Connect LinkedIn"
                                        @click="connectLinkedIn"
                                    />
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </section>

            <section ref="styleRef" class="space-y-3">
                <h3 id="writing-style" class="text-lg font-medium text-zinc-900">Writing Style</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <template #title>Style Profile</template>
                        <template #subtitle>
                            <span class="text-sm text-zinc-600">Set your default voice, audience, and constraints.</span>
                        </template>
                        <template #content>
                            <div class="space-y-4">
                                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div class="flex flex-col gap-2">
                                        <label for="style-tone" class="text-sm font-medium text-zinc-700">Tone</label>
                                        <InputText id="style-tone" v-model="preferredStyle.tone" placeholder="Confident, friendly…" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-audience" class="text-sm font-medium text-zinc-700">Audience</label>
                                        <InputText id="style-audience" v-model="preferredStyle.audience" placeholder="Founders, product leaders…" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-goals" class="text-sm font-medium text-zinc-700">Goals</label>
                                        <InputText id="style-goals" v-model="preferredStyle.goals" placeholder="Share insights, drive signups…" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-emoji" class="text-sm font-medium text-zinc-700">Emoji policy</label>
                                        <Dropdown id="style-emoji" v-model="preferredStyle.emojiPolicy" :options="emojiOptions" option-label="label" option-value="value" class="w-full" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-post-type" class="text-sm font-medium text-zinc-700">Default post type</label>
                                        <Dropdown id="style-post-type" v-model="preferredStyle.defaultPostType" :options="postTypeOptions" option-label="label" option-value="value" class="w-full" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-hashtags" class="text-sm font-medium text-zinc-700">Hashtag policy</label>
                                        <InputText id="style-hashtags" v-model="preferredStyle.hashtagPolicy" placeholder="3 relevant hashtags at the end…" />
                                    </div>
                                    <div class="sm:col-span-2 flex flex-col gap-2">
                                        <label for="style-constraints" class="text-sm font-medium text-zinc-700">Constraints</label>
                                        <Textarea id="style-constraints" v-model="preferredStyle.constraints" auto-resize rows="3" placeholder="Avoid jargon, keep paragraphs short…" />
                                    </div>
                                    <div class="sm:col-span-2 flex flex-col gap-2">
                                        <label for="style-glossary" class="text-sm font-medium text-zinc-700">Glossary</label>
                                        <Textarea id="style-glossary" v-model="preferredStyle.glossary" auto-resize rows="3" placeholder="Preferred product names, acronyms, phrases…" />
                                    </div>
                                </div>
                                <div class="flex justify-end">
                                    <PrimeButton
                                        :loading="savingStyle"
                                        size="small"
                                        label="Save Writing Style"
                                        @click="saveStyle"
                                    />
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card>
                        <template #title>Few-shot Examples</template>
                        <template #subtitle>
                            <span class="text-sm text-zinc-600">Add up to 3 sample posts to guide tone and structure.</span>
                        </template>
                        <template #content>
                            <div class="space-y-4">
                                <div
                                    v-if="exampleEntries.length === 0"
                                    class="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600"
                                >
                                    <p>No examples added yet.</p>
                                    <p class="mt-2 text-xs text-zinc-500">Paste a representative LinkedIn post (2–5 short paragraphs; hashtags at the end).</p>
                                    <PrimeButton
                                        class="mt-4"
                                        label="Add your first example"
                                        size="small"
                                        @click="exampleEntries = [createEmptyExample()]"
                                    />
                                </div>
                                <div v-else class="space-y-3">
                                    <article
                                        v-for="(entry, index) in exampleEntries"
                                        :key="entry.id"
                                        class="rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
                                    >
                                        <div class="flex items-center justify-between gap-3">
                                            <label :for="`example-${entry.id}`" class="text-sm font-medium text-zinc-700">Example {{ index + 1 }}</label>
                                            <div class="flex items-center gap-3 text-xs text-zinc-500">
                                                <span>{{ entry.text.length }}/1200</span>
                                                <PrimeButton
                                                    label="Remove"
                                                    severity="secondary"
                                                    text
                                                    size="small"
                                                    @click="exampleEntries = exampleEntries.filter((item) => item.id !== entry.id)"
                                                />
                                            </div>
                                        </div>
                                        <Textarea
                                            :id="`example-${entry.id}`"
                                            v-model="entry.text"
                                            auto-resize
                                            :maxLength="1200"
                                            rows="10"
                                            class="mt-2"
                                            placeholder="Paste a representative LinkedIn post…"
                                            @input="entry.text = entry.text.slice(0, 1200)"
                                        />
                                    </article>
                                    <div class="flex justify-end">
                                        <PrimeButton
                                            label="Add another example"
                                            severity="secondary"
                                            outlined
                                            size="small"
                                            :disabled="exampleEntries.length >= 3"
                                            @click="
                                                exampleEntries = exampleEntries.length >= 3
                                                    ? exampleEntries
                                                    : [...exampleEntries, createEmptyExample()];
                                            "
                                        />
                                    </div>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </section>

            <section ref="schedulingRef" class="space-y-3">
                <h3 id="scheduling" class="text-lg font-medium text-zinc-900">Scheduling</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <template #title>Preferences</template>
                        <template #subtitle>
                            <span class="text-sm text-zinc-600">Timezone and lead-time defaults for auto scheduling.</span>
                        </template>
                        <template #content>
                            <div class="space-y-4">
                                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div class="md:col-span-2 flex flex-col gap-2">
                                        <label for="schedule-timezone" class="text-sm font-medium text-zinc-700">Timezone</label>
                                        <Dropdown
                                            id="schedule-timezone"
                                            v-model="timezone"
                                            :options="timezoneOptions"
                                            option-label="label"
                                            option-value="value"
                                            filter
                                            class="w-full"
                                            placeholder="Select timezone"
                                       />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="schedule-lead" class="text-sm font-medium text-zinc-700">Lead time (minutes)</label>
                                        <InputNumber
                                            id="schedule-lead"
                                            v-model="leadTimeMinutes"
                                            :min="0"
                                            :max="1440"
                                            :step="5"
                                            input-class="w-full"
                                        />
                                        <span class="text-xs text-zinc-500">Buffer before the earliest eligible timeslot.</span>
                                    </div>
                                </div>
                                <div class="flex justify-end">
                                    <PrimeButton
                                        :loading="updatingPreferences"
                                        label="Save Preferences"
                                        size="small"
                                        @click="savePreferences"
                                    />
                                </div>
                            </div>
                        </template>
                    </Card>

                    <Card>
                        <template #title>Preferred Timeslots</template>
                        <template #subtitle>
                            <span class="text-sm text-zinc-600">Add default days and times for auto-scheduling.</span>
                        </template>
                        <template #content>
                            <div class="space-y-4">
                                <div class="flex flex-wrap items-end gap-3">
                                    <div class="min-w-[160px] flex-1">
                                        <label class="text-sm font-medium text-zinc-700" for="slot-day">Day</label>
                                        <Dropdown
                                            id="slot-day"
                                            v-model="newSlotDay"
                                            :options="dayOptions"
                                            option-label="label"
                                            option-value="value"
                                            class="w-full"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-[140px]">
                                        <label class="text-sm font-medium text-zinc-700" for="slot-time">Time</label>
                                        <input
                                            id="slot-time"
                                            v-model="newSlotTime"
                                            type="time"
                                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                            required
                                        />
                                    </div>
                                    <PrimeButton
                                        label="Add slot"
                                        size="small"
                                        severity="secondary"
                                        outlined
                                        :loading="updatingSlots"
                                        @click="addSlot"
                                    />
                                </div>
                                <div class="space-y-2">
                                    <p v-if="preferredSlots.length === 0" class="text-sm text-zinc-600">No slots configured.</p>
                                    <ul v-else class="space-y-2">
                                        <li
                                            v-for="(slot, index) in preferredSlots"
                                            :key="`${slot.isoDayOfWeek}-${slot.time}`"
                                            class="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                                        >
                                            <div class="flex items-center gap-2 text-zinc-700">
                                                <span class="font-medium">{{ dayLabel(slot.isoDayOfWeek) }}</span>
                                                <span>{{ slot.time }}</span>
                                            </div>
                                            <PrimeButton
                                                label="Remove"
                                                severity="secondary"
                                                text
                                                size="small"
                                                :disabled="updatingSlots"
                                                @click="removeSlot(index)"
                                            />
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
            </section>

            <section ref="dangerRef" class="space-y-3">
                <h3 id="danger" class="text-lg font-medium text-zinc-900">Danger Zone</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <template #title>
                            <span class="text-red-700">Delete Account</span>
                        </template>
                        <template #subtitle>
                            <span class="text-sm text-zinc-600">Permanently deletes your account and all associated data. This action cannot be undone.</span>
                        </template>
                        <template #content>
                            <div class="flex items-center justify-end">
                                <PrimeButton
                                    severity="danger"
                                    size="small"
                                    label="Delete Account"
                                    @click="openDeleteModal"
                                />
                            </div>
                        </template>
                    </Card>
                </div>

                <Dialog v-model:visible="showDeleteModal" modal :closable="!deletingAccount" header="Delete Account" :style="{ width: '28rem' }">
                    <div class="space-y-3">
                        <p class="text-sm text-zinc-700">Enter your current password to confirm account deletion. This action cannot be undone.</p>
                        <div class="flex flex-col gap-2">
                            <label for="modal-current-password" class="text-sm font-medium text-zinc-700">Current password</label>
                            <InputText id="modal-current-password" v-model="currentPassword" type="password" autocomplete="current-password" />
                        </div>
                    </div>
                    <template #footer>
                        <div class="flex items-center justify-end gap-2">
                            <PrimeButton
                                label="Cancel"
                                size="small"
                                severity="secondary"
                                :disabled="deletingAccount"
                                @click="showDeleteModal = false"
                            />
                            <PrimeButton
                                label="Delete"
                                size="small"
                                severity="danger"
                                :disabled="!canConfirmDelete"
                                :loading="deletingAccount"
                                @click="deleteAccount"
                            />
                        </div>
                    </template>
                </Dialog>
            </section>

        </section>
    </AppLayout>
</template>
