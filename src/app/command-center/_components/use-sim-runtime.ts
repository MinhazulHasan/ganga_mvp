"use client";

import * as React from "react";
import { scenarioList } from "@/lib/engine";
import { useCommandStore } from "@/lib/stores/command-store";
import { currentRun, SPEEDS, useSim, type Speed } from "./sim-store";
import {
  cutWan,
  finishPlayback,
  openBroadcast,
  openWhatIf,
  pause,
  play,
  reset,
  resetBroadcast,
  resetWhatIfs,
  seek,
  seekBy,
  setEocGsm,
  setScenario,
  setSpeed,
  setWhatIf,
  toggleWan,
  togglePlay,
  jumpToState,
} from "./sim-actions";
import { parseTimeParam } from "./format";
import { commandIcons } from "./command-icons";
import type { WhatIf } from "./what-if-model";

/** Advance the playhead with requestAnimationFrame while playing. */
export function usePlaybackLoop() {
  const playing = useSim((s) => s.playing);
  React.useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); // clamp: background tabs resume smoothly
      last = now;
      const s = useSim.getState();
      if (!s.scrubbing) {
        // Effective scenario: a flood-speed what-if changes the replay length.
        const end = currentRun().scenario.durationMin;
        const next = s.t + (dt * s.speed) / 60;
        if (next >= end) {
          finishPlayback();
          return;
        }
        useSim.setState({ t: next });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Leaving the page pauses the replay (state is kept for when you come back).
  React.useEffect(() => () => pause(), []);
}

const TYPING = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
/** Modal or menu contexts own the keyboard completely. */
const MODAL = "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']";
/** Elements that already react to Space. */
const SPACE_OWNERS = "button, a, summary, [role='button'], [role='switch'], [role='radio'], [role='tab'], [role='checkbox'], [role='slider']";
/** Elements that already react to the arrow keys. */
const ARROW_OWNERS = "[role='slider'], [role='tablist'], [role='tab']";

/** Space = play/pause · ←/→ = ±10 s (Shift ±1 min) · W = cut/restore the WAN. */
export function useKeyboardShortcuts() {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat && (e.key === " " || e.key.toLowerCase() === "w")) return;
      if (useCommandStore.getState().open) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest(TYPING) || el?.closest(MODAL)) return;

      if (e.key === " ") {
        if (el?.closest(SPACE_OWNERS)) return; // let focused controls handle Space natively
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (el?.closest(ARROW_OWNERS)) return;
        e.preventDefault();
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        seekBy(dir * (e.shiftKey ? 1 : 10 / 60));
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        toggleWan();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Page actions in the ⌘K menu. Labels follow the live state. */
export function useCommandActions() {
  const register = useCommandStore((s) => s.register);
  const playing = useSim((s) => s.playing);
  const wanCut = useSim((s) => s.wanDownFromMin !== null);
  const eocGsm = useSim((s) => s.eocGsm);
  const scenarioId = useSim((s) => s.scenarioId);

  React.useEffect(() => {
    const group = "Command Center";
    const I = commandIcons;
    return register([
      {
        id: "cc-play",
        group,
        label: playing ? "Pause the replay" : "Play the replay",
        icon: playing ? I.pause : I.play,
        shortcut: "Space",
        keywords: ["play", "pause", "start", "stop", "replay"],
        run: togglePlay,
      },
      ...(["WATCH", "WARNING", "EMERGENCY"] as const).map((st) => ({
        id: `cc-jump-${st}`,
        group,
        label: `Jump to ${st}`,
        icon: I[st],
        keywords: ["jump", "seek", "state", st.toLowerCase()],
        run: () => jumpToState(st),
      })),
      {
        id: "cc-wan",
        group,
        label: wanCut ? "Restore the WAN" : "Cut the WAN",
        icon: wanCut ? I.plug : I.unplug,
        shortcut: "W",
        keywords: ["wan", "internet", "uplink", "outage", "network"],
        run: toggleWan,
      },
      {
        id: "cc-sms",
        group,
        label: eocGsm ? "Remove the local SMS fix" : "Add local SMS to EOC & operators",
        icon: I.sms,
        keywords: ["gsm", "sms", "eoc", "operators", "fix"],
        run: () => setEocGsm(!useSim.getState().eocGsm),
      },
      { id: "cc-reset", group, label: "Reset the replay", icon: I.reset, keywords: ["reset", "restart", "start over"], run: () => reset() },
      {
        id: "cc-whatif-open",
        group,
        label: "Open what-if",
        icon: I.whatIf,
        keywords: ["what if", "whatif", "heartbeat", "geophone", "processing delay", "flood speed", "sliders", "assumptions"],
        // after the ⌘K dialog has closed, so its focus return does not land on top of the panel
        run: () => afterCommandMenu(openWhatIf),
      },
      {
        id: "cc-whatif-reset",
        group,
        label: "Reset what-ifs",
        icon: I.undo,
        keywords: ["what if", "whatif", "reset", "defaults", "baseline"],
        run: () => resetWhatIfs(),
      },
      {
        id: "cc-broadcast-open",
        group,
        label: "Open broadcast settings",
        icon: I.broadcast,
        keywords: ["broadcast", "channels", "groups", "recipients", "sms", "siren", "latency", "template", "message"],
        run: () => afterCommandMenu(openBroadcast),
      },
      {
        id: "cc-broadcast-reset",
        group,
        label: "Reset broadcast to team defaults",
        icon: I.undo,
        keywords: ["broadcast", "channels", "groups", "reset", "defaults"],
        run: () => resetBroadcast(),
      },
      ...scenarioList
        .filter((s) => s.id !== scenarioId)
        .map((s) => ({
          id: `cc-scenario-${s.id}`,
          group,
          label: `Switch scenario: ${s.shortName}`,
          icon: I.scenario,
          keywords: ["scenario", "switch", s.name],
          run: () => setScenario(s.id),
        })),
    ]);
  }, [register, playing, wanCut, eocGsm, scenarioId]);
}

/** Run `fn` once the ⌘K dialog has left the DOM (its exit animation ends with a focus return). */
function afterCommandMenu(fn: () => void) {
  const start = performance.now();
  const tick = () => {
    if (document.querySelector("[cmdk-root]") && performance.now() - start < 800) requestAnimationFrame(tick);
    else fn();
  };
  requestAnimationFrame(tick);
}

/**
 * Demo-friendly URL parameters, applied once on load:
 * ?scenario=template · ?speed=120 · ?eocGsm=1 · ?wan=down · ?t=5 (minutes, or m:ss) · ?autoplay=1
 * What-ifs: ?hb=120 (heartbeat s) · ?geo=0 (geophone range km) · ?proc=70 (processing delay s) · ?flood=12 (m/s, illustrative only)
 */
export function useUrlParams() {
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if ([...q.keys()].length === 0) return;
    const sc = q.get("scenario");
    if (sc && scenarioList.some((s) => s.id === sc)) setScenario(sc as (typeof scenarioList)[number]["id"], { silent: true });
    const sp = Number(q.get("speed"));
    if ((SPEEDS as readonly number[]).includes(sp)) setSpeed(sp as Speed, { silent: true });
    if (q.get("eocGsm") === "1") setEocGsm(true, { silent: true });
    if (q.get("wan") === "down") cutWan({ at: 0, silent: true });
    const num = (k: string) => {
      const raw = q.get(k)?.trim();
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : undefined;
    };
    const wi: Partial<WhatIf> = { heartbeatS: num("hb"), geophoneRangeKm: num("geo"), procDelayS: num("proc"), floodSpeedMs: num("flood") };
    const given = Object.fromEntries(Object.entries(wi).filter(([, v]) => v !== undefined)) as Partial<WhatIf>;
    if (Object.keys(given).length) setWhatIf(given, { silent: true });
    const t = parseTimeParam(q.get("t") ?? "");
    if (t !== null) seek(t);
    if (q.get("autoplay") === "1") play();
  }, []);
}
