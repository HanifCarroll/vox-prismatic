// Timezone helpers for scheduling UI without external libraries.

/**
 * Build a map from Intl.DateTimeFormat formatToParts.
 */
function partsToRecord(parts) {
  const out = {};
  for (const p of parts) {
    out[p.type] = p.value;
  }
  return out;
}

/**
 * Formats a Date/ISO value into a "YYYY-MM-DDTHH:MM" string in the given IANA timezone.
 * Suitable for binding to an <input type="datetime-local"> value.
 * @param {string|number|Date} value
 * @param {string} timeZone
 */
export function formatForDateTimeLocal(value, timeZone = 'UTC') {
  const date = value instanceof Date ? value : new Date(value);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const rec = partsToRecord(dtf.formatToParts(date));
  const yyyy = String(rec.year).padStart(4, '0');
  const mm = String(rec.month).padStart(2, '0');
  const dd = String(rec.day).padStart(2, '0');
  const HH = String(rec.hour).padStart(2, '0');
  const MM = String(rec.minute).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${HH}:${MM}`;
}

/**
 * Computes the timezone offset (in ms) for the provided UTC date in the specified zone.
 * Technique adapted from date-fns-tz: compare the same instant formatted for the zone.
 * @param {Date} utcDate A Date instance representing a UTC instant
 * @param {string} timeZone IANA zone
 */
function getTimeZoneOffsetMs(utcDate, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = partsToRecord(dtf.formatToParts(utcDate));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - utcDate.getTime();
}

/**
 * Converts a local input string (YYYY-MM-DDTHH:MM) in a given timezone
 * into an ISO string in UTC.
 * @param {string} localInput
 * @param {string} timeZone
 * @returns {string} ISO string in UTC
 */
export function localInputToUtcIso(localInput, timeZone = 'UTC') {
  if (!localInput) return new Date().toISOString();
  const [d, t] = String(localInput).split('T');
  const [y, m, day] = d.split('-').map((n) => Number(n));
  const [hh, mm] = t.split(':').map((n) => Number(n));
  // Treat this wall time as if it were UTC, then correct by the timezone offset.
  const utcGuess = new Date(Date.UTC(y, (m || 1) - 1, day || 1, hh || 0, mm || 0, 0));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);
  const actualUtc = new Date(utcGuess.getTime() - offsetMs);
  return actualUtc.toISOString();
}

/**
 * Returns a "YYYY-MM-DDTHH:MM" string for the top of the next hour in the given timezone.
 * @param {string} timeZone
 */
export function nextTopOfHourLocalString(timeZone = 'UTC') {
  // Get current local time in the zone
  const nowLocal = formatForDateTimeLocal(new Date(), timeZone);
  const [d, t] = nowLocal.split('T');
  let [hh, mm] = t.split(':').map((n) => Number(n));
  if (Number.isNaN(hh)) hh = 0;
  if (Number.isNaN(mm)) mm = 0;
  if (mm > 0) hh += 1; // round up to next hour
  mm = 0;
  const candidate = `${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  // Normalize across day boundaries by converting to UTC and back
  const iso = localInputToUtcIso(candidate, timeZone);
  return formatForDateTimeLocal(iso, timeZone);
}

/**
 * Returns a "YYYY-MM-DDTHH:MM" string for current time + specified minutes in the given timezone.
 * @param {number} minutesToAdd - Minutes to add to current time
 * @param {string} timeZone - IANA timezone
 */
export function currentTimePlusMinutes(minutesToAdd, timeZone = 'UTC') {
  const now = new Date();
  const future = new Date(now.getTime() + minutesToAdd * 60 * 1000);
  const needsRounding = future.getSeconds() > 0 || future.getMilliseconds() > 0;
  future.setSeconds(0, 0);
  if (needsRounding) {
    future.setMinutes(future.getMinutes() + 1);
  }
  return formatForDateTimeLocal(future, timeZone);
}
