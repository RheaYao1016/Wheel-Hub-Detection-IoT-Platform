"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Progress } from "./Progress";
import { Loading } from "./Loading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressOverlayState {
  visible: boolean;
  title: string;
  description?: string;
  progress: number; // 0-100, -1 = indeterminate
  cancelable?: boolean;
  variant?: "spinner" | "dots" | "bars";
}

type ProgressOverlayContextValue = {
  state: ProgressOverlayState;
  show: (opts: Omit<ProgressOverlayState, "visible" | "progress"> & { progress?: number }) => void;
  update: (progress: number) => void;
  hide: () => void;
};

const ProgressOverlayContext = React.createContext<ProgressOverlayContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ProgressOverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressOverlayState>({
    visible: false,
    title: "",
    description: "",
    progress: -1,
    cancelable: false,
  });

  const show = (opts: Omit<ProgressOverlayState, "visible" | "progress"> & { progress?: number }) => {
    setState({
      visible: true,
      title: opts.title,
      description: opts.description,
      progress: opts.progress ?? -1,
      cancelable: opts.cancelable ?? false,
      variant: opts.variant ?? "spinner",
    });
  };

  const update = (progress: number) => {
    setState((s) => ({ ...s, progress }));
  };

  const hide = () => {
    setState((s) => ({ ...s, visible: false }));
  };

  return (
    <ProgressOverlayContext.Provider value={{ state, show, update, hide }}>
      {children}
      <ProgressOverlayComponent state={state} onUpdate={update} onHide={hide} />
    </ProgressOverlayContext.Provider>
  );
}

export function useProgressOverlay(): ProgressOverlayContextValue {
  const ctx = React.useContext(ProgressOverlayContext);
  if (!ctx) throw new Error("useProgressOverlay must be used within a ProgressOverlayProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Visual component
// ---------------------------------------------------------------------------

function ProgressOverlayComponent({
  state,
  onUpdate,
  onHide,
}: {
  state: ProgressOverlayState;
  onUpdate: (p: number) => void;
  onHide: () => void;
}) {
  const [indeterminate, setIndeterminate] = useState(0);

  // Indeterminate animation when progress is -1
  useEffect(() => {
    if (state.progress >= 0) return;
    const interval = setInterval(() => {
      setIndeterminate((v) => (v >= 100 ? 0 : v + 2));
    }, 40);
    return () => clearInterval(interval);
  }, [state.progress]);

  const displayProgress = state.progress >= 0 ? state.progress : indeterminate;

  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[8000] flex items-center justify-center bg-[rgba(0,0,0,0.5)] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={state.title}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md mx-4 rounded-2xl border border-[var(--ring-strong)] bg-[var(--surface-elevated)] p-8 shadow-2xl"
          >
            {/* Icon area */}
            <div className="flex justify-center mb-6">
              <Loading
                variant={state.variant ?? "spinner"}
                size="lg"
                label=""
              />
            </div>

            {/* Title */}
            <h3 className="text-center text-base font-semibold text-[var(--text-primary)]">
              {state.title}
            </h3>

            {/* Description */}
            {state.description && (
              <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
                {state.description}
              </p>
            )}

            {/* Progress bar */}
            <div className="mt-6">
              <Progress
                value={displayProgress}
                className="h-2 rounded-full"
                indicatorClassName="shadow-[0_0_12px_var(--accent)]/50"
              />
              <div className="mt-2 flex justify-between text-xs text-[var(--text-secondary)]">
                <span>{state.progress >= 0 ? `${Math.round(state.progress)}%` : "处理中..."}</span>
                {state.progress >= 0 && <span>{Math.round(100 - state.progress)}% 剩余</span>}
              </div>
            </div>

            {/* Cancel button */}
            {state.cancelable && (
              <button
                onClick={onHide}
                className="mt-5 w-full py-2.5 text-sm font-medium text-[var(--text-secondary)] rounded-xl border border-[var(--ring-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                取消
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// useProgressOperation - convenience hook for long-running operations
// ---------------------------------------------------------------------------

/**
 * Wraps an async operation with automatic progress overlay management.
 *
 * Usage:
 *   const { run, isRunning } = useProgressOperation();
 *   await run(async (progress) => {
 *     // ... do work, call progress(percent)
 *   }, { title: "导入数据", description: "正在处理..." });
 */

export function useProgressOperation() {
  const overlay = useProgressOverlay();
  const [isRunning, setIsRunning] = useState(false);

  const run = async <T,>(
    operation: (updateProgress: (percent: number) => void) => Promise<T>,
    options: {
      title: string;
      description?: string;
      cancelable?: boolean;
      variant?: "spinner" | "dots" | "bars";
    }
  ): Promise<T | undefined> => {
    setIsRunning(true);
    overlay.show({
      title: options.title,
      description: options.description,
      cancelable: options.cancelable,
      variant: options.variant,
    });

    try {
      const result = await operation((p) => overlay.update(p));
      overlay.update(100);
      // Small delay so the user sees 100%
      await new Promise((r) => setTimeout(r, 500));
      return result;
    } catch (err) {
      console.error("Progress operation failed:", err);
      return undefined;
    } finally {
      overlay.hide();
      setIsRunning(false);
    }
  };

  return { run, isRunning };
}
