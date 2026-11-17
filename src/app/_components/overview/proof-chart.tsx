"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  type TooltipContentProps,
} from "recharts";
import { ChartLineIcon, TableIcon, TriangleAlertIcon } from "lucide-react";
import { STATE_META, type AlertState } from "@/lib/alert-state";
import { StatePill } from "@/components/brand/state-pill";
import { Provenance } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import type { Transition } from "./facts";
import { useMediaQuery } from "./hooks";

export type ChartPoint = { min: number; clock: string; level: number };
export type ChartState = { state: Transition; min: number; clock: string; rule: string };

type Props = {
  points: ChartPoint[];
  threshold: number;
  gaugeKm: number;
  crossing: { clock: string; min: number; level: number } | null;
  states: ChartState[];
  warn: { min: number; clock: string } | null;
  gaugeAlarm: { min: number; clock: string } | null;
  earlierBy: string | null;
  domainEnd: number;
  ticks: { min: number; label: string }[];
  note: string;
};

function stateAtMin(states: ChartState[], min: number): { state: AlertState; since: string | null } {
  let current: { state: AlertState; since: string | null } = { state: "NORMAL", since: null };
  for (const s of states) if (min >= s.min) current = { state: s.state, since: s.clock };
  return current;
}

export function ProofChart(props: Props) {
  const { points, threshold, states, note } = props;
  const [view, setView] = React.useState<"chart" | "table">("chart");
  const wide = useMediaQuery("(min-width: 640px)");

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">
            Downstream gauge, ~{props.gaugeKm} km below the source · 26 August
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" size="sm">
              Reconstructed · team deck
            </Badge>
            <Provenance kind="simulated" label="GANGA markers simulated" />
          </div>
        </div>
        <Segmented
          aria-label="Chart or table"
          size="sm"
          value={view}
          onValueChange={setView}
          options={[
            { value: "chart", label: "Chart", icon: <ChartLineIcon /> },
            { value: "table", label: "Table", icon: <TableIcon /> },
          ]}
        />
      </div>

      {view === "chart" ? (
        <div className="px-2 pb-4 pt-6 sm:px-5">
          <Legend threshold={threshold} />
          <figure className="mt-2" aria-label={`Gauge level from ${points[0]?.clock} to ${points[points.length - 1]?.clock}. ${note}`}>
            <ComposedChart
              responsive
              data={points}
              margin={{ top: 34, right: wide ? 18 : 8, bottom: 4, left: wide ? 4 : -12 }}
              style={{ width: "100%", height: wide ? 380 : 300 }}
              accessibilityLayer
            >
              <defs>
                <linearGradient id="gauge-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.12 }} />
                  <stop offset="100%" style={{ stopColor: "var(--chart-1)", stopOpacity: 0.01 }} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="min"
                domain={[0, props.domainEnd]}
                ticks={(wide ? props.ticks : props.ticks.filter((t) => t.min > 0)).map((t) => t.min)}
                tickFormatter={(v: number) => props.ticks.find((t) => t.min === v)?.label ?? ""}
                tick={{ fontSize: 11, fill: "var(--subtle)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border-strong)" }}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tickFormatter={(v: number) => `${v} m`}
                tick={{ fontSize: 11, fill: "var(--subtle)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <ReferenceLine y={threshold} stroke="var(--warning-fill)" strokeWidth={1.5} strokeDasharray="6 5" ifOverflow="extendDomain" />
              <Area type="linear" dataKey="level" stroke="none" fill="url(#gauge-fill)" isAnimationActive={false} activeDot={false} tooltipType="none" />
              <Line
                type="linear"
                dataKey="level"
                name="Gauge level"
                stroke="var(--chart-1)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={{ r: 3.5, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2.5 }}
                isAnimationActive={false}
              />
              <Annotations {...props} wide={wide} />
              <Tooltip
                cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
                content={(p: TooltipContentProps) => <ChartTooltip {...p} threshold={threshold} states={states} />}
                isAnimationActive={false}
              />
            </ComposedChart>
            <figcaption className="px-3 pt-3 text-[12.5px] leading-relaxed text-muted sm:px-2">{note}</figcaption>
          </figure>
        </div>
      ) : (
        <div className="px-5 py-5 sm:px-7">
          <table className="w-full text-[13.5px]">
            <caption className="sr-only">Gauge readings on 26 August with the GANGA engine state at the same time</caption>
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-[0.1em] text-subtle">
                <th className="pb-2.5 font-semibold">Time</th>
                <th className="pb-2.5 text-right font-semibold">Level</th>
                <th className="hidden pb-2.5 pl-6 font-semibold sm:table-cell">Against {threshold} m</th>
                <th className="pb-2.5 pl-6 font-semibold">GANGA replay</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => {
                const diff = p.level - threshold;
                const st = stateAtMin(states, p.min);
                return (
                  <tr key={p.clock} className="border-t border-border">
                    <td className="py-2.5 font-mono text-[12.5px] tabular">{p.clock}</td>
                    <td className="py-2.5 text-right font-medium tabular">{p.level.toFixed(1)} m</td>
                    <td className={cn("hidden py-2.5 pl-6 tabular sm:table-cell", diff >= 0 ? "font-medium text-warning" : "text-muted")}>
                      {diff >= 0 ? `+${diff.toFixed(1)} m above` : `${Math.abs(diff).toFixed(1)} m below`}
                    </td>
                    <td className="py-2 pl-6">
                      <StatePill state={st.state} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{note}</p>
        </div>
      )}
    </div>
  );
}

function Legend({ threshold }: { threshold: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3 text-[12px] text-muted sm:px-2">
      <span className="inline-flex items-center gap-2">
        <span className="h-[2px] w-4 rounded-full bg-chart-1" aria-hidden /> Gauge level
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="w-4 border-t-[1.5px] border-dashed border-warning-fill" aria-hidden /> Amber threshold {threshold} m
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="flex gap-[3px]" aria-hidden>
          <span className="h-3 w-[2px] rounded-full bg-watch-fill" />
          <span className="h-3 w-[2px] rounded-full bg-warning-fill" />
          <span className="h-3 w-[2px] rounded-full bg-emergency-fill" />
        </span>
        GANGA state changes
      </span>
    </div>
  );
}

const FILL_VAR: Record<Transition, string> = {
  WATCH: "var(--watch-fill)",
  WARNING: "var(--warning-fill)",
  EMERGENCY: "var(--emergency-fill)",
};

/** Annotations drawn in data space with the chart's own scales. */
function Annotations({ states, warn, gaugeAlarm, crossing, earlierBy, threshold, wide }: Props & { wide: boolean }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plot = usePlotArea();
  if (!xScale || !yScale || !plot) return null;
  const x = (v: number) => xScale(v) ?? 0;
  const y = (v: number) => yScale(v) ?? 0;
  const top = plot.y;
  const bottom = plot.y + plot.height;
  const lastState = states[states.length - 1];
  const boxX = lastState ? x(lastState.min) + 12 : plot.x + 12;
  const boxY = y(3.95);
  const dimY = y(4.72);

  return (
    <g pointerEvents="none">
      {/* GANGA state changes */}
      {states.map((s) => (
        <line key={s.state} x1={x(s.min)} x2={x(s.min)} y1={top + 8} y2={bottom} style={{ stroke: FILL_VAR[s.state] }} strokeWidth={1.5} />
      ))}
      {wide && states.length > 0 && (
        <g transform={`translate(${boxX} ${boxY})`}>
          <rect width={190} height={states.length * 19 + 30} rx={12} style={{ fill: "var(--surface)", stroke: "var(--border)" }} />
          <text x={12} y={19} style={{ fill: "var(--muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
            GANGA ENGINE · REPLAY
          </text>
          {states.map((s, i) => (
            <g key={s.state} transform={`translate(12 ${38 + i * 19})`}>
              <circle cx={4} cy={-4} r={4} style={{ fill: FILL_VAR[s.state] }} />
              <text x={14} y={0} style={{ fill: "var(--foreground)", fontSize: 11.5, fontWeight: 600 }}>
                {STATE_META[s.state].short}
              </text>
              <text x={178} y={0} textAnchor="end" style={{ fill: "var(--muted)", fontSize: 11.5, fontFamily: "var(--font-mono)" }}>
                {s.clock}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* threshold label */}
      {wide && (
        <text x={plot.x + plot.width - 4} y={y(threshold) - 7} textAnchor="end" style={{ fill: "var(--muted)", fontSize: 11.5 }}>
          Amber threshold · {threshold} m
        </text>
      )}

      {/* dimension line: GANGA warning → gauge alarm */}
      {warn && gaugeAlarm && earlierBy && (
        <g>
          <line x1={x(warn.min)} x2={x(gaugeAlarm.min)} y1={dimY} y2={dimY} style={{ stroke: "var(--foreground)" }} strokeOpacity={0.55} strokeWidth={1.25} />
          <line x1={x(warn.min)} x2={x(warn.min)} y1={dimY - 5} y2={dimY + 5} style={{ stroke: "var(--foreground)" }} strokeOpacity={0.55} strokeWidth={1.25} />
          <line x1={x(gaugeAlarm.min)} x2={x(gaugeAlarm.min)} y1={dimY - 5} y2={crossing ? y(crossing.level) - 9 : dimY + 5} style={{ stroke: "var(--foreground)" }} strokeOpacity={0.4} strokeWidth={1.25} strokeDasharray="2 3" />
          <text x={(x(warn.min) + x(gaugeAlarm.min)) / 2} y={dimY - 9} textAnchor="middle" style={{ fontSize: wide ? 12.5 : 11.5 }}>
            <tspan style={{ fill: "var(--muted)" }}>{wide ? "Residents warned " : "Warned "}</tspan>
            <tspan style={{ fill: "var(--foreground)", fontWeight: 600 }}>{earlierBy}</tspan>
            <tspan style={{ fill: "var(--muted)" }}>{wide ? " before the gauge alarm" : " earlier"}</tspan>
          </text>
        </g>
      )}

      {/* first reading above the threshold */}
      {crossing && (
        <g>
          <circle cx={x(crossing.min)} cy={y(crossing.level)} r={9} style={{ fill: "var(--warning-fill)" }} fillOpacity={0.18} />
          {wide && (
            <text x={x(crossing.min) + 14} y={y(crossing.level) - 10} style={{ fill: "var(--foreground)", fontSize: 11.5, fontWeight: 600 }}>
              {crossing.clock} · first reading above {threshold} m
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function ChartTooltip({
  active,
  payload,
  threshold,
  states,
}: TooltipContentProps & { threshold: number; states: ChartState[] }) {
  const p = payload?.find((e) => e.dataKey === "level")?.payload as ChartPoint | undefined;
  if (!active || !p) return null;
  const diff = p.level - threshold;
  const st = stateAtMin(states, p.min);
  return (
    <div className="min-w-[210px] rounded-[14px] border border-border bg-surface/95 px-3.5 py-3 shadow-float backdrop-blur-xl">
      <p className="font-mono text-[11.5px] text-subtle tabular">{p.clock} · 26 Aug</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold leading-none tracking-[-0.03em] tabular">{p.level.toFixed(1)} m</span>
        <span className="text-[12px] text-muted">gauge level</span>
      </p>
      <p className={cn("mt-1.5 flex items-center gap-1.5 text-[12px]", diff >= 0 ? "font-medium text-warning" : "text-muted")}>
        {diff >= 0 && <TriangleAlertIcon className="size-3.5" aria-hidden />}
        {diff >= 0 ? `${diff.toFixed(1)} m above the ${threshold} m threshold` : `${Math.abs(diff).toFixed(1)} m below the threshold`}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2.5">
        <span className="text-[12px] text-muted">GANGA replay</span>
        <StatePill state={st.state} size="sm" />
      </div>
      {st.since && <p className="mt-1 text-right text-[11px] text-subtle">since {st.since}</p>}
    </div>
  );
}
