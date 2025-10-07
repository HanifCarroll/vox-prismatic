import './bootstrap';
import '../css/app.css';

import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
// PrimeVue removed; using shadcn-vue components instead.
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

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
