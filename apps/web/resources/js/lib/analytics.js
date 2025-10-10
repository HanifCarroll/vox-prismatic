// Lightweight analytics wrapper around PostHog (browser).
// Safe to import anywhere; becomes a no-op when PostHog is unavailable.

const safe = (fn) => {
  try { fn && fn(); } catch (_) {}
};

const hasPH = () => typeof window !== 'undefined' && typeof window.posthog !== 'undefined';

const normalizeProps = (props) => {
  const p = props && typeof props === 'object' ? props : {};
  // Avoid sending accidentally large strings
  Object.keys(p).forEach((k) => {
    const v = p[k];
    if (typeof v === 'string' && v.length > 500) {
      p[k] = `${v.slice(0, 497)}…`;
    }
  });
  return p;
};

export const analytics = {
  capture(event, props) {
    if (!hasPH()) return;
    const payload = normalizeProps(props);
    safe(() => window.posthog.capture(event, payload));
  },
  identify(id, props) {
    if (!hasPH() || !id) return;
    const payload = normalizeProps(props);
    safe(() => window.posthog.identify(String(id), payload));
  },
  pageview(props) {
    if (!hasPH()) return;
    const payload = normalizeProps(props);
    safe(() => window.posthog.capture('$pageview', payload));
  },
};

export default analytics;

