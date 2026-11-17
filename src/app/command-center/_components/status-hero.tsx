"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { stateAt, type RunResult } from "@/lib/engine";
import { ALERT_STATES, STATE_META, STATE_RANK, type AlertState } from "@/lib/alert-state";
import { StatePill } from "@/components/brand/state-pill";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { jumpToState } from "./sim-actions";
import { heroSentence, latestStateEvidence, publicDeliveries } from "./derive";
import { clock, tplus } from "./format";
import { Caption, RuleChip } from "./bits";
import { CloudViewHero } from "./cloud-view";
import { inlineShort } from "./broadcast-model";

export function StatusHero({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  const state = useSim((st) => stateAt(run, st.t));
  const sentence = useSim((st) => heroSentence(run, st.t));
  const pub = run.summary.firstPublicWarningMin;
  const revealed = useSim((st) => pub !== null && st.t >= pub);

  return (
    <Card className={cn("overflow-hidden p-5 sm:p-6", className)}>
      {/* lg–xl: the hero spans the full width, so content and tiles sit side by side */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-8 xl:flex xl:flex-col">
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <Caption>Engine state</Caption>
            <span className="text-[12px] text-subtle">Edge fusion engine · deterministic</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatePill state={state} size="lg" live className="h-11 px-4.5 text-[15px]" />
            <CloudViewHero />
          </div>

          <p className="mt-4 text-[21px] font-semibold leading-[1.25] tracking-[-0.022em] text-balance sm:text-[23px]">{sentence}</p>
          {/* Announce level changes only — the sentence's countdown would be too chatty for screen readers. */}
          <span className="sr-only" aria-live="polite">
            Alert level {state}
          </span>
          <WhyLine run={run} />

          <StateStepper run={run} current={state} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:mt-0 xl:mt-5">
          <MetricTile
            label="First public warning"
            revealed={revealed}
            value={pub !== null ? clock(s, pub) : "—"}
            sub={pub !== null ? `${tplus(pub)} · ${firstChannel(run)}` : undefined}
            placeholder="Listening"
            placeholderSub="Sent once two signals agree"
          />
          <MetricTile
            label="Threshold gauge warning"
            revealed={revealed}
            value={run.gauge.warnMin !== null ? clock(s, run.gauge.warnMin) : "No warning"}
            sub={run.gauge.warnMin !== null ? `${tplus(run.gauge.warnMin)} · gauge at ${run.gauge.km} km` : `gauge at ${run.gauge.km} km`}
            placeholder="Not yet"
            placeholderSub={`Gauge at ${run.gauge.km} km`}
            muted
          />
          <MetricTile
            label="Villages with 10+ min lead"
            revealed={revealed}
            value={
              <>
                {run.summary.villagesWithLead10Ganga}
                <span className="text-[0.62em] font-medium text-subtle"> / {run.summary.villageCount}</span>
              </>
            }
            sub={`Gauge alone: ${run.summary.villagesWithLead10Gauge} / ${run.summary.villageCount}`}
            placeholder="Not yet"
            placeholderSub={`${run.summary.villageCount} villages downstream`}
          />
          <RealSmsTile run={run} revealed={revealed} />
        </div>
      </div>
    </Card>
  );
}

/** Why the engine is in this state — its own words, with the rule that fired. */
function WhyLine({ run }: { run: RunResult }) {
  const id = useSim((st) => latestStateEvidence(run, st.t)?.id ?? "");
  const e = id ? run.evidence.find((x) => x.id === id) : undefined;
  return (
    <p className="mt-2 flex items-start gap-2 text-[13.5px] leading-relaxed text-muted">
      {e ? (
        <>
          <RuleChip rule={e.rule} className="mt-px" />
          <span>{e.detail}</span>
        </>
      ) : (
        <span>Rules R1–R7 checked. Nothing fired yet.</span>
      )}
    </p>
  );
}

function firstChannel(run: RunResult): string {
  const first = publicDeliveries(run).find((d) => !d.blocked);
  const ch = first ? run.channels.find((c) => c.id === first.channel) : undefined;
  return ch ? `${inlineShort(ch)} first` : "public channel";
}

function StateStepper({ run, current }: { run: RunResult; current: AlertState }) {
  const s = run.scenario;
  return (
    <ol className="mt-5 grid grid-cols-4 gap-1.5" aria-label="Alert levels">
      {ALERT_STATES.map((st) => {
        const at = st === "NORMAL" ? 0 : run.stateTimes[st];
        const reached = STATE_RANK[st] <= STATE_RANK[current];
        const isCurrent = st === current;
        const m = STATE_META[st];
        const canJump = st !== "NORMAL" && at !== undefined;
        return (
          <li key={st}>
            <button
              type="button"
              disabled={!canJump}
              onClick={() => canJump && jumpToState(st as Exclude<AlertState, "NORMAL">)}
              className={cn(
                "group flex w-full flex-col items-start gap-1.5 rounded-[10px] p-1 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/60",
                canJump && "hover:bg-surface-2",
                "disabled:cursor-default"
              )}
              aria-label={canJump ? `Jump to ${st} at ${clock(s, at!)}` : st}
            >
              <span className={cn("h-[5px] w-full rounded-full transition-colors duration-300", reached ? m.fill : "bg-surface-3")} />
              <span className={cn("text-[10.5px] font-semibold tracking-[0.05em]", isCurrent ? m.text : reached ? "text-foreground" : "text-subtle")}>
                {st}
              </span>
              <span className="font-mono text-[10.5px] leading-none text-subtle tabular">
                {at !== undefined ? clock(s, at) : "—"}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function MetricTile({
  label,
  value,
  sub,
  revealed,
  placeholder,
  placeholderSub,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  revealed: boolean;
  placeholder: string;
  placeholderSub?: string;
  muted?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-[108px] flex-col rounded-[16px] bg-surface-2 p-3.5 hairline sm:p-4">
      <span className="text-[12.5px] font-medium leading-snug text-muted">{label}</span>
      <AnimatePresence mode="wait" initial={false}>
        {revealed ? (
          <motion.div
            key="v"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="mt-auto pt-2"
          >
            <div className={cn("text-[24px] font-semibold leading-none tracking-[-0.03em] tabular sm:text-[26px]", muted && "text-muted")}>{value}</div>
            {sub && <div className="mt-1.5 text-[12px] leading-snug text-subtle">{sub}</div>}
          </motion.div>
        ) : (
          <motion.div key="p" initial={false} exit={{ opacity: 0 }} className="mt-auto pt-2">
            <div className="flex items-center gap-2 text-[15px] font-medium text-subtle">
              <span className="size-1.5 rounded-full bg-border-strong" aria-hidden />
              {placeholder}
            </div>
            {placeholderSub && <div className="mt-1.5 text-[12px] leading-snug text-subtle">{placeholderSub}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RealSmsTile({ run, revealed }: { run: RunResult; revealed: boolean }) {
  const real = run.summary.realFirstSmsMin;
  const pub = run.summary.firstPublicWarningMin;
  if (real === null) {
    return (
      <div className="flex min-h-[108px] flex-col rounded-[16px] bg-surface-2 p-3.5 hairline sm:p-4">
        <span className="text-[12.5px] font-medium leading-snug text-muted">Real first SMS</span>
        <div className="mt-auto pt-2 text-[13px] leading-snug text-subtle">No real-world record for this illustrative scenario.</div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[108px] flex-col rounded-[16px] bg-surface-2 p-3.5 hairline sm:p-4">
      <span className="text-[12.5px] font-medium leading-snug text-muted">Real first SMS</span>
      <div className="mt-auto pt-2">
        <div className="text-[24px] font-semibold leading-none tracking-[-0.03em] tabular sm:text-[26px]">T+{real} min</div>
        <div className="mt-1.5 text-[12px] leading-snug text-subtle">
          reported · team deck
          {revealed && pub !== null && <span className="text-muted"> · GANGA {(real - pub).toFixed(1)} min sooner</span>}
        </div>
      </div>
    </div>
  );
}
