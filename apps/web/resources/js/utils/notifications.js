import { useToast } from 'primevue/usetoast';

/**
 * Simple notification helper using PrimeVue Toast.
 * Returns a `push` function: ('success'|'error'|'info', message: string)
 */
export const useNotifications = () => {
  const toast = useToast();
  const push = (type, message) => {
    const severity = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    toast.add({
      severity,
      summary: severity === 'error' ? 'Something went wrong' : undefined,
      detail: message,
      life: 5000,
    });
  };
  return { push };
};

