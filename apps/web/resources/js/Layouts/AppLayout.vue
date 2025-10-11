<script setup>
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { FolderKanban, Calendar, BarChart3, Settings, ShieldCheck, LogOut, Menu, X } from 'lucide-vue-next';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion-v';
import analytics from '@/lib/telemetry';
import 'vue-sonner/style.css'

const props = defineProps({
    title: { type: String, default: null },
    // Header is removed; keep prop for compatibility but unused now
    showNewProject: { type: Boolean, default: false },
    settingsTab: { type: String, default: null },
});

const page = usePage();

const user = computed(() => page.props.auth?.user ?? null);
const flash = computed(() => page.props.flash ?? {});
const currentPath = computed(() => page.url ?? '/');

const navItems = computed(() => {
    const items = [
        { label: 'Projects', href: '/projects', icon: 'projects', pattern: /^\/projects(\/|$|\?)/ },
        { label: 'Calendar', href: '/calendar', icon: 'calendar', pattern: /^\/calendar/ },
        { label: 'Analytics', href: '/analytics', icon: 'analytics', pattern: /^\/analytics/ },
        { label: 'Settings', href: '/settings', icon: 'settings', pattern: /^\/settings/ },
    ];

    if (user.value?.is_admin) {
        items.push({ label: 'Admin', href: '/admin', icon: 'shield', pattern: /^\/admin/ });
    }

    return items.map((item) => ({
        ...item,
        active: item.pattern.test(currentPath.value),
    }));
});

// Map logical icon keys to Lucide components
const iconMap = {
    projects: FolderKanban,
    calendar: Calendar,
    analytics: BarChart3,
    settings: Settings,
    shield: ShieldCheck,
};

const parseSettingsTabFromUrl = () => {
    if (typeof window === 'undefined') {
        const [, query = ''] = (page.url ?? '').split('?');
        const params = new URLSearchParams(query);
        return params.get('section') ?? params.get('tab');
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('section') ?? params.get('tab');
};

const settingsTabState = ref(props.settingsTab ?? parseSettingsTabFromUrl());

watch(
    () => props.settingsTab,
    (next) => {
        if (typeof next === 'string' && next.length > 0) {
            settingsTabState.value = next;
        }
    },
);

const derivedSettingsTab = computed(() => settingsTabState.value ?? parseSettingsTabFromUrl());

const logoutProcessing = ref(false);
const logout = () => {
    if (logoutProcessing.value) {
        return;
    }

    mobileNavOpen.value = false;
    logoutProcessing.value = true;
    router.post(
        '/logout',
        {},
        {
            onFinish: () => {
                logoutProcessing.value = false;
            },
        },
    );
};

const statusMessage = computed(() => flash.value?.status ?? null);
const errorMessage = computed(() => flash.value?.error ?? null);

const settingsSections = [
    { label: 'Integrations', tab: 'integrations' },
    { label: 'Writing Style', tab: 'style' },
    { label: 'Scheduling', tab: 'scheduling' },
    { label: 'Account', tab: 'account' },
];

const userInitial = computed(() => {
    const source = (user.value?.name ?? user.value?.email ?? '').trim();
    return source ? source.charAt(0).toUpperCase() : 'U';
});

const mobileNavOpen = ref(false);
const mobileNavId = 'mobile-primary-navigation';

const tabletTooltip = ref(null);
const handleSettingsPopstate = () => {
    settingsTabState.value = parseSettingsTabFromUrl();
};
let removeInertiaFinishListener = null;

onMounted(() => {
    if (!settingsTabState.value) {
        settingsTabState.value = parseSettingsTabFromUrl();
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', handleSettingsPopstate);
    }
    if (typeof router.on === 'function') {
        removeInertiaFinishListener = router.on('finish', () => {
            settingsTabState.value = props.settingsTab ?? parseSettingsTabFromUrl();
        });
    }
});

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handleSettingsPopstate);
    }
    if (typeof removeInertiaFinishListener === 'function') {
        removeInertiaFinishListener();
    }
});

watch(currentPath, () => {
    mobileNavOpen.value = false;
    tabletTooltip.value = null;
});

// Identify user (once per session) when available
watch(user, (u) => {
    if (u && u.id) {
        analytics.identify(String(u.id), { email_present: Boolean(u.email) });
    }
}, { immediate: true });

const heartbeatIntervalMs = 5 * 60 * 1000;
let heartbeatTimer = null;

const sendHeartbeat = () => {
    if (typeof window === 'undefined' || !user.value) {
        return;
    }

    fetch('/session/heartbeat', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
    }).catch(() => {
        // Swallow network errors; we'll try again on the next interval.
    });
};

const stopHeartbeat = () => {
    if (heartbeatTimer !== null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
};

const startHeartbeat = () => {
    if (!user.value || typeof window === 'undefined') {
        return;
    }

    stopHeartbeat();
    sendHeartbeat();
    heartbeatTimer = window.setInterval(sendHeartbeat, heartbeatIntervalMs);
};

const handleVisibilityChange = () => {
    if (typeof document === 'undefined') {
        return;
    }

    if (document.hidden || !user.value) {
        stopHeartbeat();
    } else {
        startHeartbeat();
    }
};

watch(user, () => {
    if (typeof document === 'undefined') {
        return;
    }

    if (user.value) {
        handleVisibilityChange();
    } else {
        stopHeartbeat();
    }
});

onMounted(() => {
    if (typeof document === 'undefined') {
        return;
    }

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    handleVisibilityChange();
});

onBeforeUnmount(() => {
    if (typeof document === 'undefined') {
        return;
    }

    stopHeartbeat();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
});

function toggleMobileNav() {
    mobileNavOpen.value = !mobileNavOpen.value;
}

function handleNavClick(event) {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) {
        return;
    }

    mobileNavOpen.value = false;
}

function navigateSettings(event, tab) {
    // Allow new tab/window behavior
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) {
        return; // let the browser handle it
    }

    // Only intercept while already on Settings; otherwise do a normal Inertia visit
    const onSettings = currentPath.value.startsWith('/settings');
    if (!onSettings) {
        return; // let <a> navigate normally
    }

    event.preventDefault();
    mobileNavOpen.value = false;

    const map = { integrations: 'integrations', style: 'writing-style', scheduling: 'scheduling', account: 'account' };
    const id = map[tab] ?? tab;

    try {
        const url = new URL(window.location.href);
        url.searchParams.set('section', tab);
        window.history.pushState({}, '', url.toString());
    } catch {}
    settingsTabState.value = tab;

    const el = document.getElementById(id);
    if (el) {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
}

const showTabletTooltip = (key) => {
    tabletTooltip.value = key;
};
const hideTabletTooltip = (key) => {
    if (tabletTooltip.value === key) {
        tabletTooltip.value = null;
    }
};
</script>

<template>
    <div class="h-screen bg-zinc-50 overflow-hidden">
        <Toaster class="pointer-events-auto" />
        <a
            href="#page-content"
            class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow"
        >
            Skip to content
        </a>
        <div class="flex h-full">
            <aside
                class="hidden h-full border-r border-zinc-200 bg-white md:flex md:w-20 md:flex-col lg:w-64"
                aria-label="Primary"
            >
                <div class="flex items-center justify-center px-3 py-4 lg:justify-start lg:gap-3 lg:px-5">
                    <Link
                        href="/projects"
                        class="flex items-center gap-2 text-zinc-900"
                        aria-label="Go to projects"
                    >
                        <span
                            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white"
                        >
                            VP
                        </span>
                        <span class="hidden text-base font-semibold lg:inline">Vox Prismatic</span>
                    </Link>
                </div>
                <!-- Removed sidebar New project button per UX update -->
                <nav class="mt-6 flex-1 space-y-1 px-2 lg:px-3" aria-label="Main">
                    <div v-for="item in navItems" :key="item.label">
                        <Link
                            :href="item.href"
                            class="group relative flex items-center rounded-md text-sm font-medium transition md:flex-col md:items-center md:justify-center md:gap-1 md:px-2 md:py-3 lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:py-2"
                            :class="item.active
                                ? 'bg-zinc-900 text-white shadow-sm'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'"
                            :aria-label="item.label"
                            :aria-current="item.active ? 'page' : undefined"
                            @mouseenter="showTabletTooltip(item.label)"
                            @mouseleave="hideTabletTooltip(item.label)"
                            @focus="showTabletTooltip(item.label)"
                            @blur="hideTabletTooltip(item.label)"
                        >
                            <component
                                :is="iconMap[item.icon]"
                                class="h-5 w-5 lg:h-4 lg:w-4"
                                aria-hidden="true"
                            />
                            <span class="hidden lg:inline">{{ item.label }}</span>
                            <span
                                v-if="tabletTooltip === item.label"
                                class="pointer-events-none absolute left-full top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white shadow-md md:ml-3 md:flex lg:hidden"
                                role="tooltip"
                            >
                                {{ item.label }}
                            </span>
                        </Link>

                        <div
                            v-if="item.icon === 'settings' && item.active"
                            class="hidden pl-7 pr-4 text-xs lg:block"
                            aria-label="Settings sections"
                        >
                            <ul class="mt-2 space-y-1 border-l border-zinc-200 pl-3">
                                <li v-for="section in settingsSections" :key="section.tab">
                                    <a
                                        :href="`/settings?section=${section.tab}`"
                                        class="block rounded px-2 py-1 text-sm transition"
                                        :class="derivedSettingsTab === section.tab
                                            ? 'bg-zinc-900 text-white shadow-sm'
                                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'"
                                        :aria-current="derivedSettingsTab === section.tab ? 'page' : undefined"
                                        @click="navigateSettings($event, section.tab)"
                                    >
                                        {{ section.label }}
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
                <div class="border-t border-zinc-200 px-3 py-4 lg:px-5" v-if="user">
                    <div class="hidden text-sm lg:block">
                        <div class="font-semibold text-zinc-900">{{ user.name ?? 'Account' }}</div>
                        <div class="text-xs text-zinc-500" :title="user.email">{{ user.email }}</div>
                    </div>
                    <div class="flex flex-col items-center gap-2 lg:hidden">
                        <span
                            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white"
                            :title="user.name ?? user.email ?? 'Account'"
                            aria-hidden="true"
                        >
                            {{ userInitial }}
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        class="mt-3 inline-flex items-center justify-center gap-2 rounded-full lg:w-full lg:justify-center lg:rounded-md lg:px-4"
                        :disabled="logoutProcessing"
                        :aria-label="logoutProcessing ? 'Signing out' : 'Sign out'"
                        @click="logout"
                    >
                        <LogOut class="h-4 w-4" aria-hidden="true" />
                        <span class="hidden lg:inline">{{ logoutProcessing ? 'Signing out…' : 'Sign out' }}</span>
                    </Button>
                </div>
            </aside>
            <div class="flex h-full w-full flex-col overflow-hidden">
                <header class="relative border-b border-zinc-200 bg-white px-4 py-3 shadow-sm md:hidden">
                    <div class="flex items-center justify-between">
                        <Link href="/projects" class="flex items-center gap-2 text-zinc-900">
                            <span
                                class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white"
                            >
                                VP
                            </span>
                            <span class="text-base font-semibold">Vox Prismatic</span>
                        </Link>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            :aria-expanded="mobileNavOpen"
                            :aria-controls="mobileNavId"
                            :aria-label="mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'"
                            @click="toggleMobileNav"
                        >
                            <Menu v-if="!mobileNavOpen" class="h-5 w-5" aria-hidden="true" />
                            <X v-else class="h-5 w-5" aria-hidden="true" />
                        </Button>
                    </div>
                    <AnimatePresence>
                        <motion.div
                            v-if="mobileNavOpen"
                            key="mobile-nav"
                            :id="mobileNavId"
                            class="absolute left-0 right-0 top-full z-40 border-b border-zinc-200 bg-white px-4 pb-5 pt-4 shadow-sm"
                            :initial="{ opacity: 0, y: -16 }"
                            :animate="{ opacity: 1, y: 0 }"
                            :exit="{ opacity: 0, y: -16 }"
                            :transition="{ duration: 0.18, ease: 'easeOut' }"
                        >
                            <nav class="space-y-1" aria-label="Primary navigation">
                                <Link
                                    v-for="item in navItems"
                                    :key="item.label"
                                    :href="item.href"
                                    class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition"
                                    :class="item.active
                                        ? 'bg-zinc-100 text-zinc-900'
                                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'"
                                    :aria-current="item.active ? 'page' : undefined"
                                    @click="handleNavClick"
                                >
                                    <component :is="iconMap[item.icon]" class="h-5 w-5 shrink-0" aria-hidden="true" />
                                    <span class="truncate">{{ item.label }}</span>
                                </Link>
                            </nav>
                            <div
                                v-if="navItems.some((nav) => nav.icon === 'settings' && nav.active)"
                                class="space-y-1 border-t border-zinc-200 pt-3"
                                aria-label="Settings sections"
                            >
                                <div class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Settings</div>
                                <a
                                    v-for="section in settingsSections"
                                    :key="section.tab"
                                    :href="`/settings?section=${section.tab}`"
                                    class="block rounded px-3 py-2 text-sm transition"
                                    :class="derivedSettingsTab === section.tab
                                        ? 'bg-zinc-900 text-white shadow-sm'
                                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'"
                                    :aria-current="derivedSettingsTab === section.tab ? 'page' : undefined"
                                    @click="navigateSettings($event, section.tab)"
                                >
                                    {{ section.label }}
                                </a>
                            </div>
                            <div class="border-t border-zinc-200 pt-4" v-if="user">
                                <Button
                                    type="button"
                                    variant="outline"
                                    class="inline-flex w-full items-center justify-center gap-2"
                                    :disabled="logoutProcessing"
                                    :aria-label="logoutProcessing ? 'Signing out' : 'Sign out'"
                                    @click="logout"
                                >
                                    <LogOut class="h-4 w-4" aria-hidden="true" />
                                    <span>{{ logoutProcessing ? 'Signing out…' : 'Sign out' }}</span>
                                </Button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </header>
                <main id="page-content" class="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-5 py-8">
                    <slot />
                </main>
            </div>
        </div>
    </div>
</template>
