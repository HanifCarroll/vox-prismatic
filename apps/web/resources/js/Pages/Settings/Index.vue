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

const getCsrfToken = () => {
    try {
        const el = document.head?.querySelector('meta[name="csrf-token"]');
        return el?.getAttribute('content') || null;
    } catch {
        return null;
    }
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

const toneOptions = [
    { label: 'Confident', value: 'confident', hint: 'Assert a clear point of view.' },
    { label: 'Friendly expert', value: 'friendly_expert', hint: 'Warm, approachable, and helpful.' },
    { label: 'Builder', value: 'builder', hint: 'Hands-on lessons from shipping in public.' },
    { label: 'Challenger', value: 'challenger', hint: 'Provocative and debate-sparking.' },
    { label: 'Inspiring', value: 'inspiring', hint: 'Motivational and optimistic.' },
];

const perspectiveOptions = [
    { label: 'I / me', value: 'first_person', description: 'Write as a single voice using "I" and "me".' },
    { label: 'We / our', value: 'first_person_plural', description: 'Speak as a team or company using "we".' },
    { label: 'Third-person', value: 'third_person', description: 'Refer to yourself or the team by name.' },
];

const personaOptions = [
    { label: 'Founders', value: 'founders' },
    { label: 'Product leads', value: 'product_leaders' },
    { label: 'Revenue leaders', value: 'revenue_leaders' },
    { label: 'Marketing leaders', value: 'marketing_leaders' },
    { label: 'Operators', value: 'operators' },
];

const ctaOptions = [
    { label: 'Start conversations', value: 'conversation', description: 'Invite comments and open questions.' },
    { label: 'Drive site traffic', value: 'traffic', description: 'Nudge readers to click a supporting link.' },
    { label: 'Promote a product', value: 'product', description: 'Highlight your product or service value.' },
    { label: 'Grow signups', value: 'signup', description: 'Encourage demos, trials, or lead capture.' },
];

const chipVariantClasses = (selected) => (selected
    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 hover:text-white'
    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50');

const preferredStyle = reactive({
    tonePreset: props.style?.tonePreset ?? 'confident',
    toneNote: typeof props.style?.toneNote === 'string' ? props.style.toneNote : '',
    perspective: props.style?.perspective ?? 'first_person',
    personaPreset: props.style?.personaPreset ?? '',
    personaCustom: typeof props.style?.personaCustom === 'string' ? props.style.personaCustom : '',
    ctaType: props.style?.ctaType ?? 'conversation',
    ctaCopy: typeof props.style?.ctaCopy === 'string' ? props.style.ctaCopy : '',
});

const selectTonePreset = (value) => {
    preferredStyle.tonePreset = value;
};

const selectPerspective = (value) => {
    preferredStyle.perspective = value;
};

const togglePersonaPreset = (value) => {
    preferredStyle.personaPreset = preferredStyle.personaPreset === value ? '' : value;
};

const selectCtaType = (value) => {
    preferredStyle.ctaType = value;
};

const savingStyle = ref(false);
const saveStyle = async () => {
    if (savingStyle.value) {
        return;
    }
    try {
        savingStyle.value = true;
        const payload = {
            tonePreset: preferredStyle.tonePreset || 'confident',
            toneNote: preferredStyle.toneNote?.trim() ? preferredStyle.toneNote.trim() : undefined,
            perspective: preferredStyle.perspective || 'first_person',
            personaPreset: preferredStyle.personaPreset || undefined,
            personaCustom: preferredStyle.personaCustom?.trim() ? preferredStyle.personaCustom.trim() : undefined,
            ctaType: preferredStyle.ctaType || 'conversation',
            ctaCopy: preferredStyle.ctaCopy?.trim() ? preferredStyle.ctaCopy.trim() : undefined,
        };
        router.put('/settings/style', { style: payload }, {
            onSuccess: (page) => {
                const nextStyle = page?.props?.style ?? null;
                preferredStyle.tonePreset = nextStyle?.tonePreset ?? preferredStyle.tonePreset ?? 'confident';
                preferredStyle.toneNote = typeof nextStyle?.toneNote === 'string' ? nextStyle.toneNote : '';
                preferredStyle.perspective = nextStyle?.perspective ?? preferredStyle.perspective ?? 'first_person';
                preferredStyle.personaPreset = nextStyle?.personaPreset ?? '';
                preferredStyle.personaCustom = typeof nextStyle?.personaCustom === 'string' ? nextStyle.personaCustom : '';
                preferredStyle.ctaType = nextStyle?.ctaType ?? preferredStyle.ctaType ?? 'conversation';
                preferredStyle.ctaCopy = typeof nextStyle?.ctaCopy === 'string' ? nextStyle.ctaCopy : '';
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
            headers: { 'X-CSRF-TOKEN': getCsrfToken() ?? '' },
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
                <Card>
                    <CardHeader>
                        <CardTitle>Voice Defaults</CardTitle>
                        <CardDescription>We apply these choices to every LinkedIn draft.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-6" @keydown="(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !savingStyle) { e.preventDefault(); saveStyle(); } }">
                            <fieldset class="space-y-3">
                                <legend class="text-sm font-medium text-zinc-700">Tone</legend>
                                <p class="text-xs text-zinc-500">Pick the voice that feels most like you. Add a note if there’s a nuance we should remember.</p>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        v-for="option in toneOptions"
                                        :key="option.value"
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        :class="['h-auto min-h-[56px] min-w-[200px] flex-col items-start gap-1 px-4 py-3 text-left transition-colors whitespace-normal', chipVariantClasses(preferredStyle.tonePreset === option.value)]"
                                        @click="selectTonePreset(option.value)"
                                    >
                                        <span class="text-sm font-medium">{{ option.label }}</span>
                                        <span class="hidden text-xs text-zinc-500 sm:inline">{{ option.hint }}</span>
                                    </Button>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="style-tone-note" class="text-xs font-medium text-zinc-600">Optional note</label>
                                    <input
                                        id="style-tone-note"
                                        v-model="preferredStyle.toneNote"
                                        placeholder="Add a quick reminder, e.g. “Keep it playful but grounded.”"
                                        class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        autocomplete="off"
                                    />
                                </div>
                            </fieldset>

                            <fieldset class="space-y-3">
                                <legend class="text-sm font-medium text-zinc-700">Perspective</legend>
                                <p class="text-xs text-zinc-500">Choose how we should talk about you by default.</p>
                                <div class="grid grid-cols-1 gap-2 lg:grid-cols-3">
                                    <Button
                                        v-for="option in perspectiveOptions"
                                        :key="option.value"
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        :class="['h-auto min-h-[56px] w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors whitespace-normal', chipVariantClasses(preferredStyle.perspective === option.value)]"
                                        @click="selectPerspective(option.value)"
                                    >
                                        <span class="text-sm font-medium">{{ option.label }}</span>
                                        <span class="text-xs text-zinc-500">{{ option.description }}</span>
                                    </Button>
                                </div>
                            </fieldset>

                            <fieldset class="space-y-3">
                                <legend class="text-sm font-medium text-zinc-700">Audience persona</legend>
                                <p class="text-xs text-zinc-500">Select who we’re writing to most often, then add specifics if needed.</p>
                                <div class="flex flex-wrap gap-2">
                                    <Button
                                        v-for="option in personaOptions"
                                        :key="option.value"
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        :class="['px-4 py-2.5 text-sm transition-colors whitespace-normal', chipVariantClasses(preferredStyle.personaPreset === option.value)]"
                                        @click="togglePersonaPreset(option.value)"
                                    >
                                        {{ option.label }}
                                    </Button>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="style-persona-custom" class="text-xs font-medium text-zinc-600">Optional persona note</label>
                                    <input
                                        id="style-persona-custom"
                                        v-model="preferredStyle.personaCustom"
                                        placeholder="E.g. “Seed-stage SaaS founders juggling GTM”"
                                        class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        autocomplete="off"
                                    />
                                </div>
                            </fieldset>

                            <fieldset class="space-y-3">
                                <legend class="text-sm font-medium text-zinc-700">Primary outcome</legend>
                                <p class="text-xs text-zinc-500">Tell us what success looks like so we can frame the CTA accordingly.</p>
                                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <Button
                                        v-for="option in ctaOptions"
                                        :key="option.value"
                                        variant="outline"
                                        size="sm"
                                        type="button"
                                        :class="['h-auto min-h-[56px] min-w-[200px] flex-col items-start gap-1 px-4 py-3 text-left transition-colors whitespace-normal', chipVariantClasses(preferredStyle.ctaType === option.value)]"
                                        @click="selectCtaType(option.value)"
                                    >
                                        <span class="text-sm font-medium">{{ option.label }}</span>
                                        <span class="text-xs text-zinc-500">{{ option.description }}</span>
                                    </Button>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="style-cta-copy" class="text-xs font-medium text-zinc-600">Optional CTA copy</label>
                                    <input
                                        id="style-cta-copy"
                                        v-model="preferredStyle.ctaCopy"
                                        placeholder="E.g. “Book a demo to see it live.”"
                                        class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        autocomplete="off"
                                    />
                                </div>
                            </fieldset>

                            <div class="flex justify-end">
                                <Button size="sm" :disabled="savingStyle" type="button" @click="saveStyle">
                                    <span v-if="savingStyle" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                                    Save voice defaults
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
