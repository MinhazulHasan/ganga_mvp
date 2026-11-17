import * as React from "react";
import { cn } from "@/lib/utils";
import { STATE_META, type AlertState } from "@/lib/alert-state";

interface StatePillProps {
  state: AlertState;
  size?: "sm" | "md" | "lg";
  /** Show the pulsing live dot (use for the current state). */
  live?: boolean;
  className?: string;
}

/** Alert state chip. Always icon + label, never colour alone. */
export function StatePill({ state, size = "md", live = false, className }: StatePillProps) {
  const m = STATE_META[state];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-[0.04em]",
        m.soft,
        m.text,
        size === "sm" && "h-6 px-2.5 text-[11px] [&_svg]:size-3.5",
        size === "md" && "h-7 px-3 text-xs [&_svg]:size-3.5",
        size === "lg" && "h-10 px-4 text-sm [&_svg]:size-4.5",
        className
      )}
    >
      {live ? (
        <span className="relative flex size-2">
          <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", m.fill)} />
          <span className={cn("relative size-2 rounded-full", m.fill)} />
        </span>
      ) : (
        <Icon aria-hidden />
      )}
      {m.short}
    </span>
  );
}
