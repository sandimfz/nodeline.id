"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
  type ToastInput,
  type ToastStatus,
} from "@/components/motion/animated-toast-stack";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface ToastApi {
  success: (message: string, options?: { description?: string; duration?: number }) => void;
  error: (message: string, options?: { description?: string; duration?: number }) => void;
  info: (message: string, options?: { description?: string; duration?: number }) => void;
  loading: (message: string, options?: { description?: string; duration?: number }) => string;
  dismiss: (id: string) => void;
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: { loading: string; success: string; error: string },
  ) => Promise<T>;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({
    defaultDuration: 4000,
    limit: 8,
  });

  const loadingIds = useRef<Set<string>>(new Set());

  const success = useCallback(
    (message: string, options?: { description?: string; duration?: number }) => {
      showToast({
        title: message,
        description: options?.description,
        status: "success",
        duration: options?.duration ?? 4000,
      });
    },
    [showToast],
  );

  const error = useCallback(
    (message: string, options?: { description?: string; duration?: number }) => {
      showToast({
        title: message,
        description: options?.description,
        status: "error",
        duration: options?.duration ?? 5000,
      });
    },
    [showToast],
  );

  const info = useCallback(
    (message: string, options?: { description?: string; duration?: number }) => {
      showToast({
        title: message,
        description: options?.description,
        status: "info",
        duration: options?.duration ?? 4000,
      });
    },
    [showToast],
  );

  const loading = useCallback(
    (message: string, options?: { description?: string; duration?: number }) => {
      const id = showToast({
        title: message,
        description: options?.description,
        status: "loading",
        duration: -1, // persistent — must be dismissed manually
      });
      loadingIds.current.add(id);
      return id;
    },
    [showToast],
  );

  const dismiss = useCallback(
    (id: string) => {
      loadingIds.current.delete(id);
      dismissToast(id);
    },
    [dismissToast],
  );

  const promise = useCallback(
    async <T,>(
      promiseInput: Promise<T> | (() => Promise<T>),
      messages: { loading: string; success: string; error: string },
    ): Promise<T> => {
      const id = showToast({
        title: messages.loading,
        status: "loading",
        duration: -1,
      });
      loadingIds.current.add(id);

      try {
        const p = typeof promiseInput === "function" ? promiseInput() : promiseInput;
        const result = await p;
        dismiss(id);
        showToast({ title: messages.success, status: "success" });
        return result;
      } catch (err) {
        dismiss(id);
        showToast({ title: messages.error, status: "error" });
        throw err;
      }
    },
    [showToast, dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success, error, info, loading, dismiss, promise }),
    [success, error, info, loading, dismiss, promise],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position="top-right"
        maxVisible={4}
        fixed
      />
    </ToastContext.Provider>
  );
}
