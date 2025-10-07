import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// Attach CSRF token from meta for all same-origin requests.
try {
  const el = document.head?.querySelector('meta[name="csrf-token"]');
  const token = el?.getAttribute('content');
  if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
  }
} catch {}

/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allow your team to quickly build robust real-time web applications.
 */

import './echo';
