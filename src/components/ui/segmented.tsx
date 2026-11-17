"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/** iOS-style segmented control with a sliding thumb. */
function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  ...rest
}: SegmentedProps<T>) {
  const id = React.useId();
  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-[12px] bg-surface-2 p-[3px] hairline",
        size === "sm" ? "h-8" : "h-9.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "relative z-0 inline-flex h-full flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 font-medium outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:opacity-40 [&_svg]:size-3.5",
              size === "sm" ? "text-xs" : "text-[13px]",
              active ? "text-foreground" : "text-muted hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-thumb-${id}`}
                className="absolute inset-0 -z-10 rounded-[9px] bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] dark:bg-surface-3"
                transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.8 }}
              />
            )}
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export { Segmented };
