import { toast } from 'vue-sonner';

// Simple notification helper using Sonner (shadcn-vue)
// Returns a `push` function: ('success'|'error'|'info', message: string)
export const useNotifications = () => {
  const push = (type, message) => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      default:
        toast(message);
    }
  };
  return { push };
};
