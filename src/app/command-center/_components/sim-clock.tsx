"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { useReducedMotion } from "motion/react";
import { stateAt } from "@/lib/engine";
import { StatePill } from "@/components/brand/state-pill";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { clock, tplus } from "./format";

const TWO = { minimumIntegerDigits: 2 } as const;
const SIXTY = { 1: { max: 5 } } as const;

/**
 * Live replay clock: local time in large tabular digits, T+ offset and the alert state under it.
 * Digits roll on jumps (while paused) and update instantly during playback.
 */
export function SimClock({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  const sec = useSim((st) => Math.round(st.t * 60));
  const settled = useSim((st) => !st.playing && !st.scrubbing);
  const trend = useSim((st) => st.trend);
  const state = useSim((st) => stateAt(run, st.t));
  const reduce = useReducedMotion();

  const [h, m] = s.triggerClock.split(":").map(Number);
  const total = (h * 60 + m) * 60 + sec;
  const hh = Math.floor(total / 3600) % 24;
  const mm = Math.floor(total / 60) % 60;
  const ss = total % 60;
  const animated = settled && !reduce;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Replay time ${clock(s, sec / 60)}, ${tplus(sec / 60)}`}
      className={cn("flex shrink-0 flex-col justify-center leading-none", className)}
    >
      <div className="flex items-baseline text-[28px] font-semibold tracking-[-0.03em] tabular sm:text-[32px]" aria-hidden>
        <NumberFlowGroup>
          <NumberFlow value={hh} format={TWO} animated={animated} trend={trend} />
          <span className="mx-[1px] -translate-y-[0.06em] text-subtle">:</span>
          <NumberFlow value={mm} format={TWO} digits={SIXTY} animated={animated} trend={trend} />
          <span className="mx-[1px] -translate-y-[0.06em] text-subtle">:</span>
          <NumberFlow value={ss} format={TWO} digits={SIXTY} animated={animated} trend={trend} />
        </NumberFlowGroup>
      </div>
      <div className="mt-1.5 flex items-center gap-2" aria-hidden>
        <span className="min-w-[4.6em] font-mono text-[12px] font-medium text-muted tabular">{tplus(sec / 60)}</span>
        <StatePill state={state} size="sm" live className="h-5 px-2 text-[10px]" />
      </div>
    </div>
  );
}
