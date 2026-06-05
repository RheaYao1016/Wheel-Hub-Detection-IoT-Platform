'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventDefault?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
}

/**
 * Mobile swipe gesture hook.
 * Supports left, right, up, down swipe detection with configurable threshold.
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 60,
  preventDefault = true,
}: UseSwipeOptions = {}) {
  const touchStart = useRef<TouchPosition | null>(null);
  const touchEnd = useRef<TouchPosition | null>(null);
  const isSwiping = useRef(false);

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchEnd.current = null;
    isSwiping.current = false;
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      if (touchStart.current && touchEnd.current) {
        const deltaX = Math.abs(touchStart.current.x - touchEnd.current.x);
        const deltaY = Math.abs(touchStart.current.y - touchEnd.current.y);

        if (deltaX > 10 || deltaY > 10) {
          isSwiping.current = true;
        }

        if (preventDefault && isSwiping.current) {
          e.preventDefault();
        }
      }
    },
    [preventDefault]
  );

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine primary swipe direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        } else if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        }
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
    isSwiping.current = false;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  useEffect(() => {
    const element = document.body;
    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);
}

/**
 * Pull-to-refresh hook for mobile.
 * Detects downward pull gesture at the top of the page.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void, threshold = 80) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0) {
      e.preventDefault();
      setPullProgress(Math.min(diff / threshold, 1));
    } else {
      isPulling.current = false;
      setPullProgress(0);
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullProgress >= 1 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch {
        // Silently handle refresh errors
      }
      setIsRefreshing(false);
    }
    setPullProgress(0);
  }, [pullProgress, isRefreshing, onRefresh]);

  useEffect(() => {
    const element = document.body;
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isRefreshing, pullProgress };
}

/**
 * Swipe-back navigation hook.
 * Detects right-swipe from the left edge for browser back navigation.
 */
export function useSwipeBack(
  options: { edgeThreshold?: number; swipeThreshold?: number } = {}
) {
  const { edgeThreshold = 25, swipeThreshold = 100 } = options;
  const [isSwipeBackActive, setIsSwipeBackActive] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const canSwipeBack = useRef(true);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;

      // Only allow swipe-back from left edge
      if (touch.clientX <= edgeThreshold && window.history.length > 1) {
        canSwipeBack.current = true;
        setIsSwipeBackActive(true);
      } else {
        canSwipeBack.current = false;
      }
    },
    [edgeThreshold]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!canSwipeBack.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);

    // Cancel if vertical scroll is dominant
    if (deltaY > 20) {
      canSwipeBack.current = false;
      setIsSwipeBackActive(false);
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!canSwipeBack.current) {
      setIsSwipeBackActive(false);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;

    if (deltaX > swipeThreshold) {
      window.history.back();
    }

    setIsSwipeBackActive(false);
    canSwipeBack.current = false;
  }, [swipeThreshold]);

  useEffect(() => {
    const element = document.body;
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isSwipeBackActive };
}

/**
 * Long press hook for mobile context menus.
 */
export function useLongPress(callback: (e: TouchEvent | MouseEvent) => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef<EventTarget | null>(null);

  const start = useCallback(
    (e: TouchEvent | MouseEvent) => {
      targetRef.current = e.target;
      timerRef.current = setTimeout(() => {
        if (targetRef.current === e.target) {
          callback(e);
        }
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cancel;
  }, [cancel]);

  return {
    onTouchStart: start,
    onTouchMove: cancel,
    onTouchEnd: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
}
