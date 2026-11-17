"use client";

import * as React from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "./network-state";

/**
 * Fade + rise into view once.
 * Hydration-safe variant of the shared Reveal: the server and the first client render
 * always produce the same initial style; reduced motion only changes the (non-rendered)
 * transition and shows the content immediately.
 */
export function Rise({
  children,
  className,
  delay = 0,
  y = 10,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      animate={reduce ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30, delay }}
    >
      {children}
    </motion.div>
  );
}
