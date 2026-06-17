"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "info" | "error";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let externalToast: ToastContextValue | null = null;

export function showToast(message: string, variant: ToastVariant = "info") {
  externalToast?.toast(message, variant);
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-[var(--success-soft)] text-[var(--foreground)] border-[var(--success)]/25",
  info: "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)]",
  error: "bg-red-50 text-red-900 border-red-200",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++idRef.current;
      setItems([{ id, message, variant }]);
      window.setTimeout(() => dismiss(id), 2800);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, "success"),
    info: (m) => toast(m, "info"),
    error: (m) => toast(m, "error"),
  };

  useEffect(() => {
    externalToast = value;
    return () => {
      externalToast = null;
    };
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center px-4"
        style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top, 0px))" }}
        aria-live="polite"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dismiss(item.id)}
            className={cn(
              "toast-enter pointer-events-auto max-w-[380px] rounded-[var(--radius-card)] border px-4 py-3 text-left text-sm font-medium shadow-[var(--shadow-md)]",
              variantStyles[item.variant],
            )}
          >
            {item.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
