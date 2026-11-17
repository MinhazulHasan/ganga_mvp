import { STATE_RANK, type AlertState } from "@/lib/alert-state";
import { applyEocGsm, defaultChannels, defaultGroups } from "./broadcast";
import type {
  Delivery,
  Evidence,
  GroupSummary,
  NodeTrack,
  Reading,
  RtuRole,
  RunOptions,
  RunResult,
  Scenario,
  SpeedEstimate,
  VillageResult,
} from "./types";

/* ------------------------------------------------------------------
   Rule thresholds (placeholders until a pilot season calibrates them)
------------------------------------------------------------------- */
export const RULES = {
  vibMmS: 2.0, // ground vibration that counts as anomalous
  riseCmMin: 15, // rate of rise that counts as anomalous
  burstS: 5, // reporting interval while a node is in event mode
  missedBursts: 3, // bursts missed before an event-mode node is declared silent
  missedHeartbeats: 2.5, // heartbeats missed before a quiet node is declared silent
  gatewayWindowS: 20, // nodes going silent together within this window → gateway fault
  priorSpeedMs: 50, // worst-case (fast) speed assumed until two nodes have died
  minSpeedMs: 2,
  maxSpeedMs: 60,
} as const;

export const RULE_TEXT = {
  R1: "R1 · Single anomaly → WATCH (officials only)",
  R2: "R2 · Two signals agree at one RTU → WARNING",
  R3: "R3 · Rate-of-rise at two RTUs → WARNING",
  R4: "R4 · RTU silent after an anomaly = flood evidence → WARNING",
  R5: "R5 · Two RTUs die in downstream order → EMERGENCY",
  R6: "R6 · RTUs silent together with no anomaly = receiver fault, not a flood",
  R7: "R7 · Vibration alone never warns the public (earthquakes, traffic)",
} as const;

/* ------------------------------------------------------------------
   RTU roles (Team PASS field design): three checkpoints, upstream first
------------------------------------------------------------------- */
export const RTU_ROLES = [
  { role: "lake", name: "Lake RTU", short: "Lake", booster: true, job: "Primary · at the lake outlet, sees the breach first" },
  { role: "gorge", name: "Gorge RTU", short: "Gorge", booster: true, job: "Backup · in the narrow gorge, takes over if the lake RTU goes silent" },
  { role: "confluence", name: "Confluence RTU", short: "Confluence", booster: false, job: "Where the tributary joins · combined volume and travel speed" },
] as const satisfies readonly { role: RtuRole; name: string; short: string; booster: boolean; job: string }[];

/* ------------------------------------------------------------------
   Flood-front model (piecewise linear between published anchors)
------------------------------------------------------------------- */
export function arrivalMinAtKm(s: Scenario, km: number): number {
  const a = s.arrival;
  if (km <= 0) return 0;
  for (let i = 1; i < a.length; i++) {
    if (km <= a[i].km) {
      const p = a[i - 1], q = a[i];
      return p.min + ((km - p.km) / (q.km - p.km)) * (q.min - p.min);
    }
  }
  const p = a[a.length - 2], q = a[a.length - 1];
  const minPerKm = (q.min - p.min) / (q.km - p.km);
  return q.min + (km - q.km) * minPerKm;
}

export function frontKmAt(s: Scenario, t: number): number {
  const a = s.arrival;
  if (t <= 0) return 0;
  for (let i = 1; i < a.length; i++) {
    if (t <= a[i].min) {
      const p = a[i - 1], q = a[i];
      return p.km + ((t - p.min) / (q.min - p.min)) * (q.km - p.km);
    }
  }
  const p = a[a.length - 2], q = a[a.length - 1];
  const kmPerMin = (q.km - p.km) / (q.min - p.min);
  return q.km + (t - q.min) * kmPerMin;
}

/** Local speed of the front (m/s) at a given km. */
export function frontSpeedMsAtKm(s: Scenario, km: number): number {
  const a = s.arrival;
  let i = a.findIndex((x) => x.km >= km);
  if (i === -1) i = a.length - 1;
  if (i === 0) i = 1;
  const p = a[i - 1], q = a[i];
  return ((q.km - p.km) * 1000) / ((q.min - p.min) * 60);
}

/* ------------------------------------------------------------------
   Deterministic pseudo-random noise (same input → same run)
------------------------------------------------------------------- */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ------------------------------------------------------------------
   Run the engine on a scenario
------------------------------------------------------------------- */
/** What-if: replace the arrival anchors with one constant speed (illustrative scenarios only). */
export function withConstantSpeed(base: Scenario, speedMs: number): Scenario {
  const ms = Math.min(RULES.maxSpeedMs, Math.max(1, speedMs));
  const farKm = Math.max(base.gaugeKm, ...base.villages.map((v) => v.km), ...base.nodesKm) * 1.1;
  const farMin = (farKm * 1000) / ms / 60;
  const lastArrival = (Math.max(base.gaugeKm, ...base.villages.map((v) => v.km)) * 1000) / ms / 60;
  return {
    ...base,
    arrival: [
      { km: 0, min: 0, label: "Trigger" },
      { km: farKm, min: farMin, label: `${round(ms, 1)} m/s (what-if)` },
    ],
    durationMin: Math.max(30, Math.ceil(lastArrival * 1.08 + 5)),
  };
}

export function runScenario(base: Scenario, opts: RunOptions & { gatewayFailAtMin?: number | null } = {}): RunResult {
  const floodSpeedMs = opts.floodSpeedMs ?? null;
  const scenario = floodSpeedMs ? withConstantSpeed(base, floodSpeedMs) : base;
  const heartbeatS = Math.max(5, opts.heartbeatS ?? scenario.heartbeatS);
  const procDelayS = Math.max(0, opts.procDelayS ?? scenario.procDelayS);
  const geophoneRangeKm = opts.geophoneRangeKm ?? scenario.geophoneRangeKm;
  const wanDownFromMin = opts.wanDownFromMin ?? null;
  const eocGsm = !!opts.eocGsm;
  const gatewayFailAtMin = opts.gatewayFailAtMin ?? null;
  const endS = Math.round(scenario.durationMin * 60);
  const procMin = procDelayS / 60;

  // --- node tracks
  const nodes: NodeTrack[] = scenario.nodesKm
    .slice()
    .sort((a, b) => a - b)
    .map((km, i) => {
      const hitMin = arrivalMinAtKm(scenario, km);
      const r = RTU_ROLES[Math.min(i, RTU_ROLES.length - 1)];
      return {
        id: `RTU${i + 1}`,
        label: `RTU${i + 1} · ${r.short} · ${km} km`,
        role: r.role,
        name: r.name,
        booster: r.booster,
        km,
        hitMin,
        risingFromMin: Math.max(0, hitMin - scenario.rampS / 60),
        shakingFromMin: km <= geophoneRangeKm ? 0.1 : null,
        silenceDetectedMin: null,
        readings: [],
      };
    });

  type NodeState = {
    lastSeenS: number;
    eventMode: boolean;
    vibAt: number | null;
    riseAt: number | null;
    silentAt: number | null;
    lastLevel: number;
    rand: () => number;
  };
  const ns: NodeState[] = nodes.map((_, i) => ({ lastSeenS: -1, eventMode: false, vibAt: null, riseAt: null, silentAt: null, lastLevel: 0, rand: rng(1000 + i * 77) }));

  const evidence: Evidence[] = [];
  let evId = 0;
  const addEv = (e: Omit<Evidence, "id">) => evidence.push({ id: `e${++evId}`, ...e });

  const stateTimes: RunResult["stateTimes"] = {};
  let state: AlertState = "NORMAL";
  const escalate = (to: AlertState, tMin: number, rule: string, why: string) => {
    if (STATE_RANK[to] <= STATE_RANK[state]) return;
    // never skip a level: fill any missed levels at the same instant
    for (const s of ["WATCH", "WARNING", "EMERGENCY"] as const) {
      if (STATE_RANK[s] <= STATE_RANK[to] && stateTimes[s] === undefined) stateTimes[s] = tMin;
    }
    state = to;
    addEv({ t: tMin, kind: "state", rule, title: `State → ${to}`, detail: why, state: to });
  };

  const deaths: { node: string; km: number; deathMin: number; detectedMin: number }[] = [];
  const speedEstimates: SpeedEstimate[] = [];
  let gatewayFlagged = false;

  for (let s = 0; s <= endS; s++) {
    const tMin = s / 60;
    const gatewayDown = gatewayFailAtMin !== null && tMin >= gatewayFailAtMin;

    // 1) readings
    nodes.forEach((n, i) => {
      const st = ns[i];
      if (tMin >= n.hitMin) return; // destroyed by the front
      const rising = tMin >= n.risingFromMin;
      const shaking = n.shakingFromMin !== null && tMin >= n.shakingFromMin;
      const debris = rising; // debris flow passing also shakes the ground
      const interval = rising || shaking ? RULES.burstS : heartbeatS;
      if (st.lastSeenS >= 0 && s - st.lastSeenS < interval) return;
      // produce a reading
      const r = st.rand;
      const rate = rising ? 45 + r() * 75 : (r() - 0.5) * 0.8;
      const level = rising ? st.lastLevel + (rate * (s - Math.max(st.lastSeenS, 0))) / 60 : 0.3 + (r() - 0.5) * 0.6;
      const vib = shaking ? 3.2 + r() * 4.5 : debris ? 2.4 + r() * 3 : 0.25 + r() * 0.35;
      st.lastLevel = level;
      if (gatewayDown) {
        st.lastSeenS = s; // the node transmits, but nothing reaches the broker
        return;
      }
      st.lastSeenS = s;
      st.eventMode = rising || shaking;
      const reading: Reading = { t: round(tMin, 3), level: round(level), rate: round(rate), vib: round(vib, 2) };
      n.readings.push(reading);

      // anomaly bookkeeping
      if (vib >= RULES.vibMmS && st.vibAt === null) {
        st.vibAt = tMin;
        addEv({
          t: tMin,
          kind: "vibration",
          node: n.id,
          rule: "R1",
          title: `${n.id} feels ground vibration`,
          detail: `Geophone at ${n.km} km is above threshold.`,
          values: [`vib ${reading.vib} mm/s ≥ ${RULES.vibMmS}`],
        });
      }
      if (rate >= RULES.riseCmMin && st.riseAt === null) {
        st.riseAt = tMin;
        addEv({
          t: tMin,
          kind: "rise",
          node: n.id,
          rule: "R1",
          title: `${n.id} water rising fast`,
          detail: `Ultrasonic level at ${n.km} km is climbing.`,
          values: [`rate ${reading.rate} cm/min ≥ ${RULES.riseCmMin}`, `level +${reading.level} cm`],
        });
      }
    });

    // 2) silence detection (only nodes we have heard from)
    if (s % 1 === 0) {
      const newlySilent: number[] = [];
      nodes.forEach((n, i) => {
        const st = ns[i];
        if (st.silentAt !== null || st.lastSeenS < 0) return;
        const lastHeard = n.readings.length ? n.readings[n.readings.length - 1].t * 60 : -1;
        if (lastHeard < 0) return;
        const limit = st.eventMode ? RULES.burstS * RULES.missedBursts : heartbeatS * RULES.missedHeartbeats;
        if (s - lastHeard > limit) {
          st.silentAt = tMin;
          n.silenceDetectedMin = tMin;
          newlySilent.push(i);
        }
      });

      if (newlySilent.length) {
        const silentNow = ns.filter((x) => x.silentAt !== null && tMin - (x.silentAt ?? 0) <= RULES.gatewayWindowS / 60).length;
        const anyAnomalyInBatch = newlySilent.some((i) => ns[i].vibAt !== null || ns[i].riseAt !== null);
        const gatewayLike = silentNow >= Math.max(2, Math.ceil(nodes.length * 0.75)) && !anyAnomalyInBatch;
        if (gatewayLike) {
          if (!gatewayFlagged) {
            gatewayFlagged = true;
            addEv({
              t: tMin,
              kind: "gateway",
              rule: "R6",
              title: "Gateway fault suspected",
              detail: `${silentNow} RTUs went silent together without any anomaly. Treated as a station receiver or radio fault — officials are told, the public is not.`,
              values: [`${silentNow}/${nodes.length} RTUs silent within ${RULES.gatewayWindowS} s`],
            });
          }
        } else {
          for (const i of newlySilent) {
            const n = nodes[i], st = ns[i];
            const hadAnomaly = st.vibAt !== null || st.riseAt !== null;
            const lastT = n.readings.length ? n.readings[n.readings.length - 1].t : tMin;
            if (hadAnomaly) {
              addEv({
                t: tMin,
                kind: "silence",
                node: n.id,
                rule: "R4",
                title: `${n.id} went silent after the anomaly`,
                detail: `No report for ${Math.round((tMin - lastT) * 60)} s while in event mode. Read as destroyed by the flood, not as a fault.`,
                values: [`last heard ${fmtT(lastT, true)}`, `${RULES.missedBursts} bursts missed`],
              });
              deaths.push({ node: n.id, km: n.km, deathMin: lastT, detectedMin: tMin });
              // speed estimate from consecutive deaths
              if (deaths.length >= 2) {
                const a = deaths[deaths.length - 2], b = deaths[deaths.length - 1];
                const dt = (b.deathMin - a.deathMin) * 60;
                if (b.km > a.km && dt > 0) {
                  const ms = Math.min(RULES.maxSpeedMs, Math.max(RULES.minSpeedMs, ((b.km - a.km) * 1000) / dt));
                  speedEstimates.push({ t: tMin, ms: round(ms, 1), basis: `${a.node} → ${b.node}: ${b.km - a.km} km in ${Math.round(dt)} s` });
                  addEv({
                    t: tMin,
                    kind: "speed",
                    rule: "ETA",
                    title: `Wave speed ≈ ${round(ms, 1)} m/s`,
                    detail: `Measured between ${a.node} (${a.km} km) and ${b.node} (${b.km} km). Village arrival times updated.`,
                    values: [`${b.km - a.km} km in ${Math.round(dt)} s`],
                  });
                }
              }
            } else {
              addEv({
                t: tMin,
                kind: "info",
                node: n.id,
                rule: "HB",
                title: `${n.id} missed heartbeats`,
                detail: "Silent without any anomaly — flagged for maintenance, no alert.",
              });
            }
          }
        }
      }
    }

    // 3) rules → state
    if (gatewayFlagged && deaths.length === 0 && ns.every((x) => x.vibAt === null && x.riseAt === null)) {
      // gateway fault with no physical evidence: hold state
      continue;
    }
    const vibNodes = ns.filter((x) => x.vibAt !== null).length;
    const riseNodes = ns.filter((x) => x.riseAt !== null).length;
    if (state === "NORMAL" && (vibNodes > 0 || riseNodes > 0)) {
      const first = evidence.find((e) => e.kind === "vibration" || e.kind === "rise");
      escalate("WATCH", tMin, "R1", `${first?.node ?? "An RTU"} reported an anomaly. ${RULE_TEXT.R7.split("· ")[1]}.`);
    }
    if (STATE_RANK[state] < STATE_RANK.WARNING) {
      const both = nodes.find((_, i) => ns[i].vibAt !== null && ns[i].riseAt !== null);
      if (both) {
        addEv({
          t: tMin,
          kind: "corroboration",
          node: both.id,
          rule: "R2",
          title: `${both.id}: rise and vibration agree`,
          detail: "Two independent sensors at the same site point to the same thing — a moving flood.",
        });
        escalate("WARNING", tMin, "R2", `Corroborated at ${both.id}. Residents are warned.`);
      } else if (riseNodes >= 2) {
        escalate("WARNING", tMin, "R3", "Rate-of-rise at two RTUs. Residents are warned.");
      } else if (deaths.length >= 1) {
        escalate("WARNING", tMin, "R4", `${deaths[0].node} went silent after an anomaly. Residents are warned.`);
      }
    }
    if (STATE_RANK[state] < STATE_RANK.EMERGENCY && deaths.length >= 2) {
      const [a, b] = deaths;
      if (b.km > a.km) escalate("EMERGENCY", tMin, "R5", `${a.node} then ${b.node} died in order — the wave is moving downstream. Evacuate.`);
    }
  }

  const predictArrival = (km: number, tMin: number) => predictArrivalFrom(deaths, speedEstimates, km, tMin);

  // --- broadcast
  const channels = (opts.channels ?? defaultChannels()).map((c) => ({ ...c, latencyS: Math.max(0, c.latencyS) }));
  const chMap = Object.fromEntries(channels.map((c) => [c.id, c]));
  const baseGroups = (opts.groups ?? defaultGroups(false)).map((g) => ({ ...g, dispatchS: Math.max(0, g.dispatchS) }));
  const groups = eocGsm ? applyEocGsm(baseGroups) : baseGroups;
  const wanBlocked = (sendMin: number) => wanDownFromMin !== null && sendMin >= wanDownFromMin;

  const deliveries: Delivery[] = [];
  for (const g of groups) {
    const st = stateTimes[g.trigger];
    if (st === undefined) continue;
    const sendMin = st + procMin + g.dispatchS / 60;
    for (const cid of g.channels) {
      const c = chMap[cid];
      if (!c || !c.enabled) continue;
      const blocked = c.needsWan && wanBlocked(sendMin);
      deliveries.push({
        id: `${g.id}-${c.id}`,
        group: g.id,
        groupName: g.name,
        channel: c.id,
        channelName: c.name,
        trigger: g.trigger,
        sendMin,
        deliverMin: sendMin + c.latencyS / 60,
        blocked,
        reason: blocked ? "Needs the WAN uplink, which is down" : undefined,
      });
    }
  }
  deliveries.sort((a, b) => a.sendMin - b.sendMin || a.deliverMin - b.deliverMin);

  const groupSummaries: GroupSummary[] = groups.map((g) => {
    const ds = deliveries.filter((d) => d.group === g.id);
    const ok = ds.filter((d) => !d.blocked);
    return {
      id: g.id,
      name: g.name,
      firstDeliveryMin: ok.length ? Math.min(...ok.map((d) => d.deliverMin)) : null,
      blockedAll: ds.length > 0 && ok.length === 0,
      channels: g.channels,
    };
  });

  // --- gauge comparison (same channels, triggered when the water reaches the gauge)
  const gaugeCross = arrivalMinAtKm(scenario, scenario.gaugeKm);
  const publicGroups = groups.filter((g) => g.public);
  const gaugeSend = gaugeCross + procMin;
  const gaugeLat = publicGroups.flatMap((g) => g.channels.map((cid) => chMap[cid]).filter((c) => c && c.enabled && !(c.needsWan && wanBlocked(gaugeSend))));
  const gaugeWarn = gaugeLat.length ? gaugeSend + Math.min(...gaugeLat.map((c) => c.latencyS)) / 60 : null;

  const firstPublic = (() => {
    const ok = deliveries.filter((d) => !d.blocked && publicGroups.some((g) => g.id === d.group));
    return ok.length ? Math.min(...ok.map((d) => d.deliverMin)) : null;
  })();

  const villages: VillageResult[] = scenario.villages.map((v) => {
    const arrivalMin = arrivalMinAtKm(scenario, v.km);
    const leadG = firstPublic !== null ? arrivalMin - firstPublic : null;
    const leadL = gaugeWarn !== null ? arrivalMin - gaugeWarn : null;
    return {
      ...v,
      arrivalMin,
      gangaWarnMin: firstPublic,
      gaugeWarnMin: gaugeWarn,
      leadGangaMin: leadG !== null && leadG > 0 ? leadG : null,
      leadGaugeMin: leadL !== null && leadL > 0 ? leadL : null,
      predictedArrivalMin: firstPublic !== null ? predictArrival(v.km, firstPublic) : null,
    };
  });

  // --- findings
  const findings: string[] = [];
  const wanDown = wanDownFromMin !== null;
  for (const gs of groupSummaries) {
    if (gs.blockedAll) findings.push(`${gs.name}: nothing gets through while the WAN is down — every channel this group uses needs the cloud. Fix: add local GSM SMS.`);
  }
  if (wanDown && groupSummaries.find((g) => g.id === "residents")?.firstDeliveryMin != null) {
    findings.push("Residents are still warned with the WAN down: the LoRa siren and the local GSM modem work without the internet.");
  }
  if (firstPublic !== null && scenario.realFirstSmsMin) {
    findings.push(`First public warning at ${fmtT(firstPublic)} versus the first real SMS at T+${scenario.realFirstSmsMin} min.`);
  }
  const protectedByGauge = villages.filter((v) => (v.leadGaugeMin ?? 0) >= 10).length;
  findings.push(`A threshold gauge at ${scenario.gaugeKm} km gives ${protectedByGauge} of ${villages.length} villages 10+ minutes; GANGA gives ${villages.filter((v) => (v.leadGangaMin ?? 0) >= 10).length}.`);

  return {
    scenario,
    options: { heartbeatS, eocGsm, geophoneRangeKm, wanDownFromMin, procDelayS, floodSpeedMs },
    groupConfig: groups,
    stateTimes,
    nodes,
    evidence: evidence.sort((a, b) => a.t - b.t),
    speedEstimates,
    deaths,
    villages,
    gauge: { km: scenario.gaugeKm, crossMin: gaugeCross, warnMin: gaugeWarn },
    deliveries,
    groups: groupSummaries,
    channels,
    findings,
    summary: {
      firstPublicWarningMin: firstPublic,
      firstGaugeWarningMin: gaugeWarn,
      villagesWithLead10Ganga: villages.filter((v) => (v.leadGangaMin ?? 0) >= 10).length,
      villagesWithLead10Gauge: protectedByGauge,
      villageCount: villages.length,
      realFirstSmsMin: scenario.realFirstSmsMin ?? null,
    },
  };
}

/** What the engine believes about arrival at `km`, using only what it knew at time `tMin`. */
export function predictArrivalFrom(
  deaths: RunResult["deaths"],
  speedEstimates: SpeedEstimate[],
  km: number,
  tMin: number
): number {
  const known = deaths.filter((d) => d.detectedMin <= tMin);
  const sp = speedEstimates.filter((x) => x.t <= tMin);
  const ms = sp.length ? sp[sp.length - 1].ms : RULES.priorSpeedMs;
  if (!known.length) return (km * 1000) / ms / 60;
  const last = known[known.length - 1];
  if (km <= last.km) return last.deathMin;
  return last.deathMin + ((km - last.km) * 1000) / ms / 60;
}

export function predictedArrivalAt(run: RunResult, km: number, tMin: number): number {
  return predictArrivalFrom(run.deaths, run.speedEstimates, km, tMin);
}

/* ------------------------------------------------------------------
   Time helpers and per-instant views (for playback)
------------------------------------------------------------------- */
export function fmtT(min: number | null | undefined, seconds = false): string {
  if (min === null || min === undefined || !isFinite(min)) return "—";
  const total = Math.max(0, Math.round(min * 60));
  const m = Math.floor(total / 60), s = total % 60;
  return seconds || s ? `T+${m}:${String(s).padStart(2, "0")}` : `T+${m} min`;
}

/** Local wall-clock time for minute t after the trigger, e.g. "08:38:24". */
export function clockAt(s: Scenario, min: number, withSeconds = true): string {
  const [h, m] = s.triggerClock.split(":").map(Number);
  const total = Math.round((h * 60 + m) * 60 + min * 60);
  const hh = Math.floor(total / 3600) % 24, mm = Math.floor(total / 60) % 60, ss = total % 60;
  const base = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return withSeconds ? `${base}:${String(ss).padStart(2, "0")}` : base;
}

export function stateAt(run: RunResult, t: number): AlertState {
  const st = run.stateTimes;
  if (st.EMERGENCY !== undefined && t >= st.EMERGENCY) return "EMERGENCY";
  if (st.WARNING !== undefined && t >= st.WARNING) return "WARNING";
  if (st.WATCH !== undefined && t >= st.WATCH) return "WATCH";
  return "NORMAL";
}

export type NodeStatus = "alive" | "anomaly" | "silent" | "destroyed-unseen";

export function nodeStatusAt(node: NodeTrack, t: number): NodeStatus {
  if (node.silenceDetectedMin !== null && t >= node.silenceDetectedMin) return "silent";
  if (t >= node.hitMin) return "destroyed-unseen";
  const anomalous = (node.shakingFromMin !== null && t >= node.shakingFromMin) || t >= node.risingFromMin;
  return anomalous ? "anomaly" : "alive";
}

export function latestReading(node: NodeTrack, t: number) {
  let last = null as NodeTrack["readings"][number] | null;
  for (const r of node.readings) {
    if (r.t > t) break;
    last = r;
  }
  return last;
}

export type VillageStatus = "normal" | "warned" | "flooded";

export function villageStatusAt(v: VillageResult, t: number): VillageStatus {
  if (t >= v.arrivalMin) return "flooded";
  if (v.gangaWarnMin !== null && t >= v.gangaWarnMin) return "warned";
  return "normal";
}

export type DeliveryStatus = "waiting" | "sending" | "delivered" | "blocked";

export function deliveryStatusAt(d: Delivery, t: number): DeliveryStatus {
  if (d.blocked) return "blocked";
  if (t >= d.deliverMin) return "delivered";
  if (t >= d.sendMin) return "sending";
  return "waiting";
}

export function evidenceUntil(run: RunResult, t: number) {
  return run.evidence.filter((e) => e.t <= t);
}
