"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export default function PageTransitionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }
    setIsTransitioning(true);
    const timeout = window.setTimeout(() => setIsTransitioning(false), reduceMotion ? 160 : 680);
    return () => window.clearTimeout(timeout);
  }, [hasMounted, pathname, reduceMotion]);

  return (
    <>
      <motion.div
        aria-hidden
        className="route-transition-progress"
        initial={false}
        animate={
          isTransitioning
            ? { opacity: [0, 1, 0], scaleX: [0.08, 1, 1.06] }
            : { opacity: 0, scaleX: 0.08 }
        }
        transition={{ duration: reduceMotion ? 0.18 : 0.62, ease: [0.22, 1, 0.36, 1] }}
        style={{ originX: 0 }}
      />
      <div aria-hidden className={`route-transition-glow ${isTransitioning ? "route-transition-glow-active" : ""}`} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          className="route-motion-shell"
          initial={false}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 1.008, filter: "blur(8px)" }}
          transition={{ duration: reduceMotion ? 0.16 : 0.44, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
