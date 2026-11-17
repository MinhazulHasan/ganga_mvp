"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { usePrefersReducedMotion } from "./hooks";

/**
 * Fade + rise into view once (same feel as the shared `Reveal`).
 * Hydration-safe: the server and the first client render always agree; a reduced-motion
 * preference is applied right after hydration and shows the content at once, in or out of view.
 */
export function Appear({
  delay = 0,
  y = 10,
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "initial" | "animate" | "whileInView" | "viewport" | "transition"> & { delay?: number; y?: number }) {
  const reduce = usePrefersReducedMotion();
  const motionProps: HTMLMotionProps<"div"> = reduce
    ? { animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" },
        transition: { type: "spring", stiffness: 260, damping: 30, delay },
      };
  return (
    <motion.div data-appear="" className={className} initial={{ opacity: 0, y }} {...motionProps} {...props}>
      {children}
    </motion.div>
  );
}
