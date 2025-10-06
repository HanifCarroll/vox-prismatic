/**
 * Normalize a time string to HH:mm (24h) format.
 * @param {string} value
 * @returns {string}
 */
export const normalizeTime = (value) => {
  const [hours = '0', minutes = '0'] = String(value ?? '00:00').split(':');
  const normalizedHours = String(hours).padStart(2, '0');
  const normalizedMinutes = String(minutes).padStart(2, '0');
  return `${normalizedHours}:${normalizedMinutes}`;
};

/**
 * Convert HH:mm to minutes since midnight.
 * @param {string} value
 * @returns {number}
 */
export const timeToMinutes = (value) => {
  const [hours, minutes] = normalizeTime(value).split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
};

/**
 * Normalize a scheduling slot; ensures ISO day (1-7), HH:mm, and boolean active.
 * @param {{isoDayOfWeek?: number, time?: string, active?: boolean}} slot
 */
export const normalizeSlot = (slot = {}) => {
  const isoRaw = Number(slot?.isoDayOfWeek ?? 1);
  const isoDayOfWeek = Number.isInteger(isoRaw) && isoRaw >= 1 && isoRaw <= 7 ? isoRaw : 1;
  const active = Object.prototype.hasOwnProperty.call(slot ?? {}, 'active') ? Boolean(slot.active) : true;
  return {
    isoDayOfWeek,
    time: normalizeTime(slot?.time ?? '00:00'),
    active,
  };
};

/**
 * Normalize and stable sort slots by day then time.
 * @param {Array<{isoDayOfWeek:number,time:string,active:boolean}>} slots
 */
export const sortSlots = (slots = []) =>
  slots
    .map((slot) => normalizeSlot(slot))
    .sort((a, b) => {
      if (a.isoDayOfWeek !== b.isoDayOfWeek) {
        return a.isoDayOfWeek - b.isoDayOfWeek;
      }
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });

