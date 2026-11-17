"use client";

import * as React from "react";
import { ActivityIcon, CpuIcon, RadioTowerIcon, NetworkIcon, ServerIcon, ChevronRightIcon, ArrowDownIcon } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet";
import { signalChain } from "@/content/field";

const ICONS: Record<string, React.ElementType> = {
  sensors: ActivityIcon,
  node: CpuIcon,
  gateway: RadioTowerIcon,
  switch: NetworkIcon,
  broker: ServerIcon,
};

type Step = (typeof signalChain)[number];

export function SignalChain() {
  const [open, setOpen] = React.useState<number | null>(null);
  const step: Step | null = open === null ? null : signalChain[open];
  const Icon = step ? ICONS[step.id] : null;

  return (
    <Section eyebrow="Signal chain" title="Five hops">
      <ol className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
        {signalChain.map((s, i) => {
          const I = ICONS[s.id];
          const last = i === signalChain.length - 1;
          return (
            <li key={s.id} className="group/step flex min-w-0 flex-col">
              {/* rail: step icon, then the link to the next step on a line */}
              <div aria-hidden className="relative mb-4 hidden h-10 items-center justify-center lg:flex">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center">
                  {/* soft halo that grows in when the step's card is hovered or focused */}
                  <span className="absolute inset-0 scale-75 rounded-full bg-primary/12 opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover/step:scale-[1.45] group-hover/step:opacity-100 group-focus-within/step:scale-[1.45] group-focus-within/step:opacity-100 motion-reduce:transition-none" />
                  <span className="relative flex size-10 items-center justify-center rounded-full bg-surface text-foreground shadow-soft hairline transition-[background-color,color,box-shadow,transform] duration-200 ease-out group-hover/step:-translate-y-0.5 group-hover/step:bg-primary group-hover/step:text-primary-foreground group-hover/step:shadow-card group-focus-within/step:bg-primary group-focus-within/step:text-primary-foreground motion-reduce:transform-none">
                    <I className="size-[18px]" />
                  </span>
                </span>
                {!last && (
                  // from this icon to the next card's icon: half a column + the 16px gap + half a column, minus the icons
                  <span className="absolute left-[calc(50%+28px)] flex h-full w-[calc(100%-40px)] items-center">
                    <span className="h-px w-full bg-border-strong" />
                    <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-medium text-muted hairline">
                      {s.hop}
                    </span>
                  </span>
                )}
              </div>
              <Reveal delay={i * 0.05} className="h-full">
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  aria-label={`${s.title}: open details`}
                  className="group h-full w-full rounded-[22px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
                >
                  <Card className="flex h-full flex-col p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-border-strong group-hover:shadow-float motion-reduce:group-hover:translate-y-0">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-surface-2 lg:hidden">
                        <I className="size-[18px]" aria-hidden />
                      </span>
                      <span className="tabular text-[12px] font-medium text-subtle">Step {i + 1}</span>
                    </div>
                    <h3 className="mt-2 truncate text-[17px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                    <p className="mt-1.5 font-mono lg:min-h-[4lh] xl:min-h-[3lh] text-[12px] leading-snug text-muted">{s.device}</p>
                    <ul className="mt-4 space-y-2 border-t border-border pt-4 text-[14px] leading-snug text-muted">
                      {s.points.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-subtle" aria-hidden />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="mt-auto inline-flex items-center gap-0.5 pt-5 text-[13px] font-medium text-foreground/80 group-hover:text-foreground">
                      Details <ChevronRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Card>
                </button>
              </Reveal>
              {!last && (
                <div aria-hidden className="flex items-center gap-2 pl-5 pt-3 lg:hidden">
                  <ArrowDownIcon className="size-4 text-subtle" />
                  <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted hairline">{s.hop}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          {step && Icon && (
            <>
              <SheetHeader>
                <span className="mb-2 flex size-11 items-center justify-center rounded-[14px] bg-surface-2">
                  <Icon className="size-5" aria-hidden />
                </span>
                <SheetTitle>
                  Step {open! + 1} · {step.title}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">{step.device}</SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-6">
                <div>
                  <h4 className="mb-3 text-[13px] font-medium text-subtle">What it does</h4>
                  <ul className="divide-y divide-border rounded-[16px] bg-surface-2">
                    {step.points.map((p) => (
                      <li key={p} className="px-4 py-3 text-[14.5px] leading-snug">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                {step.link && (
                  <div>
                    <h4 className="mb-3 text-[13px] font-medium text-subtle">Link to the next step</h4>
                    <p className="rounded-[16px] bg-surface-2 px-4 py-3 text-[14.5px]">{step.link}</p>
                  </div>
                )}
                {!step.link && <p className="text-sm text-muted">End of the chain.</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={open === 0}
                    onClick={() => setOpen((o) => (o === null ? o : Math.max(0, o - 1)))}
                    className="h-10 flex-1 rounded-full bg-surface-2 text-sm font-medium transition-colors hover:bg-surface-3 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={open === signalChain.length - 1}
                    onClick={() => setOpen((o) => (o === null ? o : Math.min(signalChain.length - 1, o + 1)))}
                    className="h-10 flex-1 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Section>
  );
}
