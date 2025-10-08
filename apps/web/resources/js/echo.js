import Echo from 'laravel-echo';

import Pusher from 'pusher-js';

window.Pusher = Pusher;

const runtimeConfig = window.__REVERB_CONFIG__ ?? {};

const scheme =
    import.meta.env.VITE_REVERB_SCHEME ??
    runtimeConfig.scheme ??
    'https';

const fallbackHttpPort = 80;
const fallbackHttpsPort = 443;

const rawPort =
    import.meta.env.VITE_REVERB_PORT ??
    runtimeConfig.port ??
    (scheme === 'https' ? fallbackHttpsPort : fallbackHttpPort);

const numericPort = Number(rawPort);
const wsPort = numericPort || fallbackHttpPort;
const wssPort = numericPort || fallbackHttpsPort;
const host =
    import.meta.env.VITE_REVERB_HOST ??
    runtimeConfig.host ??
    window.location.hostname;
const key =
    import.meta.env.VITE_REVERB_APP_KEY ??
    runtimeConfig.key ??
    '';

if (!key) {
    console.warn(
        '[Realtime] Missing Reverb app key. Echo will not be initialised.'
    );
} else {
window.Echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort,
    wssPort,
    forceTLS: scheme === 'https',
    // Pusher v8 expects a cluster option; provide a harmless default
    cluster: 'mt1',
    // Be explicit about the Reverb websocket path
    wsPath: '/app',
    // Prefer secure transport in production; browsers on https block ws:// anyway
    enabledTransports: scheme === 'https' ? ['wss'] : ['ws', 'wss'],
    disableStats: true,
});
}
