"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type ToastInput = Omit<Toast, "id">;

interface ToastContextValue {
  toasts: Toast[];
  addToast: (input: ToastInput) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message?: string, opts?: Partial<ToastInput>) => string;
  error: (title: string, message?: string, opts?: Partial<ToastInput>) => string;
  warning: (title: string, message?: string, opts?: Partial<ToastInput>) => string;
  info: (title: string, message?: string, opts?: Partial<ToastInput>) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextId = 0;
function generateId(): string {
  return `toast-${Date.now()}-${++_nextId}`;
}

const ICONS: Record<ToastType, ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      <path d="M8 12.5l2.5 2.5 5-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      <path d="M15 9l-6 6M9 9l6 6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 3L2 20h20L12 3z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4M12 16v.5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      <path d="M12 16v-4M12 8h.01" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const TYPE_STYLES: Record<ToastType, { border: string; icon: string; bg: string; progress: string }> = {
  success: {
    border: "border-emerald-500/40",
    icon: "text-emerald-400",
    bg: "from-emerald-500/10 to-emerald-600/5",
    progress: "bg-emerald-400",
  },
  error: {
    border: "border-red-500/40",
    icon: "text-red-400",
    bg: "from-red-500/10 to-red-600/5",
    progress: "bg-red-400",
  },
  warning: {
    border: "border-amber-500/40",
    icon: "text-amber-400",
    bg: "from-amber-500/10 to-amber-600/5",
    progress: "bg-amber-400",
  },
  info: {
    border: "border-blue-500/40",
    icon: "text-blue-400",
    bg: "from-blue-500/10 to-blue-600/5",
    progress: "bg-blue-400",
  },
};

// ---------------------------------------------------------------------------
// Single toast item
// ---------------------------------------------------------------------------

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const pausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const styles = TYPE_STYLES[toast.type];
  const duration = toast.duration ?? 5000;
  const isPersistent = duration === 0;

  // Timer for auto-dismiss
  useEffect(() => {
    if (isPersistent) return;

    const tick = () => {
      if (!pausedRef.current) {
        const e = Date.now() - startTimeRef.current;
        setElapsed(e);
        if (e >= duration) {
          onRemove(toast.id);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, isPersistent, toast.id, onRemove]);

  const progressPct = isPersistent ? 100 : Math.min((elapsed / duration) * 100, 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.92 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        startTimeRef.current = Date.now() - elapsed;
        pausedRef.current = false;
      }}
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-xl border backdrop-blur-xl bg-gradient-to-r shadow-lg",
        styles.border,
        styles.bg
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Top accent line */}
      <div className={cn("absolute left-0 top-0 h-0.5 w-full", styles.progress)} style={{ width: `${100 - progressPct}%` }} />

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={cn("mt-0.5 shrink-0", styles.icon)}>{ICONS[toast.type]}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed">{toast.message}</p>
          )}
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="mt-2 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        {toast.closable !== false && (
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="shrink-0 p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
            aria-label="Close notification"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 111.06 1.06L10 8.94l2.66-2.66a.75.75 0 111.06 1.06L11.06 10l2.66 2.66a.75.75 0 11-1.06 1.06L10 11.06l-2.66 2.66a.75.75 0 11-1.06-1.06L8.94 10 6.28 7.34a.75.75 0 010-1.06z" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Toast container (fixed position, stacked)
// ---------------------------------------------------------------------------

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex w-full max-w-[400px] flex-col gap-3 pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((input: ToastInput): string => {
    const id = generateId();
    const toast: Toast = { ...input, id, duration: input.duration ?? 5000, closable: input.closable ?? true };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => setToasts([]), []);

  const shorthand = useCallback(
    (type: ToastType, title: string, message?: string, opts?: Partial<ToastInput>) =>
      addToast({ type, title, message, ...opts }),
    [addToast]
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success: (t, m, o) => shorthand("success", t, m, o),
    error: (t, m, o) => shorthand("error", t, m, o),
    warning: (t, m, o) => shorthand("warning", t, m, o),
    info: (t, m, o) => shorthand("info", t, m, o),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
