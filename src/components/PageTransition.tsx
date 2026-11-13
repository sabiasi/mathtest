"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Pages fade in (and rise 6px) when they appear. Fast and subtle: 220 ms.
 * With "reduce motion" switched on, only the fade remains (MotionConfig).
 * Print CSS forces it fully visible, so paper is never half-faded.
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      data-page-transition=""
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}
