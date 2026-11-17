"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { nodeStatusAt, RULES, type NodeTrack, type RunResult } from "@/lib/engine";
import { SheetBody, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSim } from "./sim-store";
import { select } from "./sim-actions";
import { clock, tplus } from "./format";
import { Caption, DetailList, DetailRow, KIND_ICON, NodeStatusChip, RuleChip, TimeStamp } from "./bits";
import { AXIS_TICK, ChartTip } from "./chart-bits";

export function NodeSheet({ run, node }: { run: RunResult; node: NodeTrack }) {
  const s = run.scenario;
  // Re-render when a new reading arrives or the status changes — not every frame.
  const count = useSim((st) => {
    let n = 0;
    for (const r of node.readings) {
      if (r.t > st.t) break;
      n++;
    }
    return n;
  });
  const status = useSim((st) => nodeStatusAt(node, st.t));
  const evCount = useSim((st) => run.evidence.filter((e) => e.node === node.id && e.t <= st.t).length);

  const data = React.useMemo(() => node.readings.slice(0, count), [node, count]);
  const last = count ? node.readings[count - 1] : null;
  const evidence = run.evidence.filter((e) => e.node === node.id);
  const shown = evidence.slice(0, evCount);
  const later = evidence.length - shown.length;
  const xMax = Math.max(last?.t ?? 0, 0.5);

  const vibAbove = last ? last.vib >= RULES.vibMmS : false;
  const rateAbove = last ? last.rate >= RULES.riseCmMin : false;

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2.5">
          <SheetTitle>
            {node.id} · {node.km} km
          </SheetTitle>
          <NodeStatusChip status={status} />
        </div>
        <SheetDescription>
          River-bank node with ultrasonic level sensor and geophone. LoRa to a ridge relay. Simulated readings.
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-6">
        <section>
          <Caption>Latest reading{last ? ` · ${clock(s, last.t)}` : ""}</Caption>
          {last ? (
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <ReadingTile label="Level" value={`+${last.level.toFixed(1)}`} unit="cm" />
              <ReadingTile label="Rate of rise" value={last.rate.toFixed(1)} unit="cm/min" flag={rateAbove ? `≥ ${RULES.riseCmMin}` : undefined} />
              <ReadingTile label="Vibration" value={last.vib.toFixed(2)} unit="mm/s" flag={vibAbove ? `≥ ${RULES.vibMmS}` : undefined} />
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-muted">No report yet.</p>
          )}
        </section>

        {data.length > 1 && (
          <section className="flex flex-col gap-4">
            <ReadingChart
              data={data}
              dataKey="rate"
              label="Rate of rise"
              unit="cm/min"
              threshold={RULES.riseCmMin}
              xMax={xMax}
              fmtX={(v) => tplus(v)}
            />
            <ReadingChart
              data={data}
              dataKey="vib"
              label="Ground vibration"
              unit="mm/s"
              threshold={RULES.vibMmS}
              xMax={xMax}
              fmtX={(v) => tplus(v)}
            />
            <p className="text-[11.5px] text-subtle">
              {data.length} reports. Every {run.options.heartbeatS} s when quiet, {RULES.burstS} s in event mode. Dashed line = placeholder threshold.
            </p>
          </section>
        )}

        <section>
          <Caption>Scenario timeline</Caption>
          <DetailList className="mt-2.5">
            {node.shakingFromMin !== null && (
              <DetailRow label="Ground shaking from">
                <TimeStamp clock={clock(s, node.shakingFromMin)} tplus={tplus(node.shakingFromMin)} />
              </DetailRow>
            )}
            <DetailRow label="Water rising from">
              <TimeStamp clock={clock(s, node.risingFromMin)} tplus={tplus(node.risingFromMin)} />
            </DetailRow>
            <DetailRow label="Flood reaches the node">
              <TimeStamp clock={clock(s, node.hitMin)} tplus={tplus(node.hitMin)} />
            </DetailRow>
            <DetailRow label="Engine detects silence">
              {node.silenceDetectedMin !== null ? (
                <span className="flex flex-col items-end">
                  <TimeStamp clock={clock(s, node.silenceDetectedMin)} tplus={tplus(node.silenceDetectedMin)} />
                  <span className="mt-0.5 text-[11.5px] text-emergency">
                    {Math.round((node.silenceDetectedMin - (node.readings[node.readings.length - 1]?.t ?? node.silenceDetectedMin)) * 60)} s after its last
                    report
                  </span>
                </span>
              ) : (
                <span className="text-subtle">not in this run</span>
              )}
            </DetailRow>
          </DetailList>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            A node that goes silent after an anomaly is treated as destroyed (rule R4).
          </p>
        </section>

        <section>
          <Caption>Evidence from {node.id}</Caption>
          {shown.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">Nothing yet{later ? ` · ${later} later in the replay` : ""}.</p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-1">
              {shown.map((e) => {
                const Icon = KIND_ICON[e.kind];
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => select({ kind: "evidence", id: e.id })}
                      className="flex w-full items-start gap-2.5 rounded-[12px] px-2 py-2 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/60"
                    >
                      <Icon className={cn("mt-0.5 size-4 shrink-0", e.kind === "silence" ? "text-emergency" : "text-muted")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13.5px] font-medium">{e.title}</span>
                          <RuleChip rule={e.rule} />
                        </span>
                        <span className="font-mono text-[11px] text-subtle tabular">
                          {clock(s, e.t)} · {tplus(e.t)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {later > 0 && <li className="px-2 pt-1 text-[12px] text-subtle">{later} more later in the replay</li>}
            </ul>
          )}
        </section>
      </SheetBody>
    </>
  );
}

function ReadingTile({ label, value, unit, flag }: { label: string; value: string; unit: string; flag?: string }) {
  return (
    <div className="rounded-[14px] bg-surface-2 px-3 py-2.5 hairline">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="mt-1 text-[19px] font-semibold leading-none tracking-[-0.02em] tabular">{value}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-subtle">
        {unit}
        {flag && <span className="rounded-full bg-warning-soft px-1.5 py-px text-[10px] font-semibold text-warning">{flag}</span>}
      </p>
    </div>
  );
}

function ReadingChart({
  data,
  dataKey,
  label,
  unit,
  threshold,
  xMax,
  fmtX,
}: {
  data: NodeTrack["readings"];
  dataKey: "rate" | "vib";
  label: string;
  unit: string;
  threshold: number;
  xMax: number;
  fmtX: (v: number) => string;
}) {
  const gid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-medium">
          {label} <span className="font-normal text-subtle">({unit})</span>
        </span>
        <span className="text-[11px] text-subtle">
          threshold {threshold} {unit}
        </span>
      </div>
      <AreaChart responsive style={{ width: "100%", height: 116 }} data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.14} />
            <stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="t"
          type="number"
          domain={[0, xMax]}
          tickFormatter={fmtX}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={36}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={34}
          domain={[(min: number) => Math.min(0, Math.floor(min)), (max: number) => Math.ceil(Math.max(max, threshold * 1.4))]}
        />
        <ReferenceLine y={threshold} stroke="var(--warning-fill)" strokeDasharray="4 4" strokeWidth={1.5} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)" }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as NodeTrack["readings"][number] | undefined;
            if (!p) return null;
            return (
              <ChartTip
                active={active}
                title={fmtX(p.t)}
                rows={[{ key: dataKey, value: `${p[dataKey]} ${unit}`, label, color: "var(--chart-1)" }]}
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill={`url(#${gid})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  );
}
