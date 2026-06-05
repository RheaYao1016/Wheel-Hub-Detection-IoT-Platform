"use client";

import { ReactNode, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MobileBottomNav } from "./MobileBottomNav";
import {
  useSwipe,
  usePullToRefresh,
  useSwipeBack,
} from "@/lib/hooks/use-mobile-gestures";

export default function MobileGestureProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Trigger a router refresh to reload the current page data
    router.refresh();
    // Simulate minimum refresh time for UX
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRefreshing(false);
  }, [router]);

  // Swipe-back handler
  const handleSwipeBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    }
  }, []);

  // Initialize pull-to-refresh
  const { isRefreshing, pullProgress } = usePullToRefresh(handleRefresh, 80);

  // Initialize swipe-back gesture
  const { isSwipeBackActive } = useSwipeBack({
    edgeThreshold: 25,
    swipeThreshold: 100,
  });

  // Initialize swipe gestures
  useSwipe({
    onSwipeLeft: undefined, // Reserved for future use
    onSwipeRight: pathname !== "/home" ? handleSwipeBack : undefined,
    threshold: 80,
  });

  return (
    <>
      {/* Pull-to-refresh indicator */}
      <div
        className={`pull-refresh-indicator ${
          pullProgress > 0 || isRefreshing ? "visible" : ""
        }`}
        style={{
          transform: `translateX(-50%) translateY(${
            pullProgress > 0 ? `${Math.min(pullProgress * 30, 30)}px` : "-100%"
          })`,
        }}
      >
        {isRefreshing ? (
          <>
            <svg className="pull-refresh-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            <span>Refreshing...</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <span>Pull to refresh</span>
          </>
        )}
      </div>

      {/* Swipe-back indicator */}
      <div
        className={`swipe-back-indicator ${isSwipeBackActive ? "active" : ""}`}
      />

      {/* Refreshing overlay */}
      {isRefreshing && (
        <div className="mobile-refreshing-overlay">
          <div className="loading-spinner" />
        </div>
      )}

      {children}

      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </>
  );
}
