import { toast } from 'sonner';

export function useToast() {
  return {
    success: (message: string, description?: string) => {
      toast.success(message, {
        description,
        duration: 3000,
      });
    },
    error: (message: string, description?: string) => {
      toast.error(message, {
        description,
        duration: 5000,
      });
    },
    info: (message: string, description?: string) => {
      toast.info(message, {
        description,
        duration: 3000,
      });
    },
    warning: (message: string, description?: string) => {
      toast.warning(message, {
        description,
        duration: 4000,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- toast options param is cosmetic library type override
    toast: (message: string, options?: any) => {
      toast(message, options);
    }
  };
}
