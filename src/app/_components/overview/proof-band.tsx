"use client";

import * as React from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { motion, useInView } from "motion/react";
import { ArrowUpRightIcon, NewspaperIcon } from "lucide-react";
import { Provenance } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DetailTrigger, type Detail } from "./detail-sheet";
import { fmtDuration, type OverviewFacts } from "./facts";
import { usePrefersReducedMotion } from "./hooks";

export type LivesFact = { raw: string; detail: string; sourceLabel: string; sourceNote?: string };

const fmtLead = (min: number | null) => (min === null ? "none" : min < 10 ? `${min.toFixed(1)} min` : fmtDuration(min));
const shortName = (name: string) => name.split(" / ")[0];

export function ProofBand({ facts, lives, smsSource }: { facts: OverviewFacts; lives: LivesFact; smsSource: { label: string; note?: string } }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = usePrefersReducedMotion();
  const show = inView || reduce;

  const fp = facts.firstPublic;
  const sms = facts.realSmsMin;
  const { ganga, gauge, total } = facts.lead10;
  const livesMatch = lives.raw.match(/^([\d,]+)(\D*)$/);
  const livesValue = livesMatch ? Number(livesMatch[1].replace(/,/g, "")) : null;
  const livesSuffix = livesMatch ? livesMatch[2] : "";
  const gaugeWarn = facts.gauge.warnMin;
  const floodedBeforeGauge = gaugeWarn === null ? null : facts.villages.filter((v) => v.arrivalMin < gaugeWarn).length;

  const firstDetail: Detail = {
    eyebrow: "Rasuwa flood replay · GANGA engine",
    title: fp ? `First public warning at ${fp.t}` : "First public warning",
    description: fp
      ? `Residents warned at ${fp.clock}, ${fp.t} after the avalanche.${sms ? ` The first real SMS went out at T+${sms} min.` : ""}`
      : undefined,
    provenance: "simulated",
    rowsTitle: "Engine steps",
    rows: [
      ...facts.states.map((s) => ({ label: `${s.state} · ${s.rule}`, value: s.clock, mono: true })),
      ...(fp?.channels ?? []).map((c) => ({ label: `Delivered · ${c.name}`, value: c.clock, mono: true })),
    ],
    paragraphs: facts.states
      .filter((s) => s.state !== "EMERGENCY")
      .map((s) => `${s.state} at ${s.clock}: ${s.why}`),
    source: { label: smsSource.label, note: `Real first SMS (T+${sms ?? "—"} min). ${smsSource.note ?? ""}`.trim() },
    links: [{ href: "/command-center?autoplay=1", label: "Watch the replay" }],
  };

  const villagesDetail: Detail = {
    eyebrow: "Rasuwa flood replay · lead time per village",
    title: `${ganga} of ${total} villages get 10+ minutes`,
    description:
      floodedBeforeGauge !== null && facts.gauge.warnClock
        ? `A gauge at ${facts.gauge.km} km alarms at ${facts.gauge.warnClock}, after the flood has passed ${floodedBeforeGauge} of ${total} villages.`
        : undefined,
    provenance: "simulated",
    rowsTitle: "Lead time",
    rows: facts.villages.map((v) => ({
      label: `${shortName(v.name)} · ${v.km} km`,
      value: `GANGA ${fmtLead(v.leadGanga)} · gauge ${fmtLead(v.leadGauge)}`,
    })),
    note: "Distances are approximate. Flood front modelled between two published timings. Placeholder thresholds until a pilot season.",
    links: [{ href: "/command-center", label: "Open the Command Center" }],
  };

  const livesDetail: Detail = {
    eyebrow: "26 August 2026 · reported",
    title: `${lives.raw} lives lost`,
    description: lives.detail,
    badge: "Reported figure",
    source: { label: lives.sourceLabel, note: lives.sourceNote },
  };

  return (
    <div ref={ref} className="grid grid-cols-1 overflow-hidden rounded-[24px] border border-border bg-surface shadow-card lg:grid-cols-3">
      {/* 1 · first public warning */}
      <Cell detail={firstDetail} className="border-b border-border lg:border-b-0 lg:border-r">
        <CellHead label="First public warning" badge={<Provenance kind="simulated" />} />
        <span className="mt-5 flex items-baseline text-[54px] font-semibold leading-none tracking-[-0.045em] sm:text-[60px]">
          {fp ? (
            <>
              <span className="sr-only">{fp.t}</span>
              <span aria-hidden className="flex items-baseline">
                <NumberFlowGroup>
                  <span>T+</span>
                  <NumberFlow value={show ? fp.m : 0} />
                  <span className="mx-[0.02em]">:</span>
                  <NumberFlow value={show ? fp.s : 0} format={{ minimumIntegerDigits: 2 }} />
                </NumberFlowGroup>
              </span>
            </>
          ) : (
            "—"
          )}
        </span>
        <span className="mt-3 block text-[14.5px] leading-relaxed text-muted">
          {fp ? (
            <>
              Residents warned at <span className="font-medium text-foreground tabular">{fp.clock}</span>.
            </>
          ) : (
            "No public warning in this run."
          )}
        </span>
        {fp && sms && (
          <span className="mt-6 flex flex-col gap-3">
            <CompareBar label="GANGA replay" value={fp.t} fraction={fp.min / sms} emphasis show={show} reduce={reduce} />
            <CompareBar label="First real SMS" value={`T+${sms} min`} fraction={1} show={show} reduce={reduce} delay={0.12} />
          </span>
        )}
        <Source>Engine replay · real SMS from {smsSource.label.split(/,| —| \(/)[0]}</Source>
      </Cell>

      {/* 2 · villages with 10+ minutes */}
      <Cell detail={villagesDetail} className="border-b border-border lg:border-b-0 lg:border-r">
        <CellHead label="10+ minutes of warning" badge={<Provenance kind="simulated" />} />
        <span className="mt-5 flex items-baseline gap-3 text-[54px] font-semibold leading-none tracking-[-0.045em] sm:text-[60px]">
          <span className="sr-only">
            {ganga} of {total}
          </span>
          <NumberFlow aria-hidden value={show ? ganga : 0} />
          <span aria-hidden className="text-[24px] font-medium tracking-[-0.02em] text-muted">
            of {total}
          </span>
        </span>
        <span className="mt-3 block text-[14.5px] leading-relaxed text-muted">
          Villages with 10+ min warning. A gauge at {facts.gauge.km} km gets{" "}
          <span className="font-medium text-foreground">
            {gauge} of {total}
          </span>
          .
        </span>
        <span className="mt-6 flex flex-col gap-3">
          <VillageRow label="GANGA" villages={facts.villages} pick={(v) => v.leadGanga} count={ganga} total={total} show={show} />
          <VillageRow label="Gauge only" villages={facts.villages} pick={(v) => v.leadGauge} count={gauge} total={total} show={show} muted />
        </span>
        <Source>Engine replay · same channels, gauge vs GANGA trigger</Source>
      </Cell>

      {/* 3 · lives lost */}
      <Cell detail={livesDetail}>
        <CellHead
          label="Lives lost"
          badge={
            <Badge variant="outline" size="sm">
              <NewspaperIcon aria-hidden />
              Reported
            </Badge>
          }
        />
        <span className="mt-5 block text-[54px] font-semibold leading-none tracking-[-0.045em] sm:text-[60px]">
          {livesValue !== null ? (
            <>
              <span className="sr-only">{lives.raw}</span>
              <NumberFlow aria-hidden value={show ? livesValue : 0} suffix={livesSuffix} />
            </>
          ) : (
            lives.raw
          )}
        </span>
        <span className="mt-3 block text-[14.5px] leading-relaxed text-muted">{lives.detail}</span>
        <Source>
          {lives.sourceLabel}
          {lives.sourceNote && <span className="block text-subtle">{lives.sourceNote}</span>}
        </Source>
      </Cell>
    </div>
  );
}

function Cell({ detail, className, children }: { detail: Detail; className?: string; children: React.ReactNode }) {
  return (
    <DetailTrigger
      detail={detail}
      aria-label={`${detail.title} — open details`}
      className={cn(
        "group relative flex flex-col p-6 transition-colors duration-200 hover:bg-surface-2/60 focus-visible:z-10 focus-visible:ring-inset sm:p-8",
        className
      )}
    >
      {children}
      <span className="pointer-events-none absolute right-6 top-6 hidden size-7 items-center justify-center rounded-full bg-surface-2 text-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:right-8 sm:top-8 lg:inline-flex">
        <ArrowUpRightIcon className="size-3.5" aria-hidden />
      </span>
    </DetailTrigger>
  );
}

function CellHead({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-2.5 lg:pr-9">
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</span>
      {badge}
    </span>
  );
}

function Source({ children }: { children: React.ReactNode }) {
  return <span className="mt-auto block pt-6 text-[12px] leading-relaxed text-subtle">{children}</span>;
}

function CompareBar({
  label,
  value,
  fraction,
  emphasis,
  show,
  reduce,
  delay = 0,
}: {
  label: string;
  value: string;
  fraction: number;
  emphasis?: boolean;
  show: boolean;
  reduce: boolean;
  delay?: number;
}) {
  const width = `max(8px, ${Math.min(1, Math.max(0, fraction)) * 100}%)`;
  return (
    <span className="grid grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
      <span className={cn(emphasis ? "font-medium text-foreground" : "text-muted")}>{label}</span>
      <span className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.span
          className={cn("absolute inset-y-0 left-0 rounded-r-[4px]", emphasis ? "bg-primary" : "bg-border-strong")}
          style={{ width, originX: 0 }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={show ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 24, delay }}
        />
      </span>
      <span className={cn("tabular", emphasis ? "font-semibold text-foreground" : "text-muted")}>{value}</span>
    </span>
  );
}

type VillageLite = OverviewFacts["villages"][number];

function VillageRow({
  label,
  villages,
  pick,
  count,
  total,
  show,
  muted,
}: {
  label: string;
  villages: VillageLite[];
  pick: (v: VillageLite) => number | null;
  count: number;
  total: number;
  show: boolean;
  muted?: boolean;
}) {
  return (
    <span className="grid grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
      <span className={cn(muted ? "text-muted" : "font-medium text-foreground")}>{label}</span>
      <span className="flex gap-1.5">
        {villages.map((v, i) => {
          const lead = pick(v);
          const ok = lead !== null && lead >= 10;
          return (
            <Tooltip key={v.id}>
              <TooltipTrigger asChild>
                <motion.span
                  className={cn(
                    "h-3.5 flex-1 rounded-[4px] transition-colors",
                    ok ? "bg-primary" : "bg-surface-2 ring-1 ring-inset ring-border-strong"
                  )}
                  initial={false}
                  animate={{ opacity: show ? 1 : 0.35 }}
                  transition={{ delay: show ? 0.06 * i : 0 }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {shortName(v.name)} · {lead === null ? "no warning" : `${fmtLead(lead)} of warning`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
      <span className={cn("tabular", muted ? "text-muted" : "font-semibold")}>
        {count} of {total}
      </span>
    </span>
  );
}
