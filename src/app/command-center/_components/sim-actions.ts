"use client";

import { toast } from "sonner";
import { clockAt, fmtT, getScenario, type Channel, type ChannelId, type Group, type GroupId, type ScenarioId } from "@/lib/engine";
import type { AlertState } from "@/lib/alert-state";
import { currentRun, initialSim, useSim, type Selection, type Speed } from "./sim-store";
import { isWhatIfDefault, normalizeWhatIf, sameWhatIf, whatIfDefaults, type WhatIf } from "./what-if-model";
import {
  inlineShort,
  isTeamBroadcast,
  isTeamChannel,
  NEW_GROUP_TEMPLATE,
  nextId,
  nextName,
  orderChannels,
  shortFor,
  TEAM_BROADCAST,
  type BroadcastConfig,
} from "./broadcast-model";

/*
 * Every user-facing action lives here, so buttons, keyboard shortcuts and ⌘K
 * share one code path — and one piece of feedback (state change and/or toast).
 */

const get = () => useSim.getState();
const set = useSim.setState;
let wanEventId = 0;

/** Length of the replay. Uses the effective scenario: a flood-speed what-if changes it. */
export const durationNow = () => currentRun().scenario.durationMin;

function stamp(min: number) {
  const s = currentRun().scenario;
  return `${clockAt(s, min)} · ${fmtT(min, true)}`;
}

/* ---------------------------------------------------------------- playback */

export function seek(t: number) {
  const next = Math.min(durationNow(), Math.max(0, t));
  set({ t: next, trend: next >= get().t ? 1 : -1 });
}

export const seekBy = (deltaMin: number) => seek(get().t + deltaMin);

export function play() {
  if (get().t >= durationNow() - 1e-9) set({ t: 0, trend: -1 });
  set({ playing: true });
}

export function pause() {
  set({ playing: false });
}

export function togglePlay() {
  if (get().playing) pause();
  else play();
}

export function setScrubbing(scrubbing: boolean) {
  set({ scrubbing });
}

export function finishPlayback() {
  const d = durationNow();
  set({ t: d, playing: false });
  toast("Replay finished", { id: "cc-end", description: stamp(d) });
}

export function setSpeed(speed: Speed, opts: { silent?: boolean } = {}) {
  if (get().speed === speed) return;
  set({ speed });
  if (opts.silent) return;
  const per = speed >= 60 ? `${speed / 60} min` : `${speed} s`;
  toast(`Speed ${speed}×`, { id: "cc-speed", description: `1 s = ${per} of the event` });
}

export function jumpToState(state: Exclude<AlertState, "NORMAL">) {
  const at = currentRun().stateTimes[state];
  if (at === undefined) {
    toast(`No ${state} in this run`, { id: "cc-jump" });
    return;
  }
  seek(at);
  toast(`Jumped to ${state}`, { id: "cc-jump", description: stamp(at) });
}

export function jumpTo(min: number, label: string) {
  seek(min);
  toast(`Jumped to ${label}`, { id: "cc-jump", description: stamp(min) });
}

/* ---------------------------------------------------------------- scenario */

export function setScenario(id: ScenarioId, opts: { silent?: boolean } = {}) {
  if (get().scenarioId === id) return;
  const hadWhatIf = whatIfActive();
  const s = getScenario(id);
  set({ scenarioId: id, t: 0, trend: -1, playing: false, wanDownFromMin: null, wanLog: [], sheetOpen: false, whatIf: whatIfDefaults(s) });
  if (opts.silent) return;
  toast(`Scenario: ${s.shortName}`, {
    id: "cc-scenario",
    description: `Reset to T+0. WAN up.${hadWhatIf ? " What-ifs reset." : ""}`,
  });
}

export function reset(opts: { silent?: boolean } = {}) {
  const { scenarioId, speed, whatIf, broadcast, broadcastRev, whatIfOpen, broadcastOpen } = get();
  const kept = [whatIfActive() && "what-ifs", broadcastCustom() && "broadcast settings"].filter(Boolean);
  set({ ...initialSim, scenarioId, speed, trend: -1, whatIf, broadcast, broadcastRev, whatIfOpen, broadcastOpen });
  if (!opts.silent)
    toast("Replay reset", {
      id: "cc-reset",
      description: `T+0:00 · WAN up · local SMS fix off${kept.length ? ` · ${kept.join(" and ")} kept` : ""}`,
    });
}

/* ---------------------------------------------------------------- network */

const cloudChannels = () =>
  currentRun()
    .channels.filter((c) => c.needsWan && c.enabled)
    .map(inlineShort);

export function cutWan(opts: { at?: number; silent?: boolean } = {}) {
  if (get().wanDownFromMin !== null) return;
  const at = opts.at ?? get().t;
  set((s) => ({ wanDownFromMin: at, wanLog: [...s.wanLog, { id: ++wanEventId, kind: "cut", at }] }));
  if (opts.silent) return;
  toast(`WAN cut at ${clockAt(getScenario(get().scenarioId), at)}`, {
    id: "cc-wan",
    description: "Cellular and satellite both down. Siren and local SMS still work.",
  });
}

export function restoreWan(opts: { silent?: boolean } = {}) {
  if (get().wanDownFromMin === null) return;
  const at = get().t;
  set((s) => ({ wanDownFromMin: null, wanLog: [...s.wanLog, { id: ++wanEventId, kind: "restore", at }] }));
  if (opts.silent) return;
  const cloud = cloudChannels();
  toast(`WAN restored at ${clockAt(getScenario(get().scenarioId), at)}`, {
    id: "cc-wan",
    description: cloud.length ? `Back: ${cloud.join(", ")}` : undefined,
  });
}

export function toggleWan() {
  if (get().wanDownFromMin === null) cutWan();
  else restoreWan();
}

export function setEocGsm(on: boolean, opts: { silent?: boolean } = {}) {
  if (get().eocGsm === on) return;
  set({ eocGsm: on });
  if (opts.silent) return;
  if (on) {
    toast.success("Local SMS added for EOC and operators", {
      id: "cc-eoc",
      description: "Works with or without the WAN.",
    });
  } else {
    toast("Local SMS fix removed", { id: "cc-eoc", description: "EOC and operators back on cloud channels." });
  }
}

/* ---------------------------------------------------------------- what-if */

export const whatIfActive = () => !isWhatIfDefault(get().whatIf, getScenario(get().scenarioId));

/** Keep the playhead where it is, clamped to the (possibly new) replay length. */
function clampPlayhead() {
  const d = durationNow();
  if (get().t > d) set({ t: d, trend: -1 });
}

export function setWhatIf(patch: Partial<WhatIf>, opts: { silent?: boolean } = {}) {
  const s = getScenario(get().scenarioId);
  const before = get().whatIf;
  const next = normalizeWhatIf({ ...before, ...patch }, s);
  if (sameWhatIf(next, before)) return;
  const wasDefault = isWhatIfDefault(before, s);
  set({ whatIf: next });
  clampPlayhead();
  // With the panel open, its readout and the title badge already say so; a toast would only cover it.
  if (!opts.silent && !get().whatIfOpen && wasDefault && !isWhatIfDefault(next, s)) {
    toast("What-if on", {
      id: "cc-whatif",
      description:
        s.kind === "reconstructed"
          ? "Engine re-ran. No longer the reconstructed baseline."
          : "Engine re-ran with your values.",
    });
  }
}

export function resetWhatIfs(opts: { silent?: boolean } = {}) {
  const s = getScenario(get().scenarioId);
  if (!whatIfActive()) {
    if (!opts.silent) toast("Already at defaults", { id: "cc-whatif" });
    return;
  }
  set({ whatIf: whatIfDefaults(s) });
  clampPlayhead();
  if (opts.silent) return;
  toast("What-ifs reset", {
    id: "cc-whatif",
    description: `Heartbeat ${s.heartbeatS} s · geophones ${s.geophoneRangeKm} km · processing ${s.procDelayS} s`,
  });
}

export function setWhatIfOpen(open: boolean) {
  if (get().whatIfOpen !== open) set({ whatIfOpen: open });
}

export function openWhatIf() {
  set({ whatIfOpen: true, sheetOpen: false, broadcastOpen: false });
}

/* ---------------------------------------------------------------- broadcast */

export const broadcastCustom = () => !isTeamBroadcast(get().broadcast);

const setBroadcast = (broadcast: BroadcastConfig) => set({ broadcast });

/** Replace the whole config (reset/undo) and remount the editor fields so drafts follow. */
function replaceBroadcast(broadcast: BroadcastConfig) {
  set((s) => ({ broadcast, broadcastRev: s.broadcastRev + 1 }));
}

function undoAction(prev: BroadcastConfig, what: string) {
  return {
    label: "Undo",
    onClick: () => {
      replaceBroadcast(prev);
      toast(`${what} undone`, { id: "cc-broadcast" });
    },
  };
}

export function openBroadcast() {
  set({ broadcastOpen: true, sheetOpen: false, whatIfOpen: false });
}

export function setBroadcastOpen(open: boolean) {
  if (get().broadcastOpen !== open) set({ broadcastOpen: open });
}

export function updateChannel(id: ChannelId, patch: Partial<Omit<Channel, "id">>) {
  const b = get().broadcast;
  setBroadcast({
    ...b,
    channels: b.channels.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c, ...patch };
      if (patch.name !== undefined) next.short = shortFor(id, patch.name);
      return next;
    }),
  });
}

export function addChannel(): ChannelId {
  const b = get().broadcast;
  const id = nextId("custom", b.channels.map((c) => c.id));
  const name = nextName("New channel", b.channels.map((c) => c.name));
  setBroadcast({ ...b, channels: [...b.channels, { id, name, short: name, latencyS: 30, needsWan: true, enabled: true }] });
  toast("Channel added", { id: "cc-broadcast", description: `${name} · 30 s · needs WAN` });
  return id;
}

export function removeChannel(id: ChannelId) {
  if (isTeamChannel(id)) return;
  const b = get().broadcast;
  const ch = b.channels.find((c) => c.id === id);
  if (!ch) return;
  replaceBroadcast({
    channels: b.channels.filter((c) => c.id !== id),
    groups: b.groups.map((g) => (g.channels.includes(id) ? { ...g, channels: g.channels.filter((x) => x !== id) } : g)),
  });
  toast(`Removed ${ch.name}`, { id: "cc-broadcast", action: undoAction(b, "Removal") });
}

export function updateGroup(id: GroupId, patch: Partial<Omit<Group, "id">>) {
  const b = get().broadcast;
  setBroadcast({ ...b, groups: b.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
}

export function toggleGroupChannel(groupId: GroupId, channelId: ChannelId) {
  const b = get().broadcast;
  setBroadcast({
    ...b,
    groups: b.groups.map((g) => {
      if (g.id !== groupId) return g;
      const has = g.channels.includes(channelId);
      const ids = has ? g.channels.filter((c) => c !== channelId) : [...g.channels, channelId];
      return { ...g, channels: orderChannels(g.id, ids, b.channels) };
    }),
  });
}

export function addGroup(): GroupId {
  const b = get().broadcast;
  const id = nextId("group", b.groups.map((g) => g.id));
  const name = nextName("New group", b.groups.map((g) => g.name));
  setBroadcast({
    ...b,
    groups: [
      ...b.groups,
      { id, name, public: false, trigger: "WARNING", dispatchS: 0, channels: ["sms_gsm"], language: "English", template: NEW_GROUP_TEMPLATE },
    ],
  });
  toast("Group added", { id: "cc-broadcast", description: `${name} · on WARNING · local SMS` });
  return id;
}

export function removeGroup(id: GroupId) {
  const b = get().broadcast;
  const g = b.groups.find((x) => x.id === id);
  if (!g) return;
  replaceBroadcast({ ...b, groups: b.groups.filter((x) => x.id !== id) });
  toast(`Removed ${g.name}`, { id: "cc-broadcast", action: undoAction(b, "Removal") });
}

export function resetBroadcast(opts: { silent?: boolean } = {}) {
  const b = get().broadcast;
  if (isTeamBroadcast(b)) {
    if (!opts.silent) toast("Already at team defaults", { id: "cc-broadcast" });
    return;
  }
  replaceBroadcast(TEAM_BROADCAST);
  if (!opts.silent)
    toast("Broadcast reset to team defaults", {
      id: "cc-broadcast",
      description: `${TEAM_BROADCAST.channels.length} channels · ${TEAM_BROADCAST.groups.length} groups`,
      action: undoAction(b, "Reset"),
    });
}

/* ---------------------------------------------------------------- details */

export function select(selection: Selection) {
  set({ selection, sheetOpen: true });
}

export function closeSheet() {
  set({ sheetOpen: false });
}
