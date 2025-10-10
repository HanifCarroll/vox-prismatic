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
import analytics from '@/lib/telemetry';

const props = defineProps({
    linkedIn: { type: Object, required: true },
    style: { type: Object, default: null },
    preferences: { type: Object, required: true },
    slots: { type: Array, default: () => [] },
    styleOptions: {
        type: Object,
        default: () => ({ tones: [], perspectives: [], personas: [] }),
    },
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
    analytics.capture('app.linkedin_connect_clicked');
    window.location.href = '/settings/linked-in/auth';
};

const disconnectLinkedIn = async () => {
    if (disconnectingLinkedIn.value) {
        return;
    }
    disconnectingLinkedIn.value = true;
    router.post('/settings/linked-in/disconnect', {}, {
        onFinish: () => { disconnectingLinkedIn.value = false; },
        onSuccess: () => { linkedInConnected.value = false; pushNotification('success', 'Disconnected from LinkedIn.'); analytics.capture('app.linkedin_disconnected'); },
        onError: () => { pushNotification('error', 'Failed to disconnect LinkedIn.'); },
    });
};

const toneOptions = computed(() => props.styleOptions?.tones ?? []);
const perspectiveOptions = computed(() => props.styleOptions?.perspectives ?? []);
const promotionGoalOptions = [
    { value: 'none', label: 'Keep posts educational (default)' },
    { value: 'traffic', label: 'Send readers to a resource' },
    { value: 'leads', label: 'Generate leads or demos' },
    { value: 'launch', label: 'Promote a new release' },
];

const chipVariantClasses = (selected) => (selected
    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 hover:text-white'
    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50');

const preferredStyle = reactive({
    offer: typeof props.style?.offer === 'string' ? props.style.offer : '',
    services: Array.isArray(props.style?.services) ? [...props.style.services] : [],
    idealCustomer: typeof props.style?.idealCustomer === 'string' ? props.style.idealCustomer : '',
    outcomes: Array.isArray(props.style?.outcomes) ? [...props.style.outcomes] : [],
    promotionGoal: props.style?.promotionGoal ?? 'none',
    tonePreset: props.style?.tonePreset ?? (toneOptions.value[0]?.value ?? 'confident'),
    toneNote: typeof props.style?.toneNote === 'string' ? props.style.toneNote : '',
    perspective: props.style?.perspective ?? (perspectiveOptions.value[0]?.value ?? 'first_person'),
});

const newService = ref('');
const newOutcome = ref('');
const serviceExamples = ['Coaching sprints', 'Done-for-you positioning'];
const outcomeExamples = ['Shorten ramp time by 30%', 'Increase reply rates'];

const addService = () => {
    const trimmed = newService.value.trim();
    if (trimmed === '') {
        newService.value = '';
        return;
    }
    if (preferredStyle.services.length >= 5) {
        newService.value = '';
        return;
    }
    if (preferredStyle.services.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        newService.value = '';
        return;
    }
    preferredStyle.services.push(trimmed);
    newService.value = '';
};

const addOutcome = () => {
    const trimmed = newOutcome.value.trim();
    if (trimmed === '') {
        newOutcome.value = '';
        return;
    }
    if (preferredStyle.outcomes.length >= 5) {
        newOutcome.value = '';
        return;
    }
    if (preferredStyle.outcomes.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        newOutcome.value = '';
        return;
    }
    preferredStyle.outcomes.push(trimmed);
    newOutcome.value = '';
};

const removeListItem = (listKey, index) => {
    const list = preferredStyle[listKey];
    if (!Array.isArray(list)) {
        return;
    }
    list.splice(index, 1);
};

const selectTonePreset = (value) => {
    preferredStyle.tonePreset = value;
};

const selectPerspective = (value) => {
    preferredStyle.perspective = value;
};

const savingStyle = ref(false);
const saveStyle = async () => {
    if (savingStyle.value) {
        return;
    }
    try {
        savingStyle.value = true;
        const payload = {
            offer: preferredStyle.offer,
            services: [...preferredStyle.services],
            idealCustomer: preferredStyle.idealCustomer,
            outcomes: [...preferredStyle.outcomes],
            promotionGoal: preferredStyle.promotionGoal || 'none',
            tonePreset: preferredStyle.tonePreset || 'confident',
            toneNote: preferredStyle.toneNote?.trim() ? preferredStyle.toneNote.trim() : undefined,
            perspective: preferredStyle.perspective || 'first_person',
        };
        router.put('/settings/style', { style: payload }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const nextStyle = page?.props?.style ?? null;
                preferredStyle.offer = typeof nextStyle?.offer === 'string' ? nextStyle.offer : preferredStyle.offer;
                preferredStyle.services = Array.isArray(nextStyle?.services) ? [...nextStyle.services] : preferredStyle.services;
                preferredStyle.idealCustomer = typeof nextStyle?.idealCustomer === 'string' ? nextStyle.idealCustomer : preferredStyle.idealCustomer;
                preferredStyle.outcomes = Array.isArray(nextStyle?.outcomes) ? [...nextStyle.outcomes] : preferredStyle.outcomes;
                preferredStyle.promotionGoal = nextStyle?.promotionGoal ?? preferredStyle.promotionGoal ?? 'none';
                preferredStyle.tonePreset = nextStyle?.tonePreset ?? preferredStyle.tonePreset ?? 'confident';
                preferredStyle.toneNote = typeof nextStyle?.toneNote === 'string' ? nextStyle.toneNote : '';
                preferredStyle.perspective = nextStyle?.perspective ?? preferredStyle.perspective ?? 'first_person';
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
    try {
        const flash = (window?.__inertia ?? {}).page?.props?.flash ?? {};
        const rawStatus = typeof flash.status === 'string' ? flash.status : '';
        const rawError = typeof flash.error === 'string' ? flash.error : '';
        const status = rawStatus.toLowerCase();
        const error = rawError.toLowerCase();
        if (status.includes('connected to linkedin')) {
            pushNotification('success', rawStatus || 'Connected to LinkedIn.');
            analytics.capture('app.linkedin_connected');
            linkedInConnected.value = true;
        } else if (error.includes('linkedin connection failed')) {
            pushNotification('error', rawError || 'LinkedIn connection failed.');
            analytics.capture('app.linkedin_connect_failed');
        }
    } catch {}
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
                            <div class="space-y-3">
                                <div class="flex flex-col gap-1.5">
                                    <label for="style-offer" class="text-xs font-medium text-zinc-600">What do you offer?</label>
                                    <input
                                        id="style-offer"
                                        v-model="preferredStyle.offer"
                                        placeholder="E.g. “Sales coaching for B2B founders”"
                                        class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        autocomplete="off"
                                    />
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="style-ideal-customer" class="text-xs font-medium text-zinc-600">Ideal customer</label>
                                    <textarea
                                        id="style-ideal-customer"
                                        v-model="preferredStyle.idealCustomer"
                                        rows="2"
                                        placeholder="E.g. “Seed-stage B2B SaaS founders in US/EU; <10 employees; founder-led.”"
                                        class="rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                        autocomplete="off"
                                    ></textarea>
                                    <p class="text-xs text-zinc-500">Describe your ideal customer. Add 1–3 specifics like stage, size, or region.</p>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div class="flex flex-col gap-2">
                                    <span class="text-xs font-medium text-zinc-600">Key services or offers (max 5)</span>
                                    <div class="flex gap-2">
                                        <input
                                            v-model="newService"
                                            class="flex-1 rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                            :placeholder="preferredStyle.services.length >= 5 ? 'Max reached' : 'E.g. Coaching sprints'"
                                            :disabled="preferredStyle.services.length >= 5"
                                            @keydown.enter.prevent="addService()" />
                                        <Button type="button" size="sm" variant="outline" :disabled="preferredStyle.services.length >= 5" @click="addService()">Add</Button>
                                    </div>
                                    <div class="flex flex-wrap gap-2 pt-2">
                                        <span
                                            v-for="(item, idx) in preferredStyle.services"
                                            :key="`service-${idx}`"
                                            class="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700"
                                        >
                                            {{ item }}
                                            <button type="button" class="text-zinc-500 hover:text-zinc-700" @click="removeListItem('services', idx)" aria-label="Remove service">&times;</button>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <span class="text-xs font-medium text-zinc-600">Outcomes you deliver (max 5)</span>
                                    <div class="flex gap-2">
                                        <input
                                            v-model="newOutcome"
                                            class="flex-1 rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                            :placeholder="preferredStyle.outcomes.length >= 5 ? 'Max reached' : 'E.g. Shorten ramp time by 30%'"
                                            :disabled="preferredStyle.outcomes.length >= 5"
                                            @keydown.enter.prevent="addOutcome()" />
                                        <Button type="button" size="sm" variant="outline" :disabled="preferredStyle.outcomes.length >= 5" @click="addOutcome()">Add</Button>
                                    </div>
                                    <div class="flex flex-wrap gap-2 pt-2">
                                        <span
                                            v-for="(item, idx) in preferredStyle.outcomes"
                                            :key="`outcome-${idx}`"
                                            class="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700"
                                        >
                                            {{ item }}
                                            <button type="button" class="text-zinc-500 hover:text-zinc-700" @click="removeListItem('outcomes', idx)" aria-label="Remove outcome">&times;</button>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col gap-2">
                                <label for="style-promotion-goal" class="text-xs font-medium text-zinc-600">When you promote, what outcome matters most?</label>
                                <select
                                    id="style-promotion-goal"
                                    v-model="preferredStyle.promotionGoal"
                                    class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                                >
                                    <option v-for="goal in promotionGoalOptions" :key="goal.value" :value="goal.value">
                                        {{ goal.label }}
                                    </option>
                                </select>
                                <p class="text-xs text-zinc-500">We’ll keep roughly 80% of posts educational and use this goal for the rest.</p>
                            </div>

                            <details class="rounded-md border border-zinc-200 bg-zinc-50/80 p-4">
                                <summary class="cursor-pointer text-sm font-medium text-zinc-700">Advanced voice controls</summary>
                                <div class="mt-4 space-y-5">
                                    <div class="space-y-3">
                                        <p class="text-xs text-zinc-500">Pick the tone that feels most like you. Add a note if there’s a nuance we should remember.</p>
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
                                    </div>

                                    <div class="space-y-3">
                                        <p class="text-xs text-zinc-500">Choose how we should reference you in the post.</p>
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
                                    </div>

                                </div>
                            </details>

                            <div class="flex justify-end">
                                <Button size="sm" :disabled="savingStyle" type="button" @click="saveStyle">
                                    <span v-if="savingStyle" class="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent"></span>
                                    Save writing style
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
