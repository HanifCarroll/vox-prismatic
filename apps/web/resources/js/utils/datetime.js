// Simple date/time formatting utilities shared across pages.

/**
 * Formats a timestamp or Date to a readable local date/time like "Jan 2, 2025, 3:45".
 * Falls back to the input value on failure.
 * @param {string|number|Date|null|undefined} value
 * @returns {string}
 */
export const formatDateTime = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return String(value);
  }
};

/**
 * Formats a timestamp or Date to a relative label like "in 2 hours" or "3 days ago".
 * Returns empty string on failure.
 * @param {string|number|Date|null|undefined} value
 * @returns {string}
 */
export const formatRelativeTime = (value) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    let duration = (date.getTime() - Date.now()) / 1000;
    const divisions = [
      { amount: 60, unit: 'second' },
      { amount: 60, unit: 'minute' },
      { amount: 24, unit: 'hour' },
      { amount: 7, unit: 'day' },
      { amount: 4.34524, unit: 'week' },
      { amount: 12, unit: 'month' },
      { amount: Number.POSITIVE_INFINITY, unit: 'year' },
    ];
    for (const division of divisions) {
      if (Math.abs(duration) < division.amount) {
        const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
        return formatter.format(Math.round(duration), division.unit);
      }
      duration /= division.amount;
    }
    return '';
  } catch (error) {
    return '';
  }
};

