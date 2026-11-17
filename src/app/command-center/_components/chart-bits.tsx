"use client";

import * as React from "react";

/** Small rounded tooltip card for Recharts: value first, label second (dataviz rule). */
export function ChartTip({
  active,
  rows,
  title,
}: {
  active?: boolean;
  title?: React.ReactNode;
  rows: { key: string; value: React.ReactNode; label: React.ReactNode; color?: string }[];
}) {
  if (!active || !rows.length) return null;
  return (
    <div className="min-w-[132px] rounded-[12px] border border-border bg-surface/95 px-3 py-2 text-[12px] shadow-float backdrop-blur-xl">
      {title && <p className="mb-1 font-mono text-[11px] text-subtle tabular">{title}</p>}
      {rows.map((r) => (
        <p key={r.key} className="flex items-center gap-2">
          {r.color && <span className="h-[2px] w-3 rounded-full" style={{ background: r.color }} aria-hidden />}
          <span className="font-semibold tabular text-foreground">{r.value}</span>
          <span className="text-muted">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

export const AXIS_TICK = { fontSize: 11, fill: "var(--subtle)" } as const;
