"use client";

import * as React from "react";
import { MountainSnowIcon } from "lucide-react";
import {
  frontKmAt,
  frontSpeedMsAtKm,
  nodeStatusAt,
  villageStatusAt,
  type NodeStatus,
  type RunResult,
  type VillageStatus,
} from "@/lib/engine";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { select } from "./sim-actions";
import { clock, fmtDurationShort, shortName } from "./format";
import { countdown } from "./derive";
import { nodeStatusLabel, PanelHeader, villageStatusLabel } from "./bits";
import { CORRIDOR_H, CORRIDOR_MIN_W, corridorGeometry, type CorridorGeo } from "./corridor-geometry";
import { useElementSize } from "./use-element-width";

const svgId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, "");

export function RiverCorridor({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  const [measureRef, size] = useElementSize<HTMLDivElement>({ width: 900, height: CORRIDOR_H });
  const W = Math.max(size.width, CORRIDOR_MIN_W);
  const H = Math.max(size.height, CORRIDOR_H);
  const geo = React.useMemo(() => corridorGeometry(s, W, H), [s, W, H]);
  const uid = svgId(React.useId());

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <PanelHeader
        title="River corridor"
        description={`${s.river} · ${s.region} · source at the left, ${geo.kmMax} km downstream`}
        right={<FrontReadout run={run} />}
      />
      <div ref={measureRef} className="relative mt-3 min-h-[330px] flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-none">
        {/* Static terrain in its own SVG: it never repaints while the flood and pulses animate above it. */}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: CORRIDOR_MIN_W }} className="absolute left-0 top-0 block h-full w-full" aria-hidden>
          <CorridorBackdrop geo={geo} run={run} uid={uid} />
        </svg>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ minWidth: CORRIDOR_MIN_W }}
          className="absolute left-0 top-0 block h-full w-full select-none [will-change:transform]"
          role="group"
          aria-label={`River corridor of the ${s.river}: ${run.nodes.length} RTUs, ${run.villages.length} villages and a threshold gauge at ${s.gaugeKm} km.`}
        >
          <FloodLayer geo={geo} run={run} uid={uid} />
          <SourceMarker geo={geo} run={run} />
          <GaugeMarker geo={geo} run={run} />
          <NodesLayer geo={geo} run={run} />
          <VillagesLayer geo={geo} run={run} />
        </svg>
      </div>
      <Legend />
    </Card>
  );
}

/* ---------------------------------------------------------------- header readout */

function FrontReadout({ run }: { run: RunResult }) {
  const s = run.scenario;
  const km = useSim((st) => Math.round(Math.min(frontKmAt(s, st.t), 999) * 10) / 10);
  const started = km > 0;
  const speed = frontSpeedMsAtKm(s, Math.max(km, 0.01));
  return (
    <div
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full px-3 text-[12px] font-medium tabular transition-colors",
        started ? "bg-[var(--flood-soft)] text-[var(--flood-ink)]" : "bg-surface-2 text-muted"
      )}
    >
      <span className={cn("size-2 rounded-full", started ? "bg-[var(--flood)]" : "bg-border-strong")} aria-hidden />
      {started ? (
        <>
          Flood front {km.toFixed(1)} km <span className="opacity-50">·</span> ≈ {speed.toFixed(speed >= 10 ? 0 : 1)} m/s
        </>
      ) : (
        "No flood yet"
      )}
    </div>
  );
}

function Legend() {
  const item = "inline-flex items-center gap-1.5";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-5 py-3 text-[12px] text-muted">
      <span className={item}>
        <svg width="12" height="10" aria-hidden>
          <path d="M6 1 L11 9 H1 Z" className="fill-surface stroke-[var(--subtle)]" strokeWidth="1.3" />
        </svg>
        Mountain booster
      </span>
      <span className={item}>
        <span className="size-2.5 rounded-full border-2 border-normal-fill bg-surface" aria-hidden />
        RTU
      </span>
      <span className={item}>
        <span className="size-2.5 rounded-full border-2 border-emergency bg-emergency-soft" aria-hidden />
        Silent = evidence
      </span>
      <span className={item}>
        <span className="size-2 rotate-45 border-[1.5px] border-foreground bg-surface" aria-hidden />
        Threshold gauge
      </span>
      <span className={item}>
        <span className="size-2.5 rounded-full bg-watch-fill" aria-hidden />
        Warned village
      </span>
      <span className={item}>
        <span className="h-1.5 w-4 rounded-full bg-[var(--flood)]" aria-hidden />
        Flood
      </span>
      <span className="ml-auto hidden text-subtle md:inline">Click an RTU or village for details</span>
      <span className="w-full text-subtle md:hidden">Swipe sideways for the whole valley · tap an RTU or village for details</span>
    </div>
  );
}

/* ---------------------------------------------------------------- static backdrop */

const CorridorBackdrop = React.memo(function CorridorBackdrop({ geo, run, uid }: { geo: CorridorGeo; run: RunResult; uid: string }) {
  const s = run.scenario;
  const { W, x0, x1, xOf, yOf, yRiver, axisY } = geo;
  const sourceLabel = s.arrival[0]?.label.split(" · ")[0] ?? "Source";
  // River name sits in the widest gap between labelled markers (nodes and the gauge).
  const marks = [...s.nodesKm, s.gaugeKm].sort((a, b) => a - b);
  let labelKm = geo.kmMax * 0.4;
  let widest = 0;
  for (let i = 1; i < marks.length; i++) {
    if (marks[i] - marks[i - 1] > widest) {
      widest = marks[i] - marks[i - 1];
      labelKm = (marks[i] + marks[i - 1]) / 2 + 1.5;
    }
  }
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" x2="0" y1="0" y2={yRiver} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--sky)" }} />
          <stop offset="1" style={{ stopColor: "var(--surface)" }} />
        </linearGradient>
        {geo.ridges.map((r, i) => (
          <linearGradient key={r.id} id={`${uid}-r-${r.id}`} x1="0" x2="0" y1="10" y2={yRiver + 6} gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: `var(--mtn-${i + 1})` }} />
            <stop offset="0.7" style={{ stopColor: `var(--mtn-${i + 1})`, stopOpacity: 0.8 }} />
            <stop offset="1" style={{ stopColor: `var(--mtn-${i + 1})`, stopOpacity: 0 }} />
          </linearGradient>
        ))}
        <clipPath id={`${uid}-snow`}>
          <path d={geo.snowClip} />
        </clipPath>
        <linearGradient id={`${uid}-snowfill`} x1="0" x2="0" y1={geo.snowTop} y2={geo.snowBottom} gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--snow)" }} />
          <stop offset="0.65" style={{ stopColor: "var(--snow)", stopOpacity: 0.85 }} />
          <stop offset="1" style={{ stopColor: "var(--snow)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      {/* sky + terrain */}
      <rect x="0" y="0" width={W} height={yRiver} fill={`url(#${uid}-sky)`} />
      {geo.ridges.map((r) => (
        <g key={r.id}>
          <path d={r.d} fill={`url(#${uid}-r-${r.id})`} />
          {r.id === "far" && <path d={r.d} clipPath={`url(#${uid}-snow)`} fill={`url(#${uid}-snowfill)`} />}
          <path d={r.line} fill="none" style={{ stroke: "var(--ridge)" }} strokeWidth={1} strokeLinejoin="round" opacity={r.id === "far" ? 1 : 0.7} />
        </g>
      ))}

      {/* valley floor + calm river */}
      <path d={geo.river} fill="none" style={{ stroke: "var(--river-soft)" }} strokeWidth={30} strokeLinecap="round" />
      <path d={geo.river} fill="none" style={{ stroke: "var(--river)" }} strokeWidth={3.2} strokeLinecap="round" />
      <text x={xOf(labelKm)} y={yOf(xOf(labelKm)) - 13} className="fill-subtle text-[10.5px] italic" textAnchor="middle">
        {s.river}
      </text>

      {/* source */}
      <path
        d={`M${x0 - 40} ${yRiver - 92} Q ${x0 - 30} ${yRiver - 40} ${x0} ${yOf(x0)}`}
        fill="none"
        style={{ stroke: "var(--river)" }}
        strokeWidth={1.6}
        strokeDasharray="2 4"
        strokeLinecap="round"
        opacity={0.8}
      />
      <text x={x0} y={yRiver + 34} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
        {sourceLabel}
      </text>
      <text x={x0} y={yRiver + 48} textAnchor="middle" className="fill-subtle font-mono text-[10px]">
        {clock(s, 0).slice(0, 5)} · km 0
      </text>

      {/* distance scale */}
      <line x1={x0} x2={x1} y1={axisY} y2={axisY} style={{ stroke: "var(--border-strong)" }} strokeWidth={1} />
      {geo.kmTicks.map((tk, i) => (
        <g key={tk.km}>
          <line x1={tk.x} x2={tk.x} y1={axisY} y2={axisY + 4} style={{ stroke: "var(--border-strong)" }} strokeWidth={1} />
          <text
            x={tk.x}
            y={axisY + 17}
            textAnchor={i === 0 ? "start" : i === geo.kmTicks.length - 1 ? "end" : "middle"}
            className="fill-subtle font-mono text-[10px]"
          >
            {i === geo.kmTicks.length - 1 ? `${tk.km} km` : tk.km}
          </text>
        </g>
      ))}
    </g>
  );
});

/* ---------------------------------------------------------------- flood front */

function FloodLayer({ geo, run, uid }: { geo: CorridorGeo; run: RunResult; uid: string }) {
  const s = run.scenario;
  const km = useSim((st) => frontKmAt(s, st.t));
  if (km <= 0.02) return null;
  const xf = geo.xOf(km);
  const yf = geo.yOf(xf);
  const done = km >= geo.kmMax;
  return (
    <g aria-hidden>
      <defs>
        <clipPath id={`${uid}-flood`}>
          <rect x={0} y={0} width={xf} height={geo.H} />
        </clipPath>
        <linearGradient id={`${uid}-fbody`} x1={geo.x0} x2={Math.max(xf, geo.x0 + 1)} y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--flood)" }} />
          <stop offset="0.72" style={{ stopColor: "var(--flood)" }} />
          <stop offset="1" style={{ stopColor: "var(--flood-hi)" }} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" style={{ stopColor: "var(--flood-hi)", stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: "var(--flood-hi)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${uid}-flood)`}>
        <path d={geo.river} fill="none" style={{ stroke: "var(--flood-hi)" }} strokeOpacity={0.16} strokeWidth={24} strokeLinecap="round" />
        <path d={geo.river} fill="none" stroke={`url(#${uid}-fbody)`} strokeWidth={8} strokeLinecap="round" />
        <path
          d={geo.river}
          fill="none"
          stroke="white"
          strokeOpacity={0.55}
          strokeWidth={2}
          strokeDasharray="2 10"
          strokeLinecap="round"
          className="animate-flow"
        />
      </g>
      {!done && (
        <g>
          <circle cx={xf} cy={yf} r={20} fill={`url(#${uid}-glow)`} />
          <circle cx={xf} cy={yf} r={6} style={{ fill: "var(--flood-hi)", stroke: "var(--surface)" }} strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

/* ---------------------------------------------------------------- source (above the flood) */

function SourceMarker({ geo, run }: { geo: CorridorGeo; run: RunResult }) {
  const s = run.scenario;
  const x = geo.x0;
  const y = geo.yOf(x);
  return (
    <g>
      <title>{`${s.arrival[0]?.label ?? "Source"} — km 0, where the flood starts`}</title>
      <circle cx={x} cy={y} r={14} className="fill-surface stroke-border-strong" strokeWidth={1.2} />
      <MountainSnowIcon x={x - 8} y={y - 8} width={16} height={16} className="text-foreground" strokeWidth={1.8} />
    </g>
  );
}

/* ---------------------------------------------------------------- gauge */

function GaugeMarker({ geo, run }: { geo: CorridorGeo; run: RunResult }) {
  const s = run.scenario;
  const crossed = useSim((st) => st.t >= run.gauge.crossMin);
  const x = geo.xOf(run.gauge.km);
  const y = geo.yOf(x);
  return (
    <g>
      <title>{`Threshold gauge at ${run.gauge.km} km · flood crosses at ${clock(s, run.gauge.crossMin)}`}</title>
      <line x1={x} x2={x} y1={y - 9} y2={geo.yRiver - 26} style={{ stroke: "var(--border-strong)" }} strokeWidth={1} />
      <rect
        x={x - 6}
        y={y - 6}
        width={12}
        height={12}
        rx={2}
        transform={`rotate(45 ${x} ${y})`}
        style={{ fill: crossed ? "var(--warning-fill)" : "var(--surface)", stroke: "var(--foreground)" }}
        strokeWidth={1.6}
      />
      <text x={x} y={geo.yRiver - 44} textAnchor="middle" className="fill-foreground text-[10.5px] font-semibold">
        Threshold gauge
      </text>
      <text x={x} y={geo.yRiver - 31} textAnchor="middle" className="fill-subtle font-mono text-[10px]">
        {crossed && run.gauge.warnMin !== null ? `warns ${clock(s, run.gauge.warnMin).slice(0, 5)}` : `${run.gauge.km} km`}
      </text>
    </g>
  );
}

/* ---------------------------------------------------------------- nodes */

function NodesLayer({ geo, run }: { geo: CorridorGeo; run: RunResult }) {
  const key = useSim((st) => run.nodes.map((n) => nodeStatusAt(n, st.t)).join("|"));
  const statuses = key.split("|") as NodeStatus[];
  // The most recently silenced node carries the full "silent = evidence" tag.
  let latestSilent = -1;
  statuses.forEach((st, i) => {
    if (st === "silent") latestSilent = i;
  });
  return (
    <g>
      {run.nodes.map((n, i) => (
        <SensorNode key={n.id} geo={geo} run={run} index={i} status={statuses[i]} tag={i === latestSilent} />
      ))}
    </g>
  );
}

const NODE_RING: Record<NodeStatus, string> = {
  alive: "var(--normal-fill)",
  anomaly: "var(--warning-fill)",
  "destroyed-unseen": "var(--warning-fill)",
  silent: "var(--emergency)",
};

function SensorNode({ geo, run, index, status, tag }: { geo: CorridorGeo; run: RunResult; index: number; status: NodeStatus; tag: boolean }) {
  const n = run.nodes[index];
  const x = geo.xOf(n.km);
  const y = geo.yOf(x);
  const yr = geo.yRelay;
  const silent = status === "silent";
  const open = () => select({ kind: "node", id: n.id });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g
          role="button"
          tabIndex={0}
          aria-label={`${n.name} (${n.id}) at ${n.km} km — ${nodeStatusLabel(status)}. Open details.`}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          className="group cursor-pointer outline-none"
        >
          {/* mountain booster + LoRa link (only where a peak blocks the line of sight) */}
          {n.booster && (
            <path
              d={`M${x} ${yr - 6} L${x + 6.5} ${yr + 5} L${x - 6.5} ${yr + 5} Z`}
              style={{ fill: "var(--surface)", stroke: "var(--subtle)" }}
              strokeWidth={1.3}
              strokeLinejoin="round"
            />
          )}
          {n.booster && !silent && (
            <line
              x1={x}
              x2={x}
              y1={yr + 9}
              y2={y - 10}
              style={{ stroke: status === "alive" ? "var(--subtle)" : "var(--warning-fill)" }}
              strokeWidth={1.3}
              strokeDasharray="1 4"
              strokeLinecap="round"
            />
          )}
          {/* hit area + hover / focus halo */}
          <rect x={x - 16} y={yr - 10} width={32} height={y - yr + 26} fill="transparent" />
          <circle cx={x} cy={y} r={12.5} className="fill-surface-2 opacity-0 transition-opacity group-hover:opacity-100" />
          <circle cx={x} cy={y} r={13} fill="none" className="stroke-ring opacity-0 group-focus-visible:opacity-100" strokeWidth={2.5} />

          {status === "anomaly" && (
            <circle
              cx={x}
              cy={y}
              r={7}
              fill="none"
              style={{ stroke: "var(--warning-fill)" }}
              strokeWidth={2}
              className="animate-pulse-ring [transform-box:fill-box] [transform-origin:center]"
            />
          )}
          <circle
            cx={x}
            cy={y}
            r={7}
            style={{ fill: silent ? "var(--emergency-soft)" : "var(--surface)", stroke: NODE_RING[status] }}
            strokeWidth={silent ? 2.4 : 2.2}
            strokeDasharray={status === "destroyed-unseen" ? "3 2.4" : undefined}
          />
          {silent ? (
            <path
              d={`M${x - 2.6} ${y - 2.6} L${x + 2.6} ${y + 2.6} M${x + 2.6} ${y - 2.6} L${x - 2.6} ${y + 2.6}`}
              style={{ stroke: "var(--emergency)" }}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          ) : (
            status !== "destroyed-unseen" && <circle cx={x} cy={y} r={2.4} style={{ fill: NODE_RING[status] }} />
          )}

          <text x={x + 9} y={geo.yRiver - 18} className="fill-foreground text-[11px] font-semibold">
            {n.id}
          </text>
          {silent && tag && (
            <g>
              <rect x={x - 46} y={yr + 16} width={92} height={19} rx={9.5} style={{ fill: "var(--emergency-soft)" }} />
              <text x={x} y={yr + 29} textAnchor="middle" className="fill-emergency text-[10.5px] font-semibold">
                silent = evidence
              </text>
            </g>
          )}
        </g>
      </TooltipTrigger>
      <TooltipContent>
        {n.name} · {n.km} km · {nodeStatusLabel(status)}
      </TooltipContent>
    </Tooltip>
  );
}

/* ---------------------------------------------------------------- villages */

function VillagesLayer({ geo, run }: { geo: CorridorGeo; run: RunResult }) {
  // Re-render only when a status changes or a countdown ticks over (whole minutes, 5 s under a minute).
  const key = useSim((st) =>
    run.villages
      .map((v) => {
        const status = villageStatusAt(v, st.t);
        return status === "warned" ? `${status}:${countdown(v.arrivalMin - st.t)}` : status;
      })
      .join("|")
  );
  const parts = key.split("|").map((k) => k.split(":"));
  return (
    <g>
      {run.villages.map((v, i) => (
        <VillagePin key={v.id} geo={geo} run={run} index={i} status={parts[i][0] as VillageStatus} minutesLeft={Number(parts[i][1] ?? 0)} />
      ))}
    </g>
  );
}

function VillagePin({
  geo,
  run,
  index,
  status,
  minutesLeft,
}: {
  geo: CorridorGeo;
  run: RunResult;
  index: number;
  status: VillageStatus;
  minutesLeft: number;
}) {
  const s = run.scenario;
  const v = run.villages[index];
  const x = geo.xOf(v.km);
  const y = geo.yOf(x);
  const yp = geo.yPin;
  const open = () => select({ kind: "village", id: v.id });
  const fill = status === "flooded" ? "var(--flood)" : status === "warned" ? "var(--watch-fill)" : "var(--surface)";
  const sub =
    status === "flooded" ? `at ${clock(s, v.arrivalMin).slice(0, 5)}` : status === "warned" ? `in ${fmtDurationShort(minutesLeft)}` : `${v.km} km`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g
          role="button"
          tabIndex={0}
          aria-label={`${v.name}, ${v.km} km — ${villageStatusLabel(status)}. Open details.`}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          className="group cursor-pointer outline-none"
        >
          <rect x={x - 30} y={y + 4} width={60} height={yp - y + 44} fill="transparent" />
          <line x1={x} x2={x} y1={y + 5} y2={yp - 8} style={{ stroke: "var(--border-strong)" }} strokeWidth={1} />
          <circle cx={x} cy={yp} r={12} className="fill-surface-2 opacity-0 transition-opacity group-hover:opacity-100" />
          <circle cx={x} cy={yp} r={12.5} fill="none" className="stroke-ring opacity-0 group-focus-visible:opacity-100" strokeWidth={2.5} />
          {status === "warned" && (
            <circle
              cx={x}
              cy={yp}
              r={6.5}
              fill="none"
              style={{ stroke: "var(--watch-fill)" }}
              strokeWidth={2}
              className="animate-pulse-ring [transform-box:fill-box] [transform-origin:center]"
            />
          )}
          <circle
            cx={x}
            cy={yp}
            r={6.5}
            style={{ fill, stroke: status === "normal" ? "var(--border-strong)" : "var(--surface)" }}
            strokeWidth={status === "normal" ? 1.5 : 2}
          />
          {status === "normal" && <circle cx={x} cy={yp} r={2.2} style={{ fill: "var(--subtle)" }} />}
          <text x={geo.villageLabelX[index]} y={yp + 23} textAnchor="middle" className="fill-foreground text-[11.5px] font-semibold">
            {shortName(v.name)}
          </text>
          <text
            x={geo.villageLabelX[index]}
            y={yp + 37}
            textAnchor="middle"
            className={cn(
              "text-[10.5px] tabular",
              status === "warned" ? "fill-watch font-medium" : status === "flooded" ? "fill-[var(--flood-ink)] font-medium" : "fill-subtle"
            )}
          >
            {sub}
          </text>
        </g>
      </TooltipTrigger>
      <TooltipContent>
        {v.name} · {v.km} km · flood at {clock(s, v.arrivalMin)}
      </TooltipContent>
    </Tooltip>
  );
}
