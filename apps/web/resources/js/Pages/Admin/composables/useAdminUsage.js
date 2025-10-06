import { ref } from 'vue';

export const useAdminUsage = ({ initialRange, initialFrom, initialTo, initialUsage, notify } = {}) => {
  const rangeOptions = ['7d', '30d', '90d', 'all'];
  const selectedRange = ref(rangeOptions.includes(initialRange) ? initialRange : '30d');
  const usage = ref(Array.isArray(initialUsage) ? [...initialUsage] : []);
  const loading = ref(false);
  const errorMessage = ref(null);
  const currentFrom = ref(initialFrom ?? null);
  const currentTo = ref(initialTo ?? null);

  const resolveErrorMessage = (error, fallback) => {
    if (error && typeof error === 'object') {
      if ('response' in error && error.response && typeof error.response === 'object') {
        const data = error.response.data;
        if (data && typeof data.error === 'string' && data.error.trim() !== '') {
          return data.error;
        }
      }
      if ('message' in error && typeof error.message === 'string' && error.message.trim() !== '') {
        return error.message;
      }
    }
    return fallback;
  };

  const computeRangeBoundaries = (rangeKey) => {
    if (rangeKey === 'all') {
      return { from: null, to: null };
    }
    const days = Number.parseInt(rangeKey, 10);
    if (Number.isNaN(days) || days <= 0) {
      return { from: null, to: null };
    }
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const loadUsage = async ({ from, to, showLoading }) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (showLoading) loading.value = true;
    errorMessage.value = null;
    try {
      const response = await window.axios.get('/admin/usage', { params });
      const incoming = Array.isArray(response.data?.usage) ? response.data.usage : [];
      usage.value = incoming;
      currentFrom.value = from ?? null;
      currentTo.value = to ?? null;
    } catch (error) {
      const message = resolveErrorMessage(error, 'Failed to load usage metrics.');
      errorMessage.value = message;
      if (typeof notify === 'function') notify('error', message);
    } finally {
      if (showLoading) loading.value = false;
    }
  };

  const applyRange = async (rangeKey) => {
    selectedRange.value = rangeKey;
    const { from, to } = computeRangeBoundaries(rangeKey);
    await loadUsage({ from, to, showLoading: true });
  };

  const refreshCurrentRange = async () => {
    await loadUsage({ from: currentFrom.value, to: currentTo.value, showLoading: true });
  };

  return {
    selectedRange,
    usage,
    loading,
    errorMessage,
    currentFrom,
    currentTo,
    applyRange,
    refreshCurrentRange,
    resolveErrorMessage,
  };
};

