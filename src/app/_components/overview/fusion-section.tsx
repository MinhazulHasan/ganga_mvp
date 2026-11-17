import { ArrowUpRightIcon, SparklesIcon } from "lucide-react";
import { fusionSteps } from "@/content/architecture";
import { RULE_TEXT } from "@/lib/engine";
import { Section } from "@/components/layout/section";
import { Appear } from "./appear";
import { Provenance } from "@/components/brand/provenance";
import { cn } from "@/lib/utils";
import { DetailTrigger, type Detail, type DetailListItem } from "./detail-sheet";
import type { OverviewFacts } from "./facts";

export function FusionSection({ facts }: { facts: OverviewFacts }) {
  const ev = facts.evidence;
  const toItem = (e: OverviewFacts["evidence"][number]): DetailListItem => ({
    lead: e.clock,
    text: e.title,
    sub: [e.detail, ...e.values].filter(Boolean).join(" · "),
    tag: e.rule,
  });

  const stepLists: Record<number, Detail["list"]> = {
    1: { title: "In the Rasuwa flood replay", items: ev.filter((e) => e.kind === "vibration" || e.kind === "rise").slice(0, 6).map(toItem) },
    2: { title: "In the Rasuwa flood replay", items: ev.filter((e) => e.kind === "silence").map(toItem) },
    3: {
      title: "In the Rasuwa flood replay",
      items: facts.speeds.map((s) => ({ lead: s.clock, text: `Wave speed ≈ ${s.ms} m/s`, sub: s.basis, tag: "ETA" })),
    },
    4: { title: "In the Rasuwa flood replay", items: ev.filter((e) => e.kind === "state").map(toItem) },
  };

  const [n1, n2] = facts.deaths;
  const emergency = facts.states.find((s) => s.state === "EMERGENCY");
  const firstSpeed = facts.speeds[0];
  const ruleKeys = ["R1", "R4", "R7"] as const;

  return (
    <Section
      id="fusion-engine"
      className="scroll-mt-14"
      tone="muted"
      eyebrow="The fusion engine"
      title="Four steps from a reading to a warning."
      actions={<Provenance kind="built" size="md" label="Runs in this prototype" />}
    >
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fusionSteps.map((s, i) => {
          const key = "highlight" in s && s.highlight;
          return (
            <Appear key={s.step} delay={i * 0.05} className="h-full">
              <li className="h-full">
                <DetailTrigger
                  detail={{
                    eyebrow: `Step ${s.step} of ${fusionSteps.length}`,
                    title: s.name,
                    description: s.detail,
                    provenance: "built",
                    list: stepLists[s.step],
                    links: [{ href: "/command-center?autoplay=1", label: "Watch the replay" }],
                  }}
                  className={cn(
                    "group flex h-full w-full flex-col rounded-[22px] p-6 transition-[box-shadow,background-color] duration-200",
                    key
                      ? "bg-primary text-primary-foreground shadow-float hover:bg-primary/94"
                      : "border border-border bg-surface shadow-soft hover:shadow-card"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("font-mono text-[12px]", key ? "opacity-70" : "text-subtle")}>0{s.step}</span>
                    {key ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-0.5 text-[11.5px] font-medium dark:bg-black/12">
                        <SparklesIcon className="size-3" aria-hidden /> Key idea
                      </span>
                    ) : (
                      <ArrowUpRightIcon className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    )}
                  </span>
                  <span className="mt-8 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{s.name}</span>
                  {key && <span className="mt-1 font-serif text-[22px] italic leading-tight opacity-90">Silence is a signal</span>}
                  <span className={cn("mt-3 text-[14px] leading-relaxed", key ? "opacity-80" : "text-muted")}>{s.detail}</span>
                  <span
                    className={cn(
                      "mt-auto inline-flex items-center gap-1 pt-6 text-[12.5px] font-medium",
                      key ? "opacity-80" : "text-muted group-hover:text-foreground"
                    )}
                  >
                    See it in the replay <ArrowUpRightIcon className="size-3.5" aria-hidden />
                  </span>
                </DetailTrigger>
              </li>
            </Appear>
          );
        })}
      </ol>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {n1 && (
          <Appear className="h-full">
            <div className="h-full rounded-[22px] border border-border bg-surface p-6 shadow-soft sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">Silence as evidence · Rasuwa flood replay</p>
                <Provenance kind="simulated" />
              </div>
              <ol className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-4">
                <Moment clock={n1.lastHeardClock} title={`${n1.node} sends its last reading`} detail={`Event mode at ${n1.km} km, a reading every ${facts.rules.burstS} s.`} />
                <Moment
                  clock={n1.detectedClock}
                  title={`${n1.node} declared silent`}
                  detail={`${facts.rules.missedBursts} reports missed in ${n1.afterS} s. Treated as destroyed by the flood.`}
                  tag="R4"
                  accent
                />
                {n2 && emergency && (
                  <Moment
                    clock={emergency.clock}
                    title={`${n2.node} silent too → EMERGENCY`}
                    detail={`Two RTUs lost in downstream order.${firstSpeed ? ` Wave speed about ${firstSpeed.ms} m/s.` : ""}`}
                    tag={emergency.rule}
                  />
                )}
              </ol>
              <p className="mt-6 border-t border-border pt-4 text-[13px] leading-relaxed text-muted">
                The time between two silent RTUs gives the wave speed.
              </p>
            </div>
          </Appear>
        )}
        <Appear className="h-full" delay={0.05}>
          <div className="h-full rounded-[22px] border border-border bg-surface p-6 shadow-soft sm:p-7">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">Rules in play</p>
            <ul className="mt-5 flex flex-col">
              {ruleKeys.map((k, i) => {
                const [code, text] = RULE_TEXT[k].split(" · ");
                return (
                  <li key={k} className={cn("flex gap-3 py-3", i > 0 && "border-t border-border")}>
                    <span className="h-6 shrink-0 rounded-[7px] bg-surface-2 px-2 font-mono text-[12px] leading-6 text-foreground">{code}</span>
                    <span className="text-[14px] leading-relaxed">{text}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-subtle">Placeholder thresholds until a pilot season.</p>
          </div>
        </Appear>
      </div>
    </Section>
  );
}

function Moment({ clock, title, detail, tag, accent }: { clock: string; title: string; detail: string; tag?: string; accent?: boolean }) {
  return (
    <li className="relative flex flex-col">
      <span className="flex items-center gap-2">
        <span className={cn("size-2.5 rounded-full", accent ? "bg-warning-fill" : "bg-foreground/70")} aria-hidden />
        <span className="font-mono text-[12px] text-subtle tabular">{clock}</span>
        {tag && <span className="rounded-[6px] bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-muted">{tag}</span>}
      </span>
      <span className="mt-2.5 text-[15px] font-semibold leading-snug tracking-[-0.01em]">{title}</span>
      <span className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{detail}</span>
    </li>
  );
}
