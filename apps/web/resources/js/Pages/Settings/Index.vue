<script setup>
import AppLayout from '@/Layouts/AppLayout.vue';
import { Head, router } from '@inertiajs/vue3';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useNotifications } from '@/utils/notifications';
import { normalizeSlot, sortSlots } from '@/utils/scheduling';
import { timezoneZones } from '@/constants/timezones';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LinkedInIntegrationCard from './components/LinkedInIntegrationCard.vue';
import DangerZoneDelete from './components/DangerZoneDelete.vue';

const props = defineProps({
    linkedIn: { type: Object, required: true },
    style: { type: Object, default: null },
    preferences: { type: Object, required: true },
    slots: { type: Array, default: () => [] },
    // When omitted, do not auto-scroll to any section
    initialTab: { type: String, default: null },
});

const { push: pushNotification } = useNotifications();

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

// scheduling utils imported

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

// timezoneZones imported from constants

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
const preferredSlots = ref(Array.isArray(props.slots) ? sortSlots(props.slots) : []);

watch(
    () => props.slots,
    (slots) => {
        if (Array.isArray(slots)) {
            preferredSlots.value = sortSlots(slots);
        }
    },
    { deep: true },
);

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
    const orderedItems = sortSlots(items);
    try {
        updatingSlots.value = true;
        router.put('/settings/scheduling/slots', { items: orderedItems }, {
            onSuccess: () => {
                preferredSlots.value = orderedItems.map((item) => ({ ...item }));
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
    const slotToAdd = normalizeSlot({ isoDayOfWeek: newSlotDay.value, time: newSlotTime.value, active: true });
    const existing = preferredSlots.value.some(
        (slot) => slot.isoDayOfWeek === slotToAdd.isoDayOfWeek && slot.time === slotToAdd.time,
    );
    if (existing) {
        pushNotification('error', 'This timeslot already exists.');
        return;
    }
    newSlotTime.value = slotToAdd.time;
    const next = [
        ...preferredSlots.value,
        slotToAdd,
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
// Confirm state computed inside DangerZoneDelete component

// Autofocus password input when delete modal opens
watch(
    () => showDeleteModal.value,
    (open) => {
        if (open) {
            nextTick(() => {
                const el = document.getElementById('modal-current-password');
                if (el) el.focus();
            });
        }
    },
);

const openDeleteModal = () => {
    currentPassword.value = '';
    showDeleteModal.value = true;
};

const deleteAccount = async () => {
    if (!(currentPassword.value.length > 0 && !deletingAccount.value)) {
        return;
    }
    try {
        deletingAccount.value = true;
        await router.delete('/settings/account', {
            data: { currentPassword: currentPassword.value, confirm: 'DELETE' },
            preserveScroll: true,
            onSuccess: () => {
                // Session is invalidated server-side; navigate to login
                pushNotification('success', 'Your account was deleted. Redirecting…');
                showDeleteModal.value = false;
                setTimeout(() => { router.visit('/login', { replace: true }); }, 600);
            },
            onError: () => pushNotification('error', 'Failed to delete account.'),
        });
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

            <section ref="integrationsRef" class="space-y-3">
                <h3 id="integrations" class="text-lg font-medium text-zinc-900">Integrations</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <LinkedInIntegrationCard
                        :connected="linkedInConnected"
                        :disconnecting="disconnectingLinkedIn"
                        @connect="connectLinkedIn"
                        @disconnect="disconnectLinkedIn"
                    />
                </div>
            </section>

            <section ref="styleRef" class="space-y-3">
                <h3 id="writing-style" class="text-lg font-medium text-zinc-900">Writing Style</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Style Profile</CardTitle>
                            <CardDescription>Set your default voice, audience, and constraints.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4" @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !savingStyle) { e.preventDefault(); saveStyle(); } }">
                                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div class="flex flex-col gap-2">
                                        <label for="style-tone" class="text-sm font-medium text-zinc-700">Tone</label>
                                        <input id="style-tone" v-model="preferredStyle.tone" placeholder="Confident, friendly…" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-audience" class="text-sm font-medium text-zinc-700">Audience</label>
                                        <input id="style-audience" v-model="preferredStyle.audience" placeholder="Founders, product leaders…" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-goals" class="text-sm font-medium text-zinc-700">Goals</label>
                                        <input id="style-goals" v-model="preferredStyle.goals" placeholder="Share insights, drive signups…" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-emoji" class="text-sm font-medium text-zinc-700">Emoji policy</label>
                                        <select id="style-emoji" v-model="preferredStyle.emojiPolicy" class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
                                          <option v-for="opt in emojiOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-post-type" class="text-sm font-medium text-zinc-700">Default post type</label>
                                        <select id="style-post-type" v-model="preferredStyle.defaultPostType" class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
                                          <option v-for="opt in postTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="style-hashtags" class="text-sm font-medium text-zinc-700">Hashtag policy</label>
                                        <input id="style-hashtags" v-model="preferredStyle.hashtagPolicy" placeholder="3 relevant hashtags at the end…" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
                                    </div>
                                    <div class="sm:col-span-2 flex flex-col gap-2">
                                        <label for="style-constraints" class="text-sm font-medium text-zinc-700">Constraints</label>
                                        <textarea id="style-constraints" v-model="preferredStyle.constraints" rows="3" placeholder="Avoid jargon, keep paragraphs short…" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
                                    </div>
                                    <div class="sm:col-span-2 flex flex-col gap-2">
                                        <label for="style-glossary" class="text-sm font-medium text-zinc-700">Glossary</label>
                                        <textarea id="style-glossary" v-model="preferredStyle.glossary" rows="3" placeholder="Preferred product names, acronyms, phrases…" class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" />
                                    </div>
                                </div>
                                <div class="flex justify-end">
                                    <Button size="sm" :disabled="savingStyle" @click="saveStyle">
                                        <span v-if="savingStyle" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                                        Save Writing Style
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Few-shot Examples</CardTitle>
                            <CardDescription>Add up to 3 sample posts to guide tone and structure.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4" @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !updatingPreferences) { e.preventDefault(); savePreferences(); } }">
                                <div
                                    v-if="exampleEntries.length === 0"
                                    class="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600"
                                >
                                    <p>No examples added yet.</p>
                                    <p class="mt-2 text-xs text-zinc-500">Paste a representative LinkedIn post (2–5 short paragraphs; hashtags at the end).</p>
                                    <Button class="mt-4" size="sm" @click="exampleEntries = [createEmptyExample()]"><span>Add your first example</span></Button>
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
                                                <Button variant="ghost" size="sm" @click="exampleEntries = exampleEntries.filter((item) => item.id !== entry.id)">Remove</Button>
                                            </div>
                                        </div>
                                        <textarea
                                            :id="`example-${entry.id}`"
                                            v-model="entry.text"
                                            :maxLength="1200"
                                            rows="10"
                                            class="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                            placeholder="Paste a representative LinkedIn post…"
                                            @input="entry.text = entry.text.slice(0, 1200)"
                                            @keydown.enter.prevent="addSlot"
                                        />
                                    </article>
                                    <div class="flex justify-end">
                                        <Button variant="outline" size="sm" :disabled="exampleEntries.length >= 3" @click="exampleEntries = exampleEntries.length >= 3 ? exampleEntries : [...exampleEntries, createEmptyExample()];">Add another example</Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section ref="schedulingRef" class="space-y-3">
                <h3 id="scheduling" class="text-lg font-medium text-zinc-900">Scheduling</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferences</CardTitle>
                            <CardDescription>Timezone and lead-time defaults for auto scheduling.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div class="md:col-span-2 flex flex-col gap-2">
                                        <label for="schedule-timezone" class="text-sm font-medium text-zinc-700">Timezone</label>
                                        <select
                                            id="schedule-timezone"
                                            v-model="timezone"
                                            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        >
                                          <option v-for="opt in timezoneOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                        </select>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label for="schedule-lead" class="text-sm font-medium text-zinc-700">Lead time (minutes)</label>
                                        <input
                                            id="schedule-lead"
                                            v-model.number="leadTimeMinutes"
                                            type="number"
                                            min="0"
                                            max="1440"
                                            step="5"
                                            class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        />
                                        <span class="text-xs text-zinc-500">Buffer before the earliest eligible timeslot.</span>
                                    </div>
                                </div>
                                <div class="flex justify-end">
                                    <Button size="sm" :disabled="updatingPreferences" @click="savePreferences">
                                        <span v-if="updatingPreferences" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                                        Save Preferences
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preferred Timeslots</CardTitle>
                            <CardDescription>Add default days and times for auto-scheduling.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="flex flex-wrap items-end gap-3">
                                    <div class="min-w-[160px] flex-1">
                                        <label class="text-sm font-medium text-zinc-700" for="slot-day">Day</label>
                                        <select
                                            id="slot-day"
                                            v-model.number="newSlotDay"
                                            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        >
                                          <option v-for="opt in dayOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                                        </select>
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
                                    <Button variant="outline" size="sm" :disabled="updatingSlots" @click="addSlot">
                                      <span v-if="updatingSlots" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                                      Add slot
                                    </Button>
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
                                            <Button variant="ghost" size="sm" :disabled="updatingSlots" @click="removeSlot(index)">Remove</Button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section ref="dangerRef" class="space-y-3">
                <h3 id="danger" class="text-lg font-medium text-zinc-900">Danger Zone</h3>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <DangerZoneDelete
                        :show="showDeleteModal"
                        :deleting="deletingAccount"
                        :password="currentPassword"
                        @open="openDeleteModal"
                        @close="() => { showDeleteModal = false; }"
                        @delete="deleteAccount"
                        @update:password="(val) => { currentPassword = val; }"
                    />
                </div>
            </section>

        </section>
    </AppLayout>
</template>
