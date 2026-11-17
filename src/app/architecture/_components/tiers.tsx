"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronRightIcon, InfoIcon, RadioIcon, CpuIcon, CloudIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { Provenance, type ProvenanceKind } from "@/components/brand/provenance";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tiers, type Tier, type TierComponent } from "@/content/architecture";

const TIER_ICON = { field: RadioIcon, edge: CpuIcon, cloud: CloudIcon } as const;

const PROVENANCE_TEXT: Record<ProvenanceKind, { title: string; body: string }> = {
  built: { title: "Built", body: "Exists and runs today, at APIE Camp #11 or on this website." },
  simulated: { title: "Simulated", body: "Real code, simulated input. Floods, sensors and radio links are modelled." },
  planned: { title: "Planned", body: "In the design. Not built yet." },
};

type Selected = { tier: Tier; component: TierComponent } | null;

function WanLabel({ vertical }: { vertical?: boolean }) {
  return (
    <div
      className={
        vertical
          ? "relative z-10 flex items-center justify-center rounded-full border border-border-strong bg-surface px-2 py-4 text-center shadow-sm [writing-mode:vertical-rl] rotate-180"
          : "relative z-10 mx-auto flex max-w-[280px] items-center justify-center rounded-full border border-border-strong bg-surface px-4 py-2 text-center shadow-sm"
      }
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">WAN</span>
      <span className={vertical ? "mt-2 text-[12px] leading-snug text-muted" : "ml-2 border-l border-border pl-2 text-[12px] leading-snug text-muted"}>
        The life-safety path never crosses this line
      </span>
    </div>
  );
}

function Connector({ dashed = true }: { dashed?: boolean }) {
  return (
    <svg className="h-full w-full text-subtle" viewBox="0 0 44 100" preserveAspectRatio="none" aria-hidden>
      <line x1="2" y1="50" x2="42" y2="50" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dashed ? "4 8" : undefined} className="animate-flow" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <path d="M36 44 L42 50 L36 56" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function HConnector() {
  return (
    <div className="hidden lg:flex items-center justify-center" aria-hidden>
      <div className="h-10 w-full"><Connector /></div>
    </div>
  );
}

function VConnector() {
  return (
    <div className="flex justify-center lg:hidden" aria-hidden>
      <svg width="12" height="36" viewBox="0 0 12 36" className="text-border-strong">
        <line x1="6" y1="2" x2="6" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" className="animate-flow" strokeLinecap="round" />
        <path d="M2 24 L6 30 L10 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function TierCard({ tier, onOpen, index }: { tier: Tier; onOpen: (s: Selected) => void; index: number }) {
  const Icon = TIER_ICON[tier.id];
  return (
    <Reveal delay={index * 0.06} className="h-full">
      <Card className="flex h-full flex-col p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted">{tier.label}</p>
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-surface-2 text-foreground">
            <Icon className="size-[18px]" aria-hidden />
          </span>
        </div>
        <h3 className="mt-5 text-[44px] font-semibold leading-none tracking-[-0.04em]">{tier.verb}</h3>
        <p className="mt-3 lg:min-h-[72px] text-[15px] leading-relaxed text-muted">{tier.summary}</p>
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[18px] bg-surface-2">
          {tier.components.map((c) => (
            <li key={c.name} className="group relative px-4 py-3.5 transition-colors hover:bg-surface-3/70">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpen({ tier, component: c })}
                  className="flex min-w-0 flex-1 items-start gap-1 rounded-md text-left outline-none after:absolute after:inset-0 focus-visible:after:rounded-[inherit] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tracking-[-0.01em]">{c.name}</span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-muted">{c.detail}</span>
                  </span>
                </button>
                <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
              <div className="relative z-10 mt-2.5 flex items-center gap-2">
                <Provenance kind={c.provenance} />
                {c.note && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Note on ${c.name}`}
                        onClick={() => toast(c.name, { description: c.note })}
                        className="inline-flex size-6 items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
                      >
                        <InfoIcon className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{c.note}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Reveal>
  );
}

export function Tiers() {
  const [sel, setSel] = React.useState<Selected>(null);
  const [open, setOpen] = React.useState(false);
  const onOpen = (s: Selected) => {
    setSel(s);
    setOpen(true);
  };
  const [field, edge, cloud] = tiers;
  return (
    <>
      <div className="grid gap-0 lg:grid-cols-[1fr_44px_1fr_96px_1fr]">
        <TierCard tier={field} onOpen={onOpen} index={0} />
        <HConnector />
        <VConnector />
        <TierCard tier={edge} onOpen={onOpen} index={1} />

        {/* WAN boundary */}
        <div className="relative my-6 lg:my-0" role="separator" aria-label="WAN boundary. The life-safety path never crosses this line.">
          <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-border-strong lg:inset-x-auto lg:inset-y-0 lg:left-1/2 lg:top-0 lg:border-l-2 lg:border-t-0" />
          <div className="relative flex h-full items-center justify-center">
            <div className="lg:hidden"><WanLabel /></div>
            <div className="hidden lg:block"><WanLabel vertical /></div>
          </div>
        </div>

        <TierCard tier={cloud} onOpen={onOpen} index={2} />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          {sel && (
            <>
              <SheetHeader>
                <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-subtle">
                  {sel.tier.label} · {sel.tier.verb}
                </p>
                <SheetTitle className="text-xl">{sel.component.name}</SheetTitle>
                <SheetDescription>{sel.component.detail}</SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <div className="rounded-[18px] bg-surface-2 p-4">
                  <div className="flex items-center gap-2">
                    <Provenance kind={sel.component.provenance} size="md" />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{PROVENANCE_TEXT[sel.component.provenance].body}</p>
                </div>
                {sel.component.note && (
                  <div className="rounded-[18px] bg-surface-2 p-4">
                    <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-subtle">Note</p>
                    <p className="mt-2 text-sm leading-relaxed">{sel.component.note}</p>
                  </div>
                )}
                <div className="rounded-[18px] bg-surface-2 p-4">
                  <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-subtle">Role in the system</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{sel.tier.summary}</p>
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
