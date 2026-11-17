"use client";

import * as React from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { CloudIcon, SignalIcon } from "lucide-react";
import { deliveryStatusAt, predictedArrivalAt, RULES, villageStatusAt, type RunResult, type VillageResult } from "@/lib/engine";
import { SheetBody, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSim } from "./sim-store";
import { clock, fmtDuration, fmtLead, tplus } from "./format";
import { publicDeliveries } from "./derive";
import { Caption, DetailList, DetailRow, VillageStatusChip } from "./bits";
import { AXIS_TICK, ChartTip } from "./chart-bits";

export function VillageSheet({ run, village: v }: { run: RunResult; village: VillageResult }) {
  const s = run.scenario;
  const status = useSim((st) => villageStatusAt(v, st.t));
  // 15-second resolution is plenty for the "now" marker on the chart.
  const tq = useSim((st) => Math.min(v.arrivalMin, Math.round(st.t * 4) / 4));
  const residents = React.useMemo(() => publicDeliveries(run), [run]);
  const statusKey = useSim((st) => residents.map((d) => deliveryStatusAt(d, st.t)).join("|"));
  const statuses = statusKey.split("|");

  // The engine's arrival estimate only changes when a node dies or a new speed is measured.
  const points = React.useMemo(() => {
    const cps = new Set<number>([0, v.arrivalMin]);
    for (const d of run.deaths) if (d.detectedMin < v.arrivalMin) cps.add(d.detectedMin);
    for (const e of run.speedEstimates) if (e.t < v.arrivalMin) cps.add(e.t);
    return [...cps].sort((a, b) => a - b).map((x) => ({ x, y: predictedArrivalAt(run, v.km, x) }));
  }, [run, v]);

  const data = React.useMemo(() => {
    const rows: { x: number; past?: number; future?: number }[] = [];
    const yAt = (x: number) => [...points].reverse().find((p) => p.x <= x)?.y ?? points[0].y;
    for (const p of points) {
      if (p.x < tq) rows.push({ x: p.x, past: p.y });
      else if (p.x > tq) rows.push({ x: p.x, future: p.y });
    }
    rows.push({ x: tq, past: yAt(tq), future: yAt(tq) });
    return rows.sort((a, b) => a.x - b.x);
  }, [points, tq]);

  const firstGuess = points[0]?.y ?? 0;
  const yTicks = niceTicks(Math.max(v.arrivalMin, ...points.map((p) => p.y)) * 1.06);
  const xTicks = niceTicks(v.arrivalMin).filter((x) => x <= v.arrivalMin);
  const yMax = yTicks[yTicks.length - 1];

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle>{v.name}</SheetTitle>
          <VillageStatusChip status={status} />
        </div>
        <SheetDescription>
          {v.km} km downstream of the source{v.note ? ` · ${v.note}` : ""}.
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-6">
        <section className="grid grid-cols-2 gap-2">
          <Tile label="Flood arrives" value={clock(s, v.arrivalMin)} sub={tplus(v.arrivalMin)} />
          <Tile
            label="First public warning"
            value={v.gangaWarnMin !== null ? clock(s, v.gangaWarnMin) : "None"}
            sub={v.gangaWarnMin !== null ? `${tplus(v.gangaWarnMin)} · all villages at once` : "no public channel delivered"}
          />
          <Tile label="Lead with GANGA" value={fmtLead(v.leadGangaMin)} sub={v.leadGangaMin !== null ? fmtDuration(v.leadGangaMin) + " to move" : "warning came too late"} strong />
          <Tile
            label={`Lead with a gauge at ${run.gauge.km} km`}
            value={fmtLead(v.leadGaugeMin)}
            sub={v.leadGaugeMin !== null ? `gauge warns ${clock(s, run.gauge.warnMin!)}` : v.km < run.gauge.km ? "flooded before the gauge" : "gauge warning too late"}
          />
        </section>

        <section>
          <Caption>Arrival estimate over time</Caption>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            Assumes {RULES.priorSpeedMs} m/s until two RTUs go silent, so early estimates err early. First estimate {clock(s, firstGuess).slice(0, 5)}; actual {clock(s, v.arrivalMin).slice(0, 5)}.
          </p>
          <LineChart responsive style={{ width: "100%", height: 190 }} data={data} margin={{ top: 14, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, v.arrivalMin]}
              ticks={xTicks}
              tickFormatter={(x: number) => tplus(x)}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              type="number"
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(y: number) => clock(s, y).slice(0, 5)}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <ReferenceLine
              y={v.arrivalMin}
              stroke="var(--flood)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: "actual arrival", position: "insideTopRight", fontSize: 11, fill: "var(--muted)" }}
            />
            <ReferenceLine x={tq} stroke="var(--border-strong)" strokeWidth={1} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { x: number; past?: number; future?: number } | undefined;
                if (!p) return null;
                const y = p.past ?? p.future ?? 0;
                return (
                  <ChartTip
                    active={active}
                    title={`at ${clock(s, p.x)} · ${tplus(p.x)}`}
                    rows={[{ key: "y", value: clock(s, y), label: "expected arrival", color: "var(--chart-1)" }]}
                  />
                );
              }}
            />
            <Line type="stepAfter" dataKey="past" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
            <Line
              type="stepAfter"
              dataKey="future"
              stroke="var(--chart-1)"
              strokeOpacity={0.3}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
          <p className="mt-1 text-[11.5px] text-subtle">Solid = known so far. Faded = later.</p>
        </section>

        <section>
          <Caption>Channels that reach residents</Caption>
          {residents.length === 0 && (
            <p className="mt-2 text-[13px] text-muted">No group reaches residents. No public warning.</p>
          )}
          <DetailList className={cn("mt-2.5", residents.length === 0 && "hidden")}>
            {residents.map((d, i) => {
              const ch = run.channels.find((c) => c.id === d.channel)!;
              const st = statuses[i];
              return (
                <DetailRow
                  key={d.id}
                  label={
                    <span className="inline-flex items-center gap-2 text-foreground">
                      {ch.needsWan ? <CloudIcon className="size-3.5 text-muted" aria-hidden /> : <SignalIcon className="size-3.5 text-normal" aria-hidden />}
                      {ch.name}
                    </span>
                  }
                >
                  <span className={cn("text-[13px] tabular", st === "blocked" ? "font-medium text-emergency" : st === "delivered" ? "text-normal" : "text-subtle")}>
                    {st === "blocked" ? "blocked · WAN down" : st === "delivered" ? `arrived ${clock(s, d.deliverMin)}` : `${st} · ${clock(s, d.deliverMin)}`}
                  </span>
                </DetailRow>
              );
            })}
          </DetailList>
        </section>
      </SheetBody>
    </>
  );
}

/** 0 … ≥max in round minute steps (at most ~5 ticks). */
function niceTicks(max: number): number[] {
  const step = [1, 2, 5, 10, 15, 20, 30, 60].find((st) => max / st <= 4.5) ?? 120;
  const n = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: n + 1 }, (_, i) => i * step);
}

function Tile({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="rounded-[14px] bg-surface-2 px-3.5 py-3 hairline">
      <p className="text-[11.5px] leading-snug text-muted">{label}</p>
      <p className={cn("mt-1.5 text-[19px] font-semibold leading-none tracking-[-0.02em] tabular", !strong && "text-foreground")}>{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] leading-snug text-subtle">{sub}</p>}
    </div>
  );
}
