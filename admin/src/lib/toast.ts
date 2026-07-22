/**
 * Toast hook — wraps sonner with the same API as the Next.js client.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Berhasil");
 *   toast.error("Gagal", { description: "...", duration: 5000 });
 *   toast.info("Info");
 *   const id = toast.loading("Loading...");
 *   toast.dismiss(id);
 *   await toast.promise(save(), { loading: "Menyimpan...", success: "Tersimpan", error: "Gagal" });
 */
import { toast as sonnerToast } from "sonner";

interface ToastApi {
  success: (
    message: string,
    options?: { description?: string; duration?: number },
  ) => void;
  error: (
    message: string,
    options?: { description?: string; duration?: number },
  ) => void;
  info: (
    message: string,
    options?: { description?: string; duration?: number },
  ) => void;
  loading: (
    message: string,
    options?: { description?: string; duration?: number },
  ) => string | number;
  dismiss: (id: string | number) => void;
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: { loading: string; success: string; error: string },
  ) => Promise<T>;
}

export function useToast(): ToastApi {
  return {
    success: (message, options) => sonnerToast.success(message, options),
    error: (message, options) => sonnerToast.error(message, options),
    info: (message, options) => sonnerToast.info(message, options),
    loading: (message, options) => sonnerToast.loading(message, options),
    dismiss: (id) => sonnerToast.dismiss(id),
    promise: <T>(promise: Promise<T> | (() => Promise<T>), messages: { loading: string; success: string; error: string }) =>
      sonnerToast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      }) as unknown as Promise<T>,
  };
}
