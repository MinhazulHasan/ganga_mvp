import { clockAt, fmtT, RULES, type RunResult, type Scenario } from "@/lib/engine";
import { fmtLead, shortName } from "./format";

/*
 * What-if inputs for the engine (heartbeat, geophone range, processing delay, flood speed)
 * and the "what changed" comparison against the scenario defaults. Pure helpers.
 */

export interface WhatIf {
  heartbeatS: number;
  geophoneRangeKm: number;
  procDelayS: number;
  /** null = the scenario's own flood-front anchors */
  floodSpeedMs: number | null;
}

export type WhatIfKey = keyof WhatIf;

export const WHAT_IF_RANGE: Record<WhatIfKey, { min: number; max: number; step: number }> = {
  heartbeatS: { min: 10, max: 300, step: 5 },
  geophoneRangeKm: { min: 0, max: 30, step: 1 },
  procDelayS: { min: 0, max: 120, step: 1 },
  floodSpeedMs: { min: 2, max: 20, step: 0.5 },
};

export function whatIfDefaults(s: Scenario): WhatIf {
  return { heartbeatS: s.heartbeatS, geophoneRangeKm: s.geophoneRangeKm, procDelayS: s.procDelayS, floodSpeedMs: null };
}

/**
 * The constant speed an illustrative scenario already uses (the slider's starting point).
 * null for scenarios anchored on published timings — their speed is not ours to change.
 */
export function baseFloodSpeed(s: Scenario): number | null {
  if (s.kind !== "illustrative" || s.arrival.length !== 2) return null;
  const [a, b] = s.arrival;
  return ((b.km - a.km) * 1000) / ((b.min - a.min) * 60);
}

/** "Rasuwagadhi 08:44, gauge 11:20" — the published anchors that fix the 26 Aug flood front. */
export function anchorSummary(s: Scenario): string {
  return s.arrival
    .filter((a) => a.source)
    .map((a) => `${a.km === s.gaugeKm ? "gauge" : a.label.split(" · ")[0]} ${clockAt(s, a.min, false)}`)
    .join(", ");
}

const snap = (v: number, k: WhatIfKey) => {
  const r = WHAT_IF_RANGE[k];
  const stepped = Math.round(v / r.step) * r.step;
  return Math.min(r.max, Math.max(r.min, Math.round(stepped * 100) / 100));
};

/** Clamp to the slider ranges; a flood speed equal to the scenario's own speed means "no override". */
export function normalizeWhatIf(w: WhatIf, s: Scenario): WhatIf {
  const base = baseFloodSpeed(s);
  let flood = w.floodSpeedMs === null || base === null ? null : snap(w.floodSpeedMs, "floodSpeedMs");
  if (flood !== null && base !== null && Math.abs(flood - base) < 1e-9) flood = null;
  return {
    heartbeatS: snap(w.heartbeatS, "heartbeatS"),
    geophoneRangeKm: snap(w.geophoneRangeKm, "geophoneRangeKm"),
    procDelayS: snap(w.procDelayS, "procDelayS"),
    floodSpeedMs: flood,
  };
}

export const sameWhatIf = (a: WhatIf, b: WhatIf) =>
  a.heartbeatS === b.heartbeatS && a.geophoneRangeKm === b.geophoneRangeKm && a.procDelayS === b.procDelayS && a.floodSpeedMs === b.floodSpeedMs;

export const isWhatIfDefault = (w: WhatIf, s: Scenario) => sameWhatIf(w, whatIfDefaults(s));

export const fmtSpeed = (ms: number) => `${Number.isInteger(ms) ? ms : ms.toFixed(1)} m/s`;

export const WHAT_IF_LABEL: Record<WhatIfKey, string> = {
  heartbeatS: "Heartbeat",
  geophoneRangeKm: "Geophone range",
  procDelayS: "Processing delay",
  floodSpeedMs: "Flood speed",
};

export function fmtWhatIfValue(k: WhatIfKey, v: number): string {
  if (k === "floodSpeedMs") return fmtSpeed(v);
  return k === "geophoneRangeKm" ? `${v} km` : `${v} s`;
}

/** The inputs that differ from the scenario defaults, e.g. "Heartbeat 60 s → 120 s". */
export function changedParams(w: WhatIf, s: Scenario): { key: WhatIfKey; label: string; from: string; to: string }[] {
  const d = whatIfDefaults(s);
  const out: { key: WhatIfKey; label: string; from: string; to: string }[] = [];
  for (const k of ["heartbeatS", "geophoneRangeKm", "procDelayS"] as const) {
    if (w[k] !== d[k]) out.push({ key: k, label: WHAT_IF_LABEL[k], from: fmtWhatIfValue(k, d[k]), to: fmtWhatIfValue(k, w[k]) });
  }
  const base = baseFloodSpeed(s);
  if (w.floodSpeedMs !== null && base !== null) {
    out.push({ key: "floodSpeedMs", label: WHAT_IF_LABEL.floodSpeedMs, from: fmtSpeed(base), to: fmtSpeed(w.floodSpeedMs) });
  }
  return out;
}

export interface DiffRow {
  key: string;
  label: string;
  before: string;
  after: string;
}

const reports = (r: RunResult) => r.nodes.reduce((n, node) => n + node.readings.length, 0);

/**
 * What the what-ifs changed in the outcome, versus the same run at the defaults.
 * Only rows that differ are returned, in reading order.
 */
export function outcomeDiff(base: RunResult, cur: RunResult): DiffRow[] {
  const s = cur.scenario;
  const rows: DiffRow[] = [];
  const push = (key: string, label: string, before: string, after: string) => {
    if (before !== after) rows.push({ key, label, before, after });
  };
  const clk = (m: number | undefined) => (m === undefined ? "—" : clockAt(s, m));
  for (const st of ["WATCH", "WARNING", "EMERGENCY"] as const) push(st, st, clk(base.stateTimes[st]), clk(cur.stateTimes[st]));
  push("public", "First public warning", fmtT(base.summary.firstPublicWarningMin, true), fmtT(cur.summary.firstPublicWarningMin, true));
  push(
    "lead10",
    "Villages with 10+ min",
    `${base.summary.villagesWithLead10Ganga} / ${base.summary.villageCount}`,
    `${cur.summary.villagesWithLead10Ganga} / ${cur.summary.villageCount}`
  );
  const first = [...cur.villages].sort((a, b) => a.km - b.km)[0];
  const firstBase = first ? base.villages.find((v) => v.id === first.id) : undefined;
  if (first && firstBase) push("lead-first", `Lead at ${shortName(first.name)}`, fmtLead(firstBase.leadGangaMin), fmtLead(first.leadGangaMin));
  push("gauge", "Gauge warning", fmtT(base.gauge.warnMin, true), fmtT(cur.gauge.warnMin, true));
  push(
    "silent",
    "Quiet RTU missed after",
    `${Math.round(base.options.heartbeatS * RULES.missedHeartbeats)} s`,
    `${Math.round(cur.options.heartbeatS * RULES.missedHeartbeats)} s`
  );
  push("reports", "Sensor reports in the run", reports(base).toLocaleString("en-US"), reports(cur).toLocaleString("en-US"));
  return rows;
}
