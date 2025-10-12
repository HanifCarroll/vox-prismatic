import './bootstrap';
import '../css/app.css';

import { createApp, h } from 'vue';
import { createInertiaApp, router } from '@inertiajs/vue3';
import { toast } from 'vue-sonner';
// PrimeVue removed; using shadcn-vue components instead.
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

let hasReloadedForChunkError = false;
window.addEventListener('vite:preloadError', (event) => {
    if (hasReloadedForChunkError) {
        return;
    }

    hasReloadedForChunkError = true;
    console.warn('Vite chunk load failed; forcing full reload.', event?.payload);
    window.location.reload();
});

const appName = import.meta.env.VITE_APP_NAME ?? 'Content Creation';

createInertiaApp({
    title: (title) => (title ? `${title} • ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        const vueApp = createApp({ render: () => h(App, props) });
        vueApp.use(plugin);
        // No PrimeVue compatibility components registered.
        vueApp.config.globalProperties.$echo = window.Echo;
        vueApp.mount(el);
        return vueApp;
    },
    progress: {
        color: '#18181b',
        delay: 200,
        includeCSS: true,
        showSpinner: false,
    },
});

// PostHog auto pageview is configured via 'capture_pageview: "history_change"' in Blade.

const DEPLOYMENT_RECOVERY = {
    running: false,
    intervalId: null,
    toastId: null,
    awaitingReload: false,
};
const DEPLOYMENT_POLL_INTERVAL = 3000;
const HEALTH_ENDPOINT = '/up';
const HEALTH_REQUEST_TIMEOUT = 5000;

const finishDeploymentRecovery = () => {
    if (!DEPLOYMENT_RECOVERY.running) {
        return;
    }

    if (DEPLOYMENT_RECOVERY.intervalId) {
        clearInterval(DEPLOYMENT_RECOVERY.intervalId);
        DEPLOYMENT_RECOVERY.intervalId = null;
    }

    if (DEPLOYMENT_RECOVERY.toastId) {
        toast.dismiss(DEPLOYMENT_RECOVERY.toastId);
        DEPLOYMENT_RECOVERY.toastId = null;
    }

    DEPLOYMENT_RECOVERY.awaitingReload = false;
    DEPLOYMENT_RECOVERY.running = false;

    toast.success("Update complete. You're back online.", {
        duration: 4000,
    });
};

const startDeploymentRecovery = () => {
    if (DEPLOYMENT_RECOVERY.running) {
        return;
    }

    DEPLOYMENT_RECOVERY.running = true;
    DEPLOYMENT_RECOVERY.toastId = toast("We're updating Vox Prismatic right now. Sit tight—we'll reconnect automatically.", {
        duration: Infinity,
    });

    const pollHealth = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_REQUEST_TIMEOUT);
            const response = await fetch(HEALTH_ENDPOINT, {
                cache: 'no-store',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok && !DEPLOYMENT_RECOVERY.awaitingReload) {
                DEPLOYMENT_RECOVERY.awaitingReload = true;
                router.reload({
                    preserveScroll: true,
                    preserveState: true,
                });
            }
        } catch (error) {
            // Ignore fetch errors until the server is reachable again.
        }
    };

    DEPLOYMENT_RECOVERY.intervalId = window.setInterval(pollHealth, DEPLOYMENT_POLL_INTERVAL);
    pollHealth();
};

const handleInvalidResponse = (event) => {
    const status = event.detail?.response?.status ?? null;
    if (status && (status === 404 || status >= 500)) {
        event.preventDefault();
        DEPLOYMENT_RECOVERY.awaitingReload = false;
        startDeploymentRecovery();
    }
};

const handleException = (event) => {
    const exception = event.detail?.exception;
    if (
        exception instanceof TypeError ||
        (typeof exception?.message === 'string' && exception.message.toLowerCase().includes('network error'))
    ) {
        event.preventDefault();
        DEPLOYMENT_RECOVERY.awaitingReload = false;
        startDeploymentRecovery();
    }
};

const handleSuccess = () => {
    if (DEPLOYMENT_RECOVERY.awaitingReload) {
        finishDeploymentRecovery();
    }
};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (!window.__voxDeploymentRecoveryBound) {
        document.addEventListener('inertia:invalid', handleInvalidResponse, { passive: false });
        document.addEventListener('inertia:exception', handleException, { passive: false });
        document.addEventListener('inertia:success', handleSuccess);
        window.__voxDeploymentRecoveryBound = true;
    }
}
