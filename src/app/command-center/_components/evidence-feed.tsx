"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRightIcon, RadioIcon } from "lucide-react";
import type { Evidence, RunResult } from "@/lib/engine";
import { STATE_META } from "@/lib/alert-state";
import { StatePill } from "@/components/brand/state-pill";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { select } from "./sim-actions";
import { evidenceCount } from "./derive";
import { clock, tplus } from "./format";
import { KIND_ICON, PanelHeader, RuleChip } from "./bits";

type Filter = "all" | "state" | "sensor";

const matches: Record<Filter, (e: Evidence) => boolean> = {
  all: () => true,
  state: (e) => e.kind === "state",
  sensor: (e) => e.node !== undefined || e.kind === "gateway",
};

export function EvidenceFeed({ className }: { className?: string }) {
  const run = useRun();
  const count = useSim((st) => evidenceCount(run, st.t));
  const [filter, setFilter] = React.useState<Filter>("all");
  const reduce = useReducedMotion();

  const items = React.useMemo(
    () => run.evidence.slice(0, count).filter(matches[filter]).reverse(),
    [run, count, filter]
  );

  return (
    <Card className={cn("flex min-h-[520px] flex-col overflow-hidden lg:h-[620px]", className)}>
      <PanelHeader
        title={
          <span className="inline-flex items-center gap-2">
            Evidence
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-muted tabular hairline">
              {count}
              <span className="font-normal text-subtle"> / {run.evidence.length}</span>
            </span>
          </span>
        }
        description="Newest first."
      />
      <div className="px-5 pt-3">
        <Segmented<Filter>
          size="sm"
          aria-label="Filter evidence"
          className="w-full"
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "state", label: "State changes" },
            { value: "sensor", label: "Sensors" },
          ]}
        />
      </div>

      <div className="relative mt-3 min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 pb-4">
          {count === 0 ? (
            <ListeningState run={run} />
          ) : items.length === 0 ? (
            <p className="px-2 py-10 text-center text-[13px] text-muted">
              No {filter === "state" ? "state changes" : "sensor events"} yet.
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {items.map((e) => (
                  <motion.li
                    key={e.id}
                    layout={reduce ? false : "position"}
                    initial={reduce ? false : { opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  >
                    <EvidenceItem e={e} run={run} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-surface to-transparent" aria-hidden />
      </div>
    </Card>
  );
}

function ListeningState({ run }: { run: RunResult }) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="relative flex size-12 items-center justify-center rounded-full bg-normal-soft text-normal">
        <span className="absolute inset-0 rounded-full bg-normal-fill/30 animate-pulse-ring" aria-hidden />
        <RadioIcon className="relative size-5" aria-hidden />
      </span>
      <p className="text-[15px] font-medium">All {run.nodes.length} RTUs reporting. Listening…</p>
      <p className="max-w-[30ch] text-[13px] leading-relaxed text-muted">
        Evidence appears here the moment a rule fires. Press Play or <span className="font-medium text-foreground">Space</span>.
      </p>
    </div>
  );
}

function EvidenceItem({ e, run }: { e: Evidence; run: RunResult }) {
  const s = run.scenario;
  const open = () => select({ kind: "evidence", id: e.id });

  if (e.kind === "state" && e.state) {
    const m = STATE_META[e.state];
    return (
      <button
        type="button"
        onClick={open}
        className={cn(
          "group w-full rounded-[16px] p-3.5 text-left outline-none ring-1 ring-inset transition-[filter] hover:brightness-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring/60 dark:hover:brightness-110",
          m.soft,
          m.ring
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <StatePill state={e.state} size="md" />
          <span className="flex items-center gap-1.5">
            <RuleChip rule={e.rule} className="bg-surface/70" />
            <span className="font-mono text-[11px] text-muted tabular">{clock(s, e.t)}</span>
          </span>
        </div>
        <p className="mt-2.5 text-[14px] font-semibold leading-snug">{e.title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{e.detail}</p>
        <p className="mt-1.5 font-mono text-[11px] text-subtle tabular">{tplus(e.t)}</p>
      </button>
    );
  }

  const Icon = KIND_ICON[e.kind];
  return (
    <button
      type="button"
      onClick={open}
      className="group flex w-full gap-3 rounded-[14px] px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px] hairline [&_svg]:size-3.5",
          e.kind === "silence" ? "bg-emergency-soft text-emergency" : e.kind === "speed" ? "bg-watch-soft text-watch" : "bg-surface-2 text-muted"
        )}
        aria-hidden
      >
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[13.5px] font-semibold leading-snug">{e.title}</span>
          <span className="shrink-0 font-mono text-[11px] text-subtle tabular">{clock(s, e.t)}</span>
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted">{e.detail}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          <RuleChip rule={e.rule} />
          {e.values?.map((v) => (
            <span key={v} className="inline-flex h-5 items-center rounded-[6px] bg-surface-2 px-1.5 font-mono text-[10.5px] text-muted tabular">
              {v}
            </span>
          ))}
          <span className="ml-auto font-mono text-[10.5px] text-subtle tabular">{tplus(e.t)}</span>
        </span>
      </span>
      <ChevronRightIcon className="mt-1 size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </button>
  );
}
