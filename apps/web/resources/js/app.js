import './bootstrap';
import '../css/app.css';

import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import PrimeVue from 'primevue/config';
import Button from 'primevue/button';
import ToastService from 'primevue/toastservice';
import Toast from 'primevue/toast';
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

const appName = import.meta.env.VITE_APP_NAME ?? 'Content Creation';

createInertiaApp({
    title: (title) => (title ? `${title} • ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        const vueApp = createApp({ render: () => h(App, props) });
        vueApp.use(plugin);
        vueApp.use(PrimeVue, {
            ripple: true,
            theme: {
                preset: Aura,
            },
        });
        vueApp.use(ToastService);
        vueApp.component('PrimeButton', Button);
        vueApp.component('PrimeToast', Toast);
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
