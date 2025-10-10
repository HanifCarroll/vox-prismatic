<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @php
        $reverbApp = data_get(config('reverb.apps.apps'), 0, []);
        $reverbOptions = data_get($reverbApp, 'options', []);
    @endphp
    @php
        $reverbConfig = [
            'key' => $reverbApp['key'] ?? null,
            'host' => $reverbOptions['host'] ?? null,
            'port' => $reverbOptions['port'] ?? null,
            'scheme' => $reverbOptions['scheme'] ?? null,
        ];
    @endphp
    <script>
        window.__REVERB_CONFIG__ = @js($reverbConfig);
    </script>
    {{-- PostHog (app only) --}}
    @if (app()->environment('production') && (config('services.posthog.enabled') && config('services.posthog.key')))
        <script>
            (function () {
                const STORAGE_KEY = 'vp_tracking_blocked';
                const probeUrl = '{{ rtrim(config('services.posthog.host') ?? 'https://us.posthog.com', '/') }}/static/array.js';

                const setResult = (blocked) => {
                    window.__TRACKING_BLOCKED__ = Boolean(blocked);
                    try {
                        const storage = window.sessionStorage;
                        if (storage) {
                            storage.setItem(STORAGE_KEY, blocked ? 'blocked' : 'allowed');
                        }
                    } catch (_) {}
                    return Boolean(blocked);
                };

                const markBlocked = () => setResult(true);
                const markAllowed = () => setResult(false);
                window.__markTrackingBlocked = markBlocked;
                window.__markTrackingAllowed = markAllowed;

                const readCached = () => {
                    try {
                        return window.sessionStorage?.getItem(STORAGE_KEY) ?? null;
                    } catch (_) {
                        return null;
                    }
                };

                const cached = readCached();
                if (cached === 'blocked' || cached === 'allowed') {
                    window.__trackingReady = Promise.resolve(setResult(cached === 'blocked'));
                    return;
                }

                if (typeof fetch !== 'function') {
                    window.__trackingReady = Promise.resolve(setResult(false));
                    return;
                }

                window.__trackingReady = new Promise((resolve) => {
                    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timer = setTimeout(() => {
                        if (controller) {
                            try { controller.abort(); } catch (_) {}
                        }
                    }, 1500);

                    const finish = (blocked) => {
                        clearTimeout(timer);
                        resolve(setResult(blocked));
                    };

                    try {
                        fetch(probeUrl, {
                            method: 'GET',
                            mode: 'no-cors',
                            cache: 'no-store',
                            signal: controller?.signal,
                        })
                            .then(() => finish(false))
                            .catch(() => finish(true));
                    } catch (_) {
                        finish(true);
                    }
                });
            })();
        </script>
        <script>
            (function () {
                const host = '{{ rtrim(config('services.posthog.host') ?? 'https://us.posthog.com', '/') }}';
                const apiKey = '{{ config('services.posthog.key') }}';
                const normalizeHost = (value) => {
                    try {
                        const url = new URL(value);
                        return { origin: url.origin, hostname: url.hostname };
                    } catch (_) {
                        return { origin: value, hostname: value };
                    }
                };

                const hostInfo = normalizeHost(host);
                const candidatePatterns = new Set([
                    hostInfo.origin,
                    hostInfo.hostname,
                ]);
                if (hostInfo.hostname && hostInfo.hostname.includes('.posthog.')) {
                    candidatePatterns.add(hostInfo.origin.replace('://us.', '://us.i.'));
                    candidatePatterns.add(hostInfo.hostname.replace('://us.', '://us.i.'));
                    candidatePatterns.add(hostInfo.origin.replace('://eu.', '://eu.i.'));
                    candidatePatterns.add(hostInfo.hostname.replace('://eu.', '://eu.i.'));
                }

                const shouldWatchUrl = (value) => {
                    if (!value) {
                        return false;
                    }
                    const patterns = Array.from(candidatePatterns).filter(Boolean);
                    try {
                        const resolved = new URL(value, window.location.origin);
                        return patterns.some((pattern) => pattern && (resolved.origin.includes(pattern) || resolved.hostname.includes(pattern))) ||
                            /posthog/i.test(resolved.hostname);
                    } catch (_) {
                        const str = String(value);
                        return patterns.some((pattern) => pattern && str.includes(pattern)) || /posthog/i.test(str);
                    }
                };

                const markBlocked = () => {
                    if (window.__TRACKING_BLOCKED__) return true;
                    if (typeof window.__markTrackingBlocked === 'function') {
                        window.__markTrackingBlocked();
                    } else {
                        window.__TRACKING_BLOCKED__ = true;
                    }
                    try {
                        if (window.posthog && typeof window.posthog.opt_out_capturing === 'function') {
                            window.posthog.opt_out_capturing();
                        }
                    } catch (_) {}
                    return true;
                };

                const installGuards = () => {
                    if (typeof window.fetch === 'function' && !window.__VP_FETCH_GUARD_INSTALLED__) {
                        const originalFetch = window.fetch.bind(window);
                        window.fetch = function (input, init) {
                            const url = typeof input === 'string' ? input : (input && input.url);
                            const shouldWatch = shouldWatchUrl(url);
                            const promise = originalFetch(input, init);
                            if (shouldWatch && promise && typeof promise.catch === 'function') {
                                promise.catch(() => markBlocked());
                            }
                            return promise;
                        };
                        window.__VP_FETCH_GUARD_INSTALLED__ = true;
                    }

                    if (typeof XMLHttpRequest !== 'undefined' && !window.__VP_XHR_GUARD_INSTALLED__) {
                        const originalOpen = XMLHttpRequest.prototype.open;
                        const originalSend = XMLHttpRequest.prototype.send;

                        XMLHttpRequest.prototype.open = function (method, url) {
                            this.__vpWatch = shouldWatchUrl(url);
                            return originalOpen.apply(this, arguments);
                        };

                        XMLHttpRequest.prototype.send = function (body) {
                            if (this.__vpWatch) {
                                this.addEventListener('error', () => markBlocked(), { once: true });
                                this.addEventListener('abort', () => markBlocked(), { once: true });
                            }
                            return originalSend.apply(this, arguments);
                        };
                        window.__VP_XHR_GUARD_INSTALLED__ = true;
                    }
                };

                installGuards();

                const initPosthog = () => {
                    if (window.__TRACKING_BLOCKED__) {
                        return;
                    }
                    if (window.posthog && window.posthog.__VP_INITIALIZED__) {
                        return;
                    }

                    (function (documentRef, posthogRef) {
                        if (!posthogRef.__SV) {
                            window.posthog = posthogRef;
                            posthogRef._i = [];
                            posthogRef.init = function (apiKey, options, name) {
                                function assign(target, method) {
                                    const parts = method.split('.');
                                    if (parts.length === 2) {
                                        target = target[parts[0]];
                                        method = parts[1];
                                    }
                                    target[method] = function () {
                                        target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
                                    };
                                }
                                const script = documentRef.createElement('script');
                                script.type = 'text/javascript';
                                script.async = true;
                                script.src = (options.api_host || 'https://us.posthog.com') + '/static/array.js';
                                const firstScript = documentRef.getElementsByTagName('script')[0];
                                firstScript.parentNode.insertBefore(script, firstScript);
                                let phObject = posthogRef;
                                if (void 0 !== name) {
                                    phObject = posthogRef[name] = [];
                                } else {
                                    name = 'posthog';
                                }
                                phObject.people = phObject.people || [];
                                phObject.toString = function (printFull) {
                                    let str = 'posthog';
                                    if ('posthog' !== name) {
                                        str += '.' + name;
                                    }
                                    return printFull ? str : str + ' (stub)';
                                };
                                phObject.people.toString = function () {
                                    return phObject.toString(1) + '.people (stub)';
                                };
                                const functions = 'capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset on onFeatureFlags'.split(' ');
                                for (let i = 0; i < functions.length; i += 1) {
                                    assign(phObject, functions[i]);
                                }
                                posthogRef._i.push([apiKey, options, name]);
                            };
                            posthogRef.__SV = 1;
                        }
                    })(document, window.posthog || []);

                    window.posthog.init(apiKey, {
                        api_host: host,
                        capture_pageview: 'history_change',
                        autocapture: true,
                        persistence: 'localStorage',
                    });
                    window.posthog.__VP_INITIALIZED__ = true;
                };

                const ready = window.__trackingReady instanceof Promise
                    ? window.__trackingReady
                    : Promise.resolve(Boolean(window.__TRACKING_BLOCKED__));

                ready
                    .then((blocked) => {
                        if (blocked) {
                            markBlocked();
                            return;
                        }
                        initPosthog();
                    })
                    .catch(() => {
                        initPosthog();
                    });

                if (ready && typeof ready.catch === 'function') {
                    ready.catch(() => {});
                }
            })();
        </script>
    @endif
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @inertiaHead
</head>
<body class="min-h-screen bg-zinc-50 font-sans antialiased text-zinc-900">
    @inertia
</body>
</html>
