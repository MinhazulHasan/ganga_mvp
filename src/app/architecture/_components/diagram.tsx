"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Provenance, type ProvenanceKind } from "@/components/brand/provenance";
import { useDetailSheet, type Detail } from "@/app/_components/overview/detail-sheet";
import { cn } from "@/lib/utils";

/** White card that holds an SVG diagram. Scrolls sideways on narrow phones instead of shrinking the text. */
export function DiagramCard({
  label,
  provenance,
  provenanceTip,
  controls,
  footer,
  minWidth = 520,
  className,
  children,
}: {
  label: string;
  provenance?: ProvenanceKind;
  provenanceTip?: string;
  controls?: React.ReactNode;
  footer?: React.ReactNode;
  minWidth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</p>
          {provenance && <Provenance kind={provenance} tip={provenanceTip} />}
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <div className="px-3 py-4 sm:px-5" style={{ minWidth }}>
          {children}
        </div>
      </div>
      <p className="-mt-1 px-5 pb-3 text-[11.5px] text-subtle sm:hidden">Swipe sideways for the whole diagram</p>
      {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
    </Card>
  );
}

/** An SVG group that behaves like a button: click or Enter opens the detail sheet. */
export function SvgHit({
  detail,
  label,
  onHover,
  className,
  children,
}: {
  detail: Detail;
  label: string;
  onHover?: (on: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const show = useDetailSheet();
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-haspopup="dialog"
      className={cn("cursor-pointer outline-none [&:focus-visible>*:first-child]:stroke-ring", className)}
      onClick={() => show(detail)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          show(detail);
        }
      }}
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
    >
      {children}
    </g>
  );
}

/** Small label used inside diagrams (keeps font settings in one place). */
export function SvgText({
  x,
  y,
  children,
  className,
  anchor = "start",
  size = 11,
  weight = 500,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  className?: string;
  anchor?: "start" | "middle" | "end";
  size?: number;
  weight?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} className={cn("fill-muted", className)} style={{ fontFamily: "var(--font-sans)" }}>
      {children}
    </text>
  );
}

/** Two-line text block for the left side of each section. */
export function PointBlock({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn("flex gap-3", className)}>
      <span className="mt-[9px] size-1.5 shrink-0 rounded-[2px] bg-foreground" aria-hidden />
      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}
