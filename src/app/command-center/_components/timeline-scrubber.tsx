"use client";

import * as React from "react";
import { stateAt, type RunResult } from "@/lib/engine";
import { STATE_META, type AlertState } from "@/lib/alert-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { jumpTo, seek, seekBy, setScrubbing } from "./sim-actions";
import { clock, fromPos, shortName, toPos, tplus } from "./format";
import { useElementWidth } from "./use-element-width";

type Marker = {
  id: string;
  t: number;
  label: string;
  tip: string;
  row: "top" | "bottom";
  tone: AlertState | "gauge" | "village";
};

function buildMarkers(run: RunResult): Marker[] {
  const s = run.scenario;
  const out: Marker[] = [];
  for (const st of ["WATCH", "WARNING", "EMERGENCY"] as const) {
    const at = run.stateTimes[st];
    if (at !== undefined)
      out.push({ id: st, t: at, label: st, tip: `${st} · ${clock(s, at)} · ${tplus(at)}`, row: "top", tone: st });
  }
  if (run.gauge.warnMin !== null && run.gauge.warnMin <= s.durationMin)
    out.push({
      id: "gauge",
      t: run.gauge.warnMin,
      label: "GAUGE",
      tip: `Threshold gauge would warn · ${clock(s, run.gauge.warnMin)} · ${tplus(run.gauge.warnMin)}`,
      row: "top",
      tone: "gauge",
    });
  for (const v of run.villages) {
    if (v.arrivalMin > s.durationMin) continue;
    out.push({
      id: `v-${v.id}`,
      t: v.arrivalMin,
      label: shortName(v.name),
      tip: `Flood reaches ${v.name} · ${clock(s, v.arrivalMin)} · ${tplus(v.arrivalMin)}`,
      row: "bottom",
      tone: "village",
    });
  }
  return out;
}

type LabelAlign = "start" | "end";

/**
 * Greedy label placement. Labels sit to the right of their tick (or flip left at the end of
 * the track); a label that would collide is hidden — its tick and tooltip stay.
 */
function placeLabels(markers: Marker[], width: number, duration: number) {
  const visible = new Map<string, LabelAlign>();
  const GAP = 4;
  for (const row of ["top", "bottom"] as const) {
    const charW = row === "top" ? 6.2 : 6;
    const list = markers.filter((m) => m.row === row).sort((a, b) => a.t - b.t);
    const xs = list.map((m) => toPos(m.t, duration) * width);
    let right = -Infinity; // right edge of everything placed so far (labels and ticks)
    list.forEach((m, i) => {
      const x = xs[i];
      const textW = m.label.length * charW;
      const prevTick = i > 0 ? xs[i - 1] + GAP : -Infinity;
      const nextTick = i < list.length - 1 ? xs[i + 1] - GAP : Infinity;
      // A label may not cross a neighbour's tick or an earlier label.
      const startOk = x + 6 + textW < Math.min(nextTick, width) && x - 6 > right;
      const endOk = x - 6 - textW > Math.max(prevTick, right, 0) && x + 6 < nextTick;
      if (startOk) {
        visible.set(m.id, "start");
        right = x + 6 + textW + GAP;
      } else if (endOk) {
        visible.set(m.id, "end");
        right = x + 6 + GAP;
      } else {
        right = Math.max(right, x + 6);
      }
    });
  }
  return visible;
}

const TONE_TICK: Record<Marker["tone"], string> = {
  NORMAL: "bg-normal-fill",
  WATCH: "bg-watch-fill",
  WARNING: "bg-warning-fill",
  EMERGENCY: "bg-emergency-fill",
  gauge: "bg-foreground",
  village: "bg-[var(--flood)]",
};

/**
 * Replay scrubber on a square-root time scale, so the first minutes (when GANGA decides)
 * are wide enough to read. State changes sit above the track; flood arrivals below.
 */
export function TimelineScrubber({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  const D = s.durationMin;
  const t = useSim((st) => st.t);
  const [measureRef, width] = useElementWidth<HTMLDivElement>(900);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const dragging = React.useRef(false);
  const [hover, setHover] = React.useState<number | null>(null);

  const markers = React.useMemo(() => buildMarkers(run), [run]);
  const labels = React.useMemo(() => placeLabels(markers, width, D), [markers, width, D]);
  const snapTargets = React.useMemo(() => markers.map((m) => m.t), [markers]);

  // Elapsed range painted with the alert-state history (green → blue → amber → red).
  const segments = React.useMemo(() => {
    const st = run.stateTimes;
    const pts: { from: number; state: AlertState }[] = [{ from: 0, state: "NORMAL" }];
    for (const k of ["WATCH", "WARNING", "EMERGENCY"] as const) if (st[k] !== undefined) pts.push({ from: st[k]!, state: k });
    return pts.map((p, i) => ({ ...p, to: pts[i + 1]?.from ?? D }));
  }, [run, D]);

  const timeFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const p = (clientX - r.left) / r.width;
    let next = fromPos(p, D);
    // Snap to a marker within 6px so "exactly at WARNING" is easy to hit.
    for (const m of snapTargets) {
      if (Math.abs(toPos(m, D) * r.width - (clientX - r.left)) <= 6) next = m;
    }
    return next;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    dragging.current = true;
    setScrubbing(true);
    seek(timeFromClientX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setHover(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    if (dragging.current) seek(timeFromClientX(e.clientX));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setScrubbing(false);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 1 : 10 / 60;
    const k = e.key;
    if (k === "ArrowLeft" || k === "ArrowDown") seekBy(-big);
    else if (k === "ArrowRight" || k === "ArrowUp") seekBy(big);
    else if (k === "PageDown") seekBy(-5);
    else if (k === "PageUp") seekBy(5);
    else if (k === "Home") seek(0);
    else if (k === "End") seek(D);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const pos = toPos(t, D) * 100;
  const hoverT = hover === null ? null : fromPos(hover, D);
  const currentState = stateAt(run, t);
  // Changes only when the playhead passes a marker, so the (tooltip-heavy) marker rows stay memoised.
  const reachedKey = markers.map((m) => (m.t <= t ? "1" : "0")).join("");

  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <span className="hidden w-[38px] shrink-0 text-right font-mono text-[11px] text-subtle tabular sm:block">
        {clock(s, 0).slice(0, 5)}
      </span>
      <div ref={measureRef} className="relative h-[44px] min-w-0 flex-1">
        {/* top row: state changes + gauge */}
        <MarkerRow markers={markers} row="top" labels={labels} duration={D} reachedKey={reachedKey} />

        {/* track */}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Replay time"
          aria-valuemin={0}
          aria-valuemax={Math.round(D * 60)}
          aria-valuenow={Math.round(t * 60)}
          aria-valuetext={`${clock(s, t)}, ${tplus(t)}, ${currentState}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKeyDown}
          className="group absolute inset-x-0 top-[13px] h-[18px] cursor-pointer touch-none outline-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-surface-3">
            {segments.map((seg) => {
              const a = toPos(seg.from, D) * 100;
              const b = toPos(Math.min(seg.to, t), D) * 100;
              if (b <= a) return null;
              return (
                <div
                  key={seg.state}
                  className={cn("absolute inset-y-0", STATE_META[seg.state].fill)}
                  style={{ left: `${a}%`, width: `${b - a}%` }}
                />
              );
            })}
          </div>
          {/* ticks on the track */}
          {markers.map((m) => (
            <span
              key={m.id}
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1/2 h-[10px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full",
                m.t <= t ? "bg-surface/90" : "bg-border-strong"
              )}
              style={{ left: `${toPos(m.t, D) * 100}%` }}
            />
          ))}
          {/* hover time */}
          {hoverT !== null && (
            <span
              aria-hidden
              className="pointer-events-none absolute -top-[13px] z-10 -translate-x-1/2 whitespace-nowrap rounded-[7px] bg-foreground px-1.5 py-[3px] font-mono text-[10.5px] font-medium leading-none text-background shadow-float tabular"
              style={{ left: `${(hover ?? 0) * 100}%` }}
            >
              {clock(s, hoverT)} · {tplus(hoverT)}
            </span>
          )}
          {/* thumb */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/10 bg-white shadow-[0_1px_4px_rgb(0_0_0/0.22)] transition-[box-shadow] group-focus-visible:ring-[3px] group-focus-visible:ring-ring/60 dark:border-white/20"
            style={{ left: `${pos}%` }}
          >
            <span className={cn("absolute inset-[5px] rounded-full", STATE_META[currentState].fill)} />
          </span>
        </div>

        {/* bottom row: flood arrivals */}
        <MarkerRow markers={markers} row="bottom" labels={labels} duration={D} reachedKey={reachedKey} />
      </div>
      <span className="hidden w-[38px] shrink-0 font-mono text-[11px] text-subtle tabular sm:block">{clock(s, D).slice(0, 5)}</span>
    </div>
  );
}

const MarkerRow = React.memo(function MarkerRow({
  markers,
  row,
  labels,
  duration,
  reachedKey,
}: {
  markers: Marker[];
  row: "top" | "bottom";
  labels: Map<string, LabelAlign>;
  duration: number;
  /** one "0"/"1" per marker (same order as `markers`) */
  reachedKey: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 h-[12px]", row === "top" ? "top-0" : "bottom-0")}>
      {markers.map((m, i) => {
        if (m.row !== row) return null;
        const align = labels.get(m.id);
        const reached = reachedKey[i] === "1";
        return (
          <Tooltip key={m.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => jumpTo(m.t, m.row === "top" ? m.label : `the flood at ${m.label}`)}
                aria-label={`Jump to: ${m.tip}`}
                className={cn(
                  "pointer-events-auto absolute top-0 flex size-[12px] -translate-x-1/2 items-center justify-center rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  reached ? "text-foreground" : "text-subtle hover:text-muted"
                )}
                style={{ left: `${toPos(m.t, duration) * 100}%` }}
              >
                {row === "top" ? (
                  <span className={cn("h-[10px] w-[3px] rounded-full", TONE_TICK[m.tone], !reached && "opacity-50")} />
                ) : (
                  <span
                    className={cn(
                      "size-[8px] rounded-full border-[1.5px] border-[var(--flood)] transition-colors",
                      reached ? "bg-[var(--flood)]" : "bg-surface"
                    )}
                  />
                )}
                {align && (
                  <span
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-semibold leading-none transition-colors",
                      row === "top" ? "text-[9.5px] uppercase tracking-[0.03em]" : "text-[10px] tracking-[-0.005em]",
                      align === "start" ? "left-full ml-[1px]" : "right-full mr-[1px]"
                    )}
                  >
                    {m.label}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{m.tip}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
});
