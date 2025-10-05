<script setup>
import { Link, router, usePage } from '@inertiajs/vue3';
import { computed, ref } from 'vue';

const props = defineProps({
    title: { type: String, default: null },
    showNewProject: { type: Boolean, default: true },
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

const derivedSettingsTab = computed(() => {
    if (props.settingsTab) {
        return props.settingsTab;
    }

    const [, query = ''] = (page.url ?? '').split('?');
    const params = new URLSearchParams(query);
    return params.get('tab');
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
    { label: 'Billing', tab: 'billing' },
];
</script>

<template>
    <div class="min-h-screen bg-zinc-50">
        <a
            href="#page-content"
            class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow"
        >
            Skip to content
        </a>
        <div class="flex min-h-screen">
            <aside class="hidden w-64 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
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
                <div class="px-5" v-if="showNewProject">
                    <Link
                        href="/projects/new"
                        class="inline-flex w-full items-center justify-center gap-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
                        </svg>
                        New project
                    </Link>
                </div>
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
                            <svg
                                v-if="item.icon === 'projects'"
                                class="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            </svg>
                            <svg
                                v-else-if="item.icon === 'calendar'"
                                class="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                            >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <path stroke-linecap="round" d="M16 2v4M8 2v4M3 10h18" />
                            </svg>
                            <svg
                                v-else-if="item.icon === 'analytics'"
                                class="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 19h16M7 16v-6m5 6V9m5 7v-4" />
                            </svg>
                            <svg
                                v-else-if="item.icon === 'settings'"
                                class="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M10.325 4.317a1.724 1.724 0 0 1 3.35 0l.108.374a1.724 1.724 0 0 0 2.573 1.01l.335-.193a1.724 1.724 0 0 1 2.348.63l.022.04a1.724 1.724 0 0 1-.63 2.347l-.335.194a1.724 1.724 0 0 0-1.01 2.572l.108.374a1.724 1.724 0 0 1-1.667 2.236h-.043a1.724 1.724 0 0 0-1.63 1.202l-.108.374a1.724 1.724 0 0 1-3.35 0l-.108-.374a1.724 1.724 0 0 0-2.573-1.01l-.335.193a1.724 1.724 0 0 1-2.348-.63l-.022-.04a1.724 1.724 0 0 1 .63-2.347l.335-.194a1.724 1.724 0 0 0 1.01-2.572l-.108-.374a1.724 1.724 0 0 1 1.667-2.236h.043a1.724 1.724 0 0 0 1.63-1.202z"
                                />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                            <svg
                                v-else-if="item.icon === 'shield'"
                                class="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.5"
                                aria-hidden="true"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 4v5c0 5-3.5 9-7 9s-7-4-7-9V7l7-4z" />
                            </svg>
                            <span>{{ item.label }}</span>
                        </Link>

                        <div
                            v-if="item.icon === 'settings' && item.active"
                            class="pl-7 pr-4 text-xs"
                            aria-label="Settings sections"
                        >
                            <ul class="space-y-1 border-l border-zinc-200 pl-3">
                                <li v-for="section in settingsSections" :key="section.tab">
                                    <Link
                                        :href="`/settings?tab=${section.tab}`"
                                        class="block rounded px-2 py-1 transition"
                                        :class="derivedSettingsTab === section.tab
                                            ? 'bg-zinc-100 text-zinc-900'
                                            : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'"
                                        :aria-current="derivedSettingsTab === section.tab ? 'page' : undefined"
                                    >
                                        {{ section.label }}
                                    </Link>
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
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16 17l5-5-5-5M21 12H9" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" />
                        </svg>
                        <span>{{ logoutProcessing ? 'Signing out…' : 'Sign out' }}</span>
                    </button>
                </div>
            </aside>

        <div class="flex w-full flex-col">
                <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                    <div class="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div class="space-y-1">
                            <h1 v-if="title" class="text-xl font-semibold text-zinc-900">{{ title }}</h1>
                            <p
                                v-if="statusMessage"
                                class="text-sm text-zinc-600"
                                role="status"
                                aria-live="polite"
                            >
                                {{ statusMessage }}
                            </p>
                            <p
                                v-if="errorMessage"
                                class="text-sm text-red-600"
                                role="alert"
                                aria-live="assertive"
                            >
                                {{ errorMessage }}
                            </p>
                        </div>
                        <Link
                            v-if="showNewProject"
                            href="/projects/new"
                            class="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                        >
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m7-7H5" />
                            </svg>
                            New project
                        </Link>
                    </div>
                </header>

                <main id="page-content" class="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
                    <slot />
                </main>
            </div>
        </div>
    </div>
</template>
