import { stateAt, type Delivery, type Evidence, type RunResult, type VillageResult } from "@/lib/engine";
import { fmtDuration, shortName } from "./format";

/**
 * Messages that reach residents: deliveries to every group marked public in this run's broadcast
 * settings, one per channel (the earliest that gets through, else the first blocked one).
 */
export function publicDeliveries(run: RunResult): Delivery[] {
  const pub = new Set(run.groupConfig.filter((g) => g.public).map((g) => g.id));
  const best = new Map<string, Delivery>();
  for (const d of run.deliveries) {
    if (!pub.has(d.group)) continue;
    const cur = best.get(d.channel);
    const better = !cur || (cur.blocked && !d.blocked) || (cur.blocked === d.blocked && d.deliverMin < cur.deliverMin);
    if (better) best.set(d.channel, d);
  }
  return [...best.values()].sort((a, b) => a.deliverMin - b.deliverMin);
}

/*
 * Pure helpers that turn (run, t) into what the page says. Every sentence is
 * built from engine values — nothing here is hard-coded per scenario.
 */

/** Number of evidence entries at or before t (evidence is sorted by time). */
export function evidenceCount(run: RunResult, t: number): number {
  let n = 0;
  for (const e of run.evidence) {
    if (e.t > t) break;
    n++;
  }
  return n;
}

/** The next village the flood front has not reached yet. */
export function nextVillage(run: RunResult, t: number): VillageResult | null {
  let best: VillageResult | null = null;
  for (const v of run.villages) if (v.arrivalMin > t && (!best || v.arrivalMin < best.arrivalMin)) best = v;
  return best;
}

export function firstAnomaly(run: RunResult, t: number): Evidence | undefined {
  return run.evidence.find((e) => (e.kind === "vibration" || e.kind === "rise") && e.t <= t);
}

/** One plain sentence for the status hero, e.g. "Residents warned · flood reaches Timure in 24 min". */
export function heroSentence(run: RunResult, t: number): string {
  const state = stateAt(run, t);
  const next = nextVillage(run, t);
  const flood = next ? `flood reaches ${shortName(next.name)} in ${fmtDuration(next.arrivalMin - t)}` : null;
  const pub = run.summary.firstPublicWarningMin;

  if (state === "NORMAL") return `All ${run.nodes.length} nodes reporting\u00a0· no anomaly`;
  if (state === "WATCH") {
    const a = firstAnomaly(run, t);
    const what = a?.kind === "rise" ? "rising water" : "ground vibration";
    return `${a?.node ?? "A node"} felt ${what}\u00a0· officials told, public not yet`;
  }
  if (!flood) return `Flood has passed all ${run.villages.length} villages`;
  if (state === "EMERGENCY") return `Evacuate now\u00a0· ${flood}`;
  if (pub !== null && t >= pub) return `Residents warned\u00a0· ${flood}`;
  return `Warning issued\u00a0· reaching residents now`;
}

/** The engine's own explanation for the current state: the latest state-change evidence. */
export function latestStateEvidence(run: RunResult, t: number): Evidence | undefined {
  let last: Evidence | undefined;
  for (const e of run.evidence) {
    if (e.t > t) break;
    if (e.kind === "state") last = e;
  }
  return last;
}

/** Minutes the flood takes to reach the village from t (null once it has arrived). */
export function minutesToArrival(v: VillageResult, t: number): number | null {
  return v.arrivalMin > t ? v.arrivalMin - t : null;
}

/** Countdown rounded for display: whole minutes, or 5-second steps in the last minute. */
export function countdown(minutes: number): number {
  return minutes < 1 ? Math.max(5, Math.ceil((minutes * 60) / 5) * 5) / 60 : Math.round(minutes);
}

/** Nice tick step (seconds) so a span gets at most `maxTicks` ticks. */
export function niceStepSeconds(spanMin: number, maxTicks = 8): number {
  const steps = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const span = spanMin * 60;
  return steps.find((s) => span / s <= maxTicks) ?? 3600;
}
