"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

/**
 * Fade + rise into view once.
 * Server and first client render share the same initial state (no hydration mismatch);
 * with reduced motion the reveal is instant.
 */
export function Reveal({
  delay = 0,
  y = 10,
  className,
  children,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
