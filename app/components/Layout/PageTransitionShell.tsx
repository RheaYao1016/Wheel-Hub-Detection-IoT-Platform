"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export default function PageTransitionShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [currentKey, setCurrentKey] = useState(pathname);
  const prevPathnameRef = useRef(pathname);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }

    if (pathname !== prevPathnameRef.current) {
      isNavigatingRef.current = true;
      prevPathnameRef.current = pathname;

      setIsTransitioning(true);

      const transitionTimeout = window.setTimeout(() => {
        setCurrentKey(pathname);
        isNavigatingRef.current = false;
      }, reduceMotion ? 50 : 100);

      const completeTimeout = window.setTimeout(() => {
        setIsTransitioning(false);
      }, reduceMotion ? 160 : 680);

      return () => {
        window.clearTimeout(transitionTimeout);
        window.clearTimeout(completeTimeout);
      };
    }
  }, [hasMounted, pathname, reduceMotion]);

  const handleAnimationComplete = useCallback(() => {
    if (!isNavigatingRef.current) {
      setIsTransitioning(false);
    }
  }, []);

  if (!hasMounted) {
    return <>{children}</>;
  }

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-[100] h-1 bg-gradient-to-r from-primary via-accent to-primary"
        initial={false}
        animate={
          isTransitioning
            ? { opacity: [0, 1, 0], scaleX: [0.08, 1, 1.06] }
            : { opacity: 0, scaleX: 0.08 }
        }
        transition={{
          duration: reduceMotion ? 0.18 : 0.62,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{ originX: 0 }}
        onAnimationComplete={handleAnimationComplete}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[99] bg-primary/5 opacity-0 transition-opacity duration-300"
        style={{ opacity: isTransitioning ? 1 : 0 }}
      />
      <div
        className="transition-opacity"
        style={{
          opacity: isTransitioning ? 0.7 : 1,
          transition: `opacity ${reduceMotion ? "160ms" : "440ms"} cubic-bezier(0.22, 1, 0.36, 1)`,
        }}
      >
        {children}
      </div>
    </>
  );
}
