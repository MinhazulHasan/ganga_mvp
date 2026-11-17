import * as React from "react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  source?: React.ReactNode;
  tone?: "default" | "brand" | "normal" | "watch" | "warning" | "emergency";
  size?: "md" | "lg" | "xl";
  className?: string;
  children?: React.ReactNode;
}

/** Big-number tile. Use `tabular` numbers; put the provenance/source underneath. */
export function Stat({ label, value, sub, source, tone = "default", size = "lg", className, children }: StatProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn(
          "tabular font-semibold leading-none tracking-[-0.04em]",
          size === "md" && "text-[32px]",
          size === "lg" && "text-[44px] sm:text-[52px]",
          size === "xl" && "text-[56px] sm:text-[72px]",
          tone === "brand" && "text-brand",
          tone === "normal" && "text-normal",
          tone === "watch" && "text-watch",
          tone === "warning" && "text-warning",
          tone === "emergency" && "text-emergency"
        )}
      >
        {value}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-snug">{label}</div>
      {sub && <div className="mt-1 text-sm leading-relaxed text-muted">{sub}</div>}
      {source && <div className="mt-2 text-xs text-subtle">{source}</div>}
      {children}
    </div>
  );
}
