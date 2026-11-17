"use client";

import * as React from "react";
import { villageStatusAt, type RunResult, type VillageResult, type VillageStatus } from "@/lib/engine";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { select } from "./sim-actions";
import { countdown } from "./derive";
import { clock, fmtDurationShort, fmtLead, shortName } from "./format";
import { PanelHeader, VillageStatusChip } from "./bits";

const COLS = "grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_60px]";

export function VillagesPanel({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  // One key for all rows: statuses plus rounded countdowns.
  const key = useSim((st) =>
    run.villages
      .map((v) => {
        const status = villageStatusAt(v, st.t);
        return status === "warned" ? `${status}:${countdown(v.arrivalMin - st.t)}` : status;
      })
      .join("|")
  );
  const parts = key.split("|").map((k) => k.split(":"));

  const maxLead = Math.max(1, ...run.villages.map((v) => Math.max(v.leadGangaMin ?? 0, v.leadGaugeMin ?? 0)));
  const step = maxLead > 120 ? 60 : maxLead > 60 ? 30 : maxLead > 20 ? 10 : 5;
  const scaleMax = Math.ceil(maxLead / step) * step;
  const ticks = Array.from({ length: scaleMax / step + 1 }, (_, i) => i * step);

  const helped = run.villages.filter((v) => v.leadGaugeMin !== null);
  const g10 = run.summary.villagesWithLead10Ganga;

  return (
    <Card className={cn("flex flex-col overflow-hidden lg:h-[620px]", className)}>
      <PanelHeader
        title="Villages & lead time"
        description={`Lead time: GANGA vs a gauge at ${run.gauge.km} km`}
      />

      <div className="mx-5 mt-3 rounded-[14px] bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-muted hairline">
        {helped.length === 0 ? (
          <>
            A gauge at {run.gauge.km} km warns <span className="font-semibold text-foreground">no village</span> before the flood arrives.
          </>
        ) : (
          <>
            The gauge only helps the {helped.length === 1 ? "village" : "villages"} below it:{" "}
            <span className="font-semibold text-foreground">{helped.map((v) => `${shortName(v.name)}, ${fmtLead(v.leadGaugeMin)}`).join("; ")}</span>.
          </>
        )}{" "}
        GANGA gives{" "}
        <span className="font-semibold text-foreground">
          {g10} of {run.villages.length}
        </span>{" "}
        villages 10+ minutes.
      </div>

      {/* legend + shared minute scale */}
      <div className={cn("mt-4 hidden items-end gap-x-3 px-5 pb-1.5 sm:grid", COLS)} aria-hidden>
        <div className="flex items-center gap-3 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[7px] w-3 rounded-r-[3px] bg-primary" />
            GANGA
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[7px] w-3 rounded-r-[3px] bg-[var(--subtle)] opacity-60" />
            Gauge
          </span>
        </div>
        <div className="relative h-4">
          {ticks.map((tk, i) => (
            <span
              key={tk}
              className={cn(
                "absolute bottom-0 whitespace-nowrap font-mono text-[10px] text-subtle tabular",
                i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
              )}
              style={{ left: `${(tk / scaleMax) * 100}%` }}
            >
              {i === ticks.length - 1 ? `${tk} min` : tk}
            </span>
          ))}
        </div>
        <span className="text-right text-[10.5px] text-subtle">lead</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2">
        <ul className="flex flex-col">
          {run.villages.map((v, i) => (
            <li key={v.id} className={cn(i > 0 && "border-t border-border")}>
              <VillageRow
                run={run}
                v={v}
                status={parts[i][0] as VillageStatus}
                minutesLeft={Number(parts[i][1] ?? 0)}
                scaleMax={scaleMax}
                ticks={ticks}
                belowGauge={v.leadGaugeMin !== null}
              />
            </li>
          ))}
        </ul>
      </div>
      <p className="border-t border-border px-5 py-2.5 text-[11.5px] text-subtle">
        Lead = flood arrival minus first public warning.{" "}
        {s.kind === "reconstructed" ? "Arrival times from the reconstructed flood front." : "All numbers are illustrative."}
      </p>
    </Card>
  );
}

function VillageRow({
  run,
  v,
  status,
  minutesLeft,
  scaleMax,
  ticks,
  belowGauge,
}: {
  run: RunResult;
  v: VillageResult;
  status: VillageStatus;
  minutesLeft: number;
  scaleMax: number;
  ticks: number[];
  belowGauge: boolean;
}) {
  const s = run.scenario;
  return (
    <button
      type="button"
      onClick={() => select({ kind: "village", id: v.id })}
      className={cn(
        "group grid w-full items-center gap-x-3 gap-y-2 rounded-[14px] px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-surface-2/70 focus-visible:ring-[3px] focus-visible:ring-ring/60",
        COLS
      )}
    >
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold tracking-[-0.01em]" title={v.name}>
            {shortName(v.name)}
          </span>
          <VillageStatusChip status={status} className="h-[20px] shrink-0 gap-1 px-1.5 text-[10.5px] [&_svg]:size-3" />
        </div>
        <div className="mt-0.5 truncate text-[12px] text-subtle tabular">
          {v.km} km ·{" "}
          {status === "flooded" ? (
            <span className="text-[var(--flood-ink)]">flooded {clock(s, v.arrivalMin).slice(0, 5)}</span>
          ) : (
            <>
              flood {clock(s, v.arrivalMin).slice(0, 5)}
              {status === "warned" && <span className="font-medium text-watch"> · in {fmtDurationShort(minutesLeft)}</span>}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-[5px]" aria-hidden>
        <Bar value={v.leadGangaMin} scaleMax={scaleMax} ticks={ticks} tone="ganga" />
        <Bar value={v.leadGaugeMin} scaleMax={scaleMax} ticks={ticks} tone={belowGauge ? "gauge-strong" : "gauge"} />
      </div>
      <div className="flex flex-col items-end gap-[3px] text-[11.5px] leading-[13px] tabular">
        <span className="font-semibold">{fmtLead(v.leadGangaMin)}</span>
        <span
          className={cn(v.leadGaugeMin === null ? "italic text-subtle" : "font-semibold text-foreground")}
          title={belowGauge ? "Below the gauge, where a gauge can warn in time" : undefined}
        >
          {fmtLead(v.leadGaugeMin)}
        </span>
      </div>
    </button>
  );
}

function Bar({ value, scaleMax, ticks, tone }: { value: number | null; scaleMax: number; ticks: number[]; tone: "ganga" | "gauge" | "gauge-strong" }) {
  const pct = value === null ? 0 : Math.max(1, (value / scaleMax) * 100);
  return (
    <div className="relative h-[7px]">
      {ticks.slice(1, -1).map((tk) => (
        <span key={tk} className="absolute -inset-y-[3px] w-px bg-border" style={{ left: `${(tk / scaleMax) * 100}%` }} />
      ))}
      <span className="absolute inset-y-0 left-0 w-px bg-border-strong" />
      {value === null ? (
        <span className="absolute left-1 top-1/2 w-5 -translate-y-1/2 border-t border-dashed border-border-strong" />
      ) : (
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-r-[3px]",
            tone === "ganga" ? "bg-primary" : tone === "gauge-strong" ? "bg-[var(--subtle)]" : "bg-[var(--subtle)] opacity-60"
          )}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
