"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ArrowUpRightIcon, CheckIcon, PauseIcon, PlayIcon } from "lucide-react";
import {
  aug26,
  runScenario,
  clockAt,
  stateAt,
  nodeStatusAt,
  villageStatusAt,
  frontKmAt,
  type NodeStatus,
  type RunResult,
  type VillageStatus,
} from "@/lib/engine";
import { STATE_META, type AlertState } from "@/lib/alert-state";
import { StatePill } from "@/components/brand/state-pill";
import { SimulationPill } from "@/components/brand/provenance";
import { cn } from "@/lib/utils";
import { fmtDuration, fmtElapsed, TRANSITIONS } from "./facts";
import { usePrefersReducedMotion } from "./hooks";

/** River shown on the bar, km from the avalanche site. */
const KM_MAX = 110;
/** One loop, real seconds. */
const LOOP_S = 14.5;

type FeedItem = { id: string; t: number; text: string; tag: string; tone: "state" | "alert" | "flood" | "info"; state?: AlertState };

const shortName = (name: string) => name.split(" / ")[0];
const fmtLead = (min: number) => (min < 10 ? `${min.toFixed(1)} min` : fmtDuration(min));
const pct = (km: number) => `${(Math.min(km, KM_MAX) / KM_MAX) * 100}%`;

/** Real seconds into the loop → minutes after the trigger. Slow through the decision, fast-forward down the valley. */
function keyframes(end: number): [number, number][] {
  return [
    [0, 0],
    [0.9, 0],
    [3.7, 1.6],
    [6.7, 5.6],
    [11.9, end],
    [LOOP_S, end],
  ];
}

function simAt(sec: number, frames: [number, number][]) {
  for (let i = 1; i < frames.length; i++) {
    const [s1, t1] = frames[i];
    if (sec <= s1) {
      const [s0, t0] = frames[i - 1];
      return s1 === s0 ? t1 : t0 + ((sec - s0) / (s1 - s0)) * (t1 - t0);
    }
  }
  return frames[frames.length - 1][1];
}

function speedAt(sec: number, frames: [number, number][]) {
  for (let i = 1; i < frames.length; i++) {
    const [s1, t1] = frames[i];
    if (sec <= s1) {
      const [s0, t0] = frames[i - 1];
      return s1 === s0 ? 0 : ((t1 - t0) * 60) / (s1 - s0);
    }
  }
  return 0;
}

function buildFeed(run: RunResult): FeedItem[] {
  const items: FeedItem[] = run.evidence.map((e) => ({
    id: e.id,
    t: e.t,
    text: e.title,
    tag: e.rule,
    tone: e.kind === "state" ? "state" : "info",
    state: e.state,
  }));
  const first = run.deliveries
    .filter((d) => d.group === "residents" && !d.blocked)
    .sort((a, b) => a.deliverMin - b.deliverMin)[0];
  if (first) items.push({ id: "residents", t: first.deliverMin, text: `Residents warned · ${first.channelName}`, tag: "ALERT", tone: "alert" });
  for (const v of run.villages) {
    items.push({
      id: `v-${v.id}`,
      t: v.arrivalMin,
      text: `Water reaches ${shortName(v.name)}${v.leadGangaMin ? ` · warned ${fmtLead(v.leadGangaMin)} ahead` : ""}`,
      tag: `${v.km} km`,
      tone: "flood",
    });
  }
  items.push({ id: "gauge", t: run.gauge.crossMin, text: `Gauge at ${run.gauge.km} km crosses its threshold`, tag: "GAUGE", tone: "info" });
  return items.map((it, i) => ({ ...it, order: i })).sort((a, b) => a.t - b.t || a.order - b.order);
}

const NODE_DOT: Record<NodeStatus, string> = {
  alive: "border-[2.5px] border-normal-fill bg-surface",
  anomaly: "bg-warning-fill",
  "destroyed-unseen": "bg-subtle",
  silent: "border-[1.5px] border-dashed border-muted bg-surface",
};

const VILLAGE_DOT: Record<VillageStatus, string> = {
  normal: "bg-surface-3 ring-1 ring-border-strong",
  warned: "bg-warning-fill",
  flooded: "bg-emergency-fill",
};

export function ReplayCard() {
  const run = React.useMemo(() => runScenario(aug26), []);
  const end = run.gauge.warnMin ?? aug26.durationMin;
  const frames = React.useMemo(() => keyframes(end), [end]);
  const feed = React.useMemo(() => buildFeed(run), [run]);
  const warnAt = run.summary.firstPublicWarningMin;

  const reduce = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.25 });
  const [paused, setPaused] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const playing = !reduce && !paused && inView;

  React.useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) {
        const dt = Math.min(0.05, (now - last) / 1000);
        setElapsed((e) => (e + dt) % LOOP_S);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const t = reduce ? end : simAt(elapsed, frames);
  const speed = reduce ? 0 : speedAt(elapsed, frames);
  const state = stateAt(run, t);
  const frontKm = Math.min(KM_MAX, frontKmAt(aug26, t));
  const warned = warnAt !== null && t >= warnAt;
  const recent = feed.filter((f) => f.t <= t).slice(-3).reverse();
  const next = run.villages.find((v) => v.arrivalMin > t);
  const progress = elapsed / LOOP_S;
  const meta = STATE_META[state];

  return (
    <div ref={rootRef} className="relative w-full">
      {/* soft halo behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[48px] opacity-80 blur-2xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--foreground) 7%, transparent), transparent)" }}
      />
      <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface shadow-float">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <span className="relative flex size-2" aria-hidden>
            <span className={cn("absolute inset-0 rounded-full", playing && "animate-pulse-ring", meta.fill)} />
            <span className={cn("relative size-2 rounded-full", meta.fill)} />
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]">
            Replay <span className="font-normal text-muted">· {aug26.shortName}</span>
          </p>
          <SimulationPill className="hidden sm:inline-flex" />
          {!reduce && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? "Play the replay" : "Pause the replay"}
              className="inline-flex size-8 items-center justify-center rounded-full bg-surface-2 text-muted outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60 [&_svg]:size-3.5"
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
        </div>
        {/* loop progress, tinted by the current state */}
        {!reduce && (
          <div className="h-[2px] w-full bg-surface-2" aria-hidden>
            <div className={cn("h-full opacity-80 transition-colors duration-500", meta.fill)} style={{ width: `${progress * 100}%` }} />
          </div>
        )}

        <p className="sr-only">
          Simulation of the 26 August 2026 Rasuwa flood through the GANGA engine.{" "}
          {run.stateTimes.WATCH !== undefined && `Watch at ${clockAt(aug26, run.stateTimes.WATCH)}. `}
          {run.stateTimes.WARNING !== undefined && `Warning at ${clockAt(aug26, run.stateTimes.WARNING)}. `}
          {warnAt !== null && `Residents warned at ${clockAt(aug26, warnAt)}, ${fmtElapsed(warnAt)} after the avalanche. `}
          {run.stateTimes.EMERGENCY !== undefined && `Emergency at ${clockAt(aug26, run.stateTimes.EMERGENCY)}.`}
        </p>

        <div aria-hidden className="flex flex-col gap-5 px-5 pb-5 pt-5">
          {/* clock + state */}
          <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
            <div>
              <div className="text-[40px] font-semibold leading-none tracking-[-0.035em] tabular sm:text-[44px]">{clockAt(aug26, t)}</div>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
                <span className="font-medium text-foreground tabular">{fmtElapsed(t)}</span>
                <span>after the avalanche</span>
                {speed > 1 && (
                  <span className="rounded-[6px] bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-subtle tabular">
                    ×{Math.round(speed).toLocaleString("en-US")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex h-10 items-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={state}
                  initial={{ opacity: 0, y: 8, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                >
                  <StatePill state={state} size="lg" live={playing} />
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* escalation ladder */}
          <div className="grid grid-cols-3 gap-2">
            {TRANSITIONS.map((s) => {
              const at = run.stateTimes[s];
              const reached = at !== undefined && t >= at;
              const m = STATE_META[s];
              const Icon = m.icon;
              return (
                <div
                  key={s}
                  className={cn(
                    "rounded-[14px] px-3 py-2.5 transition-colors duration-300",
                    reached ? cn(m.soft, m.text) : "bg-surface-2 text-subtle"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.06em]">
                    <Icon className="size-3.5" />
                    {m.short}
                  </div>
                  <div className={cn("mt-1 text-[13px] font-medium tabular", reached ? "text-foreground" : "text-subtle")}>
                    {reached && at !== undefined ? clockAt(aug26, at) : "--:--:--"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* river corridor */}
          <div>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="font-medium text-muted">{aug26.river}</span>
              <span className="text-subtle tabular">
                {t > 0 ? <>Flood front · {Math.round(frontKm)} km</> : "River normal"}
              </span>
            </div>
            <div className="relative mt-3 h-[76px] sm:h-[84px]">
              {/* gauge */}
              <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(run.gauge.km) }}>
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-subtle">Gauge</span>
                <span className="mt-0.5 h-[18px] w-px bg-border-strong" />
              </div>
              {/* track */}
              <div className="absolute inset-x-0 top-[22px] h-2 rounded-full bg-surface-3" />
              {/* flood */}
              <div
                className="absolute left-0 top-[22px] h-2 rounded-full"
                style={{
                  width: pct(frontKm),
                  background:
                    "linear-gradient(90deg, color-mix(in srgb, var(--emergency-fill) 45%, transparent), var(--emergency-fill))",
                }}
              />
              {t > 0 && frontKm < KM_MAX && (
                <span className="absolute top-[26px] flex size-3 -translate-x-1/2 -translate-y-1/2" style={{ left: pct(frontKm) }}>
                  <span className="absolute inset-0 rounded-full bg-emergency-fill/70 animate-pulse-ring" />
                  <span className="relative size-3 rounded-full bg-emergency-fill ring-2 ring-surface" />
                </span>
              )}
              {/* sensor nodes */}
              {run.nodes.map((n) => {
                const st = nodeStatusAt(n, t);
                return (
                  <span key={n.id} className="absolute top-[26px] -translate-x-1/2 -translate-y-1/2" style={{ left: pct(n.km) }}>
                    {st === "anomaly" && <span className="absolute inset-0 rounded-full bg-warning-fill/60 animate-pulse-ring" />}
                    <span className={cn("relative block size-3 rounded-full transition-colors duration-200", NODE_DOT[st])} />
                  </span>
                );
              })}
              {/* villages */}
              {run.villages.map((v, i) => {
                const st = villageStatusAt(v, t);
                const p = (Math.min(v.km, KM_MAX) / KM_MAX) * 100;
                const alignEnd = p > 88;
                return (
                  <div key={v.id}>
                    <span
                      className={cn("absolute top-[38px] size-2 -translate-x-1/2 rounded-[3px] transition-colors duration-200", VILLAGE_DOT[st])}
                      style={{ left: `${p}%` }}
                    />
                    <span
                      className={cn(
                        "absolute hidden whitespace-nowrap text-[10.5px] leading-none transition-colors duration-200 sm:block",
                        i % 2 === 0 ? "top-[52px]" : "top-[66px]",
                        st === "flooded" ? "text-muted" : "text-subtle"
                      )}
                      style={{ left: `${p}%`, transform: alignEnd ? "translateX(calc(-100% + 5px))" : "translateX(-50%)" }}
                    >
                      {shortName(v.name)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="-mt-3 text-[12.5px] text-muted sm:mt-0">
              {next ? (
                <>
                  Next village · <span className="font-medium text-foreground">{shortName(next.name)}</span> · water in{" "}
                  <span className="tabular">{fmtDuration(Math.max(1, next.arrivalMin - t))}</span>
                  {warned ? " · already warned" : " · not warned yet"}
                </>
              ) : (
                "Flood has passed every village."
              )}
            </p>
          </div>

          {/* evidence feed */}
          <ol className="flex h-[120px] flex-col gap-1 overflow-hidden rounded-[16px] bg-surface-2 p-2">
            {recent.length === 0 && (
              <li className="flex h-8 items-center gap-2.5 px-2 text-[12.5px] text-muted">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 rounded-full bg-normal-fill animate-pulse-ring" />
                  <span className="relative size-1.5 rounded-full bg-normal-fill" />
                </span>
                Listening to {run.nodes.length} sensor nodes · heartbeat every {run.options.heartbeatS} s
              </li>
            )}
            <AnimatePresence initial={false}>
              {recent.map((f, i) => (
                <motion.li
                  key={f.id}
                  layout="position"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: i === 0 ? 1 : i === 1 ? 0.72 : 0.45, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
                  className={cn("flex h-8 shrink-0 items-center gap-2.5 rounded-[10px] px-2", i === 0 && "bg-surface shadow-soft")}
                >
                  <span className="w-[54px] shrink-0 font-mono text-[11px] text-subtle tabular">{clockAt(aug26, f.t)}</span>
                  <FeedMark item={f} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{f.text}</span>
                  <span className="hidden shrink-0 rounded-[6px] bg-surface-2 px-1.5 py-px font-mono text-[10px] text-muted sm:inline">{f.tag}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-surface-2/50 px-5 py-3.5">
          <p className="flex items-center gap-2 text-[13px]">
            {warned && warnAt !== null ? (
              <>
                <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-normal-fill text-white dark:text-[#21222c]">
                  <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
                </span>
                <span className="font-semibold">Residents warned</span>
                <span className="text-muted tabular">
                  · {fmtElapsed(warnAt)} · {clockAt(aug26, warnAt, false)}
                </span>
              </>
            ) : (
              <span className="text-muted">Waiting for evidence…</span>
            )}
          </p>
          <Link
            href="/command-center?autoplay=1"
            className="inline-flex items-center gap-1 rounded-[8px] text-[13px] font-medium text-foreground outline-none underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/60"
          >
            Full replay <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeedMark({ item }: { item: FeedItem }) {
  if (item.tone === "state" && item.state) {
    const m = STATE_META[item.state];
    const Icon = m.icon;
    return <Icon className={cn("size-3.5 shrink-0", m.text)} aria-hidden />;
  }
  const color =
    item.tone === "alert" ? "bg-normal-fill" : item.tone === "flood" ? "bg-emergency-fill" : "bg-subtle";
  return <span className={cn("mx-[3px] size-2 shrink-0 rounded-full", color)} aria-hidden />;
}
