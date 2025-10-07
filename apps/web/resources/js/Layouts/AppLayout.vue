<script setup>
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed, ref } from 'vue';
import { Plus, FolderKanban, Calendar, BarChart3, Settings, ShieldCheck, LogOut } from 'lucide-vue-next';
import { Toaster } from '@/components/ui/sonner';
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

const derivedSettingsTab = computed(() => {
    if (props.settingsTab) {
        return props.settingsTab;
    }

    // Prefer live URL on client to keep subnav highlight in sync when we pushState.
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('section') ?? params.get('tab');
    }

    const [, query = ''] = (page.url ?? '').split('?');
    const params = new URLSearchParams(query);
    return params.get('section') ?? params.get('tab');
});

const logoutProcessing = ref(false);
const logout = () => {
    if (logoutProcessing.value) {
        return;
    }

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
    { label: 'Danger Zone', tab: 'danger' },
];

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

    const map = { integrations: 'integrations', style: 'writing-style', scheduling: 'scheduling', danger: 'danger' };
    const id = map[tab] ?? tab;

    try {
        const url = new URL(window.location.href);
        url.searchParams.set('section', tab);
        window.history.pushState({}, '', url.toString());
    } catch {}

    const el = document.getElementById(id);
    if (el) {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
    }
}
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
            <aside class="hidden h-full w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
                <div class="flex items-center gap-3 px-5 py-4">
                    <Link href="/projects" class="flex items-center gap-2 text-zinc-900">
                        <span
                            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white"
                        >
                            CC
                        </span>
                        <span class="text-base font-semibold">Content Creation</span>
                    </Link>
                </div>
                <!-- Removed sidebar New project button per UX update -->
                <nav class="mt-6 flex-1 space-y-1 px-3" aria-label="Main">
                    <div v-for="item in navItems" :key="item.label">
                        <Link
                            :href="item.href"
                            class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition"
                            :class="item.active
                                ? 'bg-zinc-100 text-zinc-900'
                                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'"
                            :aria-current="item.active ? 'page' : undefined"
                        >
                            <component :is="iconMap[item.icon]" class="h-4 w-4" aria-hidden="true" />
                            <span>{{ item.label }}</span>
                        </Link>

                        <div
                            v-if="item.icon === 'settings' && item.active"
                            class="pl-7 pr-4 text-xs"
                            aria-label="Settings sections"
                        >
                            <ul class="space-y-1 border-l border-zinc-200 pl-3">
                                <li v-for="section in settingsSections" :key="section.tab">
                                    <a
                                        :href="`/settings?section=${section.tab}`"
                                        class="block rounded px-2 py-1 transition"
                                        :class="derivedSettingsTab === section.tab
                                            ? 'bg-zinc-100 text-zinc-900'
                                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'"
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
                <div class="border-t border-zinc-200 px-5 py-4" v-if="user">
                    <div class="text-sm">
                        <div class="font-semibold text-zinc-900">{{ user.name ?? 'Account' }}</div>
                        <div class="text-xs text-zinc-500" :title="user.email">{{ user.email }}</div>
                    </div>
                    <button
                        type="button"
                        class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
                        :disabled="logoutProcessing"
                        @click="logout"
                    >
                        <LogOut class="h-4 w-4" aria-hidden="true" />
                        <span>{{ logoutProcessing ? 'Signing out…' : 'Sign out' }}</span>
                    </button>
                </div>
            </aside>

        <div class="flex h-full w-full flex-col overflow-hidden">
                <main id="page-content" class="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-5 py-8">
                    <slot />
                </main>
            </div>
        </div>
    </div>
</template>
