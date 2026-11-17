import { aug26, runScenario, clockAt, fmtT, defaultChannels, RULES } from "@/lib/engine";
import type { AlertState } from "@/lib/alert-state";

/**
 * Every number on the Overview comes from here: one deterministic engine run of
 * 26 August (WAN up), plus the WAN-down and WAN-down-with-fix variants. Nothing is hardcoded.
 * Pure and serialisable, so server sections and client islands can share the result.
 */

export type Transition = Exclude<AlertState, "NORMAL">;
export const TRANSITIONS: Transition[] = ["WATCH", "WARNING", "EMERGENCY"];

/** 161.8 → "2 h 42 min", 38 → "38 min" */
export function fmtDuration(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "08:44" → minutes after the 26 Aug trigger (08:37). */
export function minutesAfterTrigger(clock: string, trigger: string = aug26.triggerClock): number {
  const toMin = (c: string) => {
    const [h, m] = c.split(":").map(Number);
    return h * 60 + m;
  };
  return toMin(clock) - toMin(trigger);
}

/** Elapsed time since the trigger, clock-style: "T+1:26", "T+2:43:15". */
export function fmtElapsed(min: number): string {
  if (min < 60) return fmtT(min, true);
  const total = Math.max(0, Math.round(min * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `T+${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getOverviewFacts() {
  const run = runScenario(aug26);
  const wanDown = runScenario(aug26, { wanDownFromMin: 0 });
  const withFix = runScenario(aug26, { wanDownFromMin: 0, eocGsm: true });

  const states = TRANSITIONS.flatMap((state) => {
    const min = run.stateTimes[state];
    if (min === undefined) return [];
    const ev = run.evidence.find((e) => e.kind === "state" && e.state === state);
    return [{ state, min, clock: clockAt(aug26, min), t: fmtT(min, true), rule: ev?.rule ?? "", why: ev?.detail ?? "" }];
  });

  const fpMin = run.summary.firstPublicWarningMin;
  const residentDeliveries = run.deliveries
    .filter((d) => d.group === "residents" && !d.blocked)
    .sort((a, b) => a.deliverMin - b.deliverMin);
  const firstPublic =
    fpMin === null
      ? null
      : {
          min: fpMin,
          t: fmtT(fpMin, true),
          clock: clockAt(aug26, fpMin),
          clockShort: clockAt(aug26, fpMin, false),
          m: Math.floor(Math.round(fpMin * 60) / 60),
          s: Math.round(fpMin * 60) % 60,
          channel: residentDeliveries[0]?.channelName ?? null,
          channels: residentDeliveries.map((d) => ({ name: d.channelName, t: fmtT(d.deliverMin, true), clock: clockAt(aug26, d.deliverMin) })),
        };

  const villages = run.villages.map((v) => ({
    id: v.id,
    name: v.name,
    km: v.km,
    note: v.note ?? null,
    arrivalMin: v.arrivalMin,
    arrivalClock: clockAt(aug26, v.arrivalMin, false),
    leadGanga: v.leadGangaMin,
    leadGauge: v.leadGaugeMin,
  }));

  const gauge = {
    km: run.gauge.km,
    crossMin: run.gauge.crossMin,
    crossClock: clockAt(aug26, run.gauge.crossMin, false),
    warnMin: run.gauge.warnMin,
    warnClock: run.gauge.warnMin === null ? null : clockAt(aug26, run.gauge.warnMin),
  };

  const evidence = run.evidence.map((e) => ({
    id: e.id,
    t: e.t,
    clock: clockAt(aug26, e.t),
    kind: e.kind,
    rule: e.rule,
    title: e.title,
    detail: e.detail,
    values: e.values ?? [],
  }));

  return {
    scenario: {
      name: aug26.name,
      shortName: aug26.shortName,
      river: aug26.river,
      region: aug26.region,
      triggerClock: aug26.triggerClock,
      kind: aug26.kind,
      nodesKm: aug26.nodesKm,
      heartbeatS: run.options.heartbeatS,
      assumptions: aug26.assumptions,
    },
    states,
    firstPublic,
    realSmsMin: run.summary.realFirstSmsMin,
    villages,
    lead10: {
      ganga: run.summary.villagesWithLead10Ganga,
      gauge: run.summary.villagesWithLead10Gauge,
      total: run.summary.villageCount,
    },
    gauge,
    /** How much earlier residents hear GANGA than they would hear a threshold-gauge alarm. */
    earlierByMin: fpMin !== null && run.gauge.warnMin !== null ? run.gauge.warnMin - fpMin : null,
    wan: {
      residentsMin: wanDown.groups.find((g) => g.id === "residents")?.firstDeliveryMin ?? null,
      blocked: wanDown.groups.filter((g) => g.blockedAll).map((g) => g.name),
      blockedWithFix: withFix.groups.filter((g) => g.blockedAll).map((g) => g.name),
      findings: wanDown.findings,
    },
    channels: defaultChannels()
      .filter((c) => c.enabled)
      .map((c) => ({ id: c.id, name: c.name, short: c.short, latencyS: c.latencyS, needsWan: c.needsWan })),
    deaths: run.deaths.map((d) => ({
      ...d,
      lastHeardClock: clockAt(aug26, d.deathMin),
      detectedClock: clockAt(aug26, d.detectedMin),
      afterS: Math.round((d.detectedMin - d.deathMin) * 60),
    })),
    speeds: run.speedEstimates.map((s) => ({ ...s, clock: clockAt(aug26, s.t) })),
    evidence,
    rules: {
      vibMmS: RULES.vibMmS,
      riseCmMin: RULES.riseCmMin,
      burstS: RULES.burstS,
      missedBursts: RULES.missedBursts,
      missedHeartbeats: RULES.missedHeartbeats,
    },
  };
}

export type OverviewFacts = ReturnType<typeof getOverviewFacts>;
