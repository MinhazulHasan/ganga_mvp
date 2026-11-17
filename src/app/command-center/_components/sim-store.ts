"use client";

import { create } from "zustand";
import { getScenario, runScenario, type RunResult, type ScenarioId } from "@/lib/engine";
import { isTeamBroadcast, TEAM_BROADCAST, type BroadcastConfig } from "./broadcast-model";
import { whatIfDefaults, type WhatIf } from "./what-if-model";

/** Playback speeds, in simulated seconds per real second. */
export const SPEEDS = [10, 30, 120, 600] as const;
export type Speed = (typeof SPEEDS)[number];
export const DEFAULT_SPEED: Speed = 30;

export type Selection =
  | { kind: "node"; id: string }
  | { kind: "village"; id: string }
  | { kind: "evidence"; id: string }
  | { kind: "delivery"; id: string }
  | { kind: "device"; id: string }
  | { kind: "assumptions" };

export interface WanEvent {
  id: number;
  kind: "cut" | "restore";
  /** minute after the trigger, in simulated time */
  at: number;
}

export interface SimState {
  scenarioId: ScenarioId;
  /** playhead, minutes after the trigger */
  t: number;
  playing: boolean;
  speed: Speed;
  /** null = WAN up for the whole run; otherwise the minute the uplink went down */
  wanDownFromMin: number | null;
  eocGsm: boolean;
  wanLog: WanEvent[];
  /** direction of the last discrete jump (drives the clock's digit roll) */
  trend: 1 | -1;
  /** true while the user drags the scrubber (the loop holds the playhead) */
  scrubbing: boolean;
  selection: Selection | null;
  sheetOpen: boolean;
  /** What-if inputs (defaults = the scenario's own values). */
  whatIf: WhatIf;
  /** Broadcast channels and groups (defaults = the team model). */
  broadcast: BroadcastConfig;
  /** Bumped when the broadcast config is replaced from outside the editor fields (reset, undo). */
  broadcastRev: number;
  whatIfOpen: boolean;
  broadcastOpen: boolean;
}

export const initialSim: SimState = {
  scenarioId: "aug26",
  t: 0,
  playing: false,
  speed: DEFAULT_SPEED,
  wanDownFromMin: null,
  eocGsm: false,
  wanLog: [],
  trend: 1,
  scrubbing: false,
  selection: null,
  sheetOpen: false,
  whatIf: whatIfDefaults(getScenario("aug26")),
  broadcast: TEAM_BROADCAST,
  broadcastRev: 0,
  whatIfOpen: false,
  broadcastOpen: false,
};

/** Page-level playback store. Module scope on purpose: the replay survives a round trip to /network. */
export const useSim = create<SimState>()(() => ({ ...initialSim }));

/* ------------------------------------------------------------------
   Engine runs — pure and deterministic, so cache them by their inputs.
------------------------------------------------------------------- */
export interface RunInputs {
  scenarioId: ScenarioId;
  wanDownFromMin: number | null;
  eocGsm: boolean;
  whatIf: WhatIf;
  broadcast: BroadcastConfig;
}

const runCache = new Map<string, RunResult>();
const inputsOf = new WeakMap<RunResult, RunInputs>();
const broadcastKeys = new WeakMap<BroadcastConfig, string>();

/** Configs are replaced, never mutated, so the key is computed once per config object. */
function broadcastKey(b: BroadcastConfig): string {
  let k = broadcastKeys.get(b);
  if (k === undefined) {
    k = isTeamBroadcast(b) ? "team" : JSON.stringify(b);
    broadcastKeys.set(b, k);
  }
  return k;
}

export function getRun(i: RunInputs): RunResult {
  const w = i.whatIf;
  const key = [
    i.scenarioId,
    i.wanDownFromMin ?? "up",
    i.eocGsm ? 1 : 0,
    w.heartbeatS,
    w.geophoneRangeKm,
    w.procDelayS,
    w.floodSpeedMs ?? "-",
    broadcastKey(i.broadcast),
  ].join("|");
  const hit = runCache.get(key);
  if (hit) return hit;
  const run = runScenario(getScenario(i.scenarioId), {
    wanDownFromMin: i.wanDownFromMin,
    eocGsm: i.eocGsm,
    heartbeatS: w.heartbeatS,
    geophoneRangeKm: w.geophoneRangeKm,
    procDelayS: w.procDelayS,
    floodSpeedMs: w.floodSpeedMs,
    channels: i.broadcast.channels,
    groups: i.broadcast.groups,
  });
  if (runCache.size >= 64) {
    const oldest = runCache.keys().next().value;
    if (oldest !== undefined) runCache.delete(oldest);
  }
  runCache.set(key, run);
  inputsOf.set(run, i);
  return run;
}

const inputsFrom = (s: SimState): RunInputs => ({
  scenarioId: s.scenarioId,
  wanDownFromMin: s.wanDownFromMin,
  eocGsm: s.eocGsm,
  whatIf: s.whatIf,
  broadcast: s.broadcast,
});

/** The run for the current scenario, switches, what-ifs and broadcast settings. Changes only when an input changes. */
export function useRun(): RunResult {
  const scenarioId = useSim((s) => s.scenarioId);
  const wanDownFromMin = useSim((s) => s.wanDownFromMin);
  const eocGsm = useSim((s) => s.eocGsm);
  const whatIf = useSim((s) => s.whatIf);
  const broadcast = useSim((s) => s.broadcast);
  return getRun({ scenarioId, wanDownFromMin, eocGsm, whatIf, broadcast });
}

export function currentRun(): RunResult {
  return getRun(inputsFrom(useSim.getState()));
}

/** The same run without the local-SMS fix — used to tell whether the fix changed anything. */
export function runWithoutFix(run: RunResult): RunResult {
  const i = inputsOf.get(run);
  return i ? getRun({ ...i, eocGsm: false }) : run;
}

/** The same run with every what-if at the scenario defaults — the "before" of the what-if readout. */
export function runAtDefaults(run: RunResult): RunResult {
  const i = inputsOf.get(run);
  return i ? getRun({ ...i, whatIf: whatIfDefaults(getScenario(i.scenarioId)) }) : run;
}

/** The same run with other what-if values: a live preview while a slider moves, before it is committed. */
export function runWithWhatIf(run: RunResult, whatIf: WhatIf): RunResult {
  const i = inputsOf.get(run);
  return i ? getRun({ ...i, whatIf }) : run;
}
