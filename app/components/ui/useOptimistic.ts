"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OptimisticState<T> {
  /** The current value shown in the UI */
  value: T;
  /** Whether an update is in-flight */
  isPending: boolean;
  /** Whether the last mutation failed */
  error: Error | null;
}

interface UseOptimisticOptions<T> {
  /** Server-side mutation function. Return the updated value. */
  mutation: (prev: T, payload: unknown) => Promise<T>;
  /** Optional rollback function if mutation fails */
  onRollback?: (error: Error, payload: unknown) => void;
  /** Optional callback after success */
  onSuccess?: (value: T, payload: unknown) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Implements optimistic UI updates.
 *
 * Usage:
 *   const { value, mutate, isPending, error } = useOptimistic(initialValue, {
 *     mutation: async (prev, payload) => {
 *       // compute new value
 *       // call API
 *       return newValue;
 *     },
 *   });
 *
 *   // Call:
 *   mutate((prev) => ({ ...prev, read: true }), { id: 123 });
 */

export function useOptimistic<T>(
  initialValue: T,
  options: UseOptimisticOptions<T>
): OptimisticState<T> & { mutate: (updater: (prev: T) => T, payload?: unknown) => void } {
  const [state, setState] = useState<OptimisticState<T>>({
    value: initialValue,
    isPending: false,
    error: null,
  });

  const inFlightRef = useRef<{ optimistic: T; payload: unknown } | null>(null);

  const mutate = useCallback(
    (updater: (prev: T) => T, payload?: unknown) => {
      setState((prev) => {
        const optimistic = updater(prev.value);
        inFlightRef.current = { optimistic, payload };
        return { value: optimistic, isPending: true, error: null };
      });

      // Fire the actual mutation
      const prev = state.value;
      options
        .mutation(prev, payload)
        .then((newValue) => {
          setState({ value: newValue, isPending: false, error: null });
          options.onSuccess?.(newValue, payload);
          inFlightRef.current = null;
        })
        .catch((err) => {
          // Rollback
          if (inFlightRef.current) {
            setState({
              value: prev,
              isPending: false,
              error: err,
            });
            options.onRollback?.(err, inFlightRef.current.payload);
            inFlightRef.current = null;
          }
        });
    },
    [state.value, options]
  );

  return { value: state.value, isPending: state.isPending, error: state.error, mutate };
}

// ---------------------------------------------------------------------------
// useDebouncedValue - for search inputs with optimistic feedback
// ---------------------------------------------------------------------------

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ---------------------------------------------------------------------------
// useAsyncOperation - generic async state management
// ---------------------------------------------------------------------------

export function useAsyncOperation<TArgs, TResult>(
  operation: (args: TArgs) => Promise<TResult>
) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (args: TArgs) => {
      setIsRunning(true);
      setError(null);
      try {
        const res = await operation(args);
        setResult(res);
        return res;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [operation]
  );

  return { execute, isRunning, result, error };
}
