/**
 * Shallow equality for arrays by element (using ===).
 * Handles null/undefined safely.
 * @template T
 * @param {T[]|null|undefined} a
 * @param {T[]|null|undefined} b
 * @returns {boolean}
 */
export const arraysEqual = (a, b) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

