"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CloudOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { clock } from "./format";

/** Andrrew's rule: more than 15 s without data = STALE, never an all-clear. */
export const STALE_AFTER_S = 15;

export type CloudPhase = "live" | "gap" | "stale";

/**
 * What the cloud dashboard sees at the playhead. `gapS` is whole seconds without data
 * (quantised, so subscribers re-render at most once per simulated second).
 */
export function useCloudView(): { phase: CloudPhase; gapS: number; wanAt: number | null; staleAt: number | null } {
  const wanAt = useSim((s) => s.wanDownFromMin);
  const code = useSim((s) => {
    if (s.wanDownFromMin === null || s.t < s.wanDownFromMin) return -1;
    const gap = (s.t - s.wanDownFromMin) * 60;
    return gap > STALE_AFTER_S ? STALE_AFTER_S + 1 : Math.floor(gap + 1e-6);
  });
  const phase: CloudPhase = code < 0 ? "live" : code > STALE_AFTER_S ? "stale" : "gap";
  return { phase, gapS: Math.max(0, code), wanAt, staleAt: wanAt === null ? null : wanAt + STALE_AFTER_S / 60 };
}

/** One-line status, e.g. for sheets: "Live", "No data for 7 s", "STALE since 08:37:15 — not an all-clear". */
export function useCloudStatusText(): { phase: CloudPhase; text: string } {
  const run = useRun();
  const { phase, gapS, staleAt } = useCloudView();
  if (phase === "live") return { phase, text: "Cloud dashboard · live" };
  if (phase === "gap") return { phase, text: `No data for ${gapS} s` };
  return { phase, text: `STALE since ${clock(run.scenario, staleAt ?? 0)} · not an all-clear` };
}

/**
 * Cloud view next to the engine state: quiet while the WAN is up, counting the silence after a cut,
 * then STALE in the emergency tone — never an all-clear — while the edge keeps deciding on its own.
 */
export function CloudViewHero() {
  const run = useRun();
  const { phase, gapS, staleAt } = useCloudView();
  const reduce = useReducedMotion();
  const anim = {
    initial: reduce ? false : { opacity: 0, y: 4, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
    transition: { type: "spring", stiffness: 420, damping: 32 },
  } as const;

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {phase === "live" ? (
        <motion.span
          key="live"
          {...anim}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[12px] font-medium text-muted hairline"
        >
          <span className="size-1.5 rounded-full bg-normal-fill" aria-hidden />
          Cloud dashboard · live
        </motion.span>
      ) : phase === "gap" ? (
        <motion.span
          key="gap"
          {...anim}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-[12px] font-medium text-foreground hairline"
        >
          <CloudOffIcon className="size-3.5 text-muted" aria-hidden />
          <span>
            Cloud view · no data for <span className="tabular">{gapS} s</span>
          </span>
        </motion.span>
      ) : (
        <motion.div
          key="stale"
          {...anim}
          role="status"
          className="flex w-full items-start gap-2.5 rounded-[14px] bg-emergency-soft px-3.5 py-2.5"
        >
          <CloudOffIcon className="mt-px size-4 shrink-0 text-emergency" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase leading-4 tracking-[0.12em] text-emergency/80">Cloud view</p>
            <p className="mt-0.5 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-balance text-emergency">
              STALE since <span className="tabular">{clock(run.scenario, staleAt ?? 0)}</span>
              {" — this is not an all-clear"}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">The edge engine keeps deciding and alerting locally.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Tone classes for compact cloud labels (network diagram, sheets). */
export const CLOUD_TONE: Record<CloudPhase, string> = {
  live: "text-normal",
  gap: "text-muted",
  stale: "font-semibold text-emergency",
};

export function CloudStatusInline({ className }: { className?: string }) {
  const { phase, text } = useCloudStatusText();
  return <span className={cn(CLOUD_TONE[phase], className)}>{text}</span>;
}
