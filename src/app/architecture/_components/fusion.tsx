import Link from "next/link";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { RULES, RULE_TEXT } from "@/lib/engine/run";
import { fusionSteps } from "@/content/architecture";

const THRESHOLDS: { label: string; value: number; unit: string }[] = [
  { label: "Ground vibration", value: RULES.vibMmS, unit: "mm/s" },
  { label: "Rate of rise", value: RULES.riseCmMin, unit: "cm/min" },
  { label: "Burst interval", value: RULES.burstS, unit: "s" },
  { label: "Missed bursts", value: RULES.missedBursts, unit: "bursts" },
  { label: "Missed heartbeats", value: RULES.missedHeartbeats, unit: "heartbeats" },
  { label: "Gateway window", value: RULES.gatewayWindowS, unit: "s" },
  { label: "Worst-case prior speed", value: RULES.priorSpeedMs, unit: "m/s" },
];

function outcome(text: string) {
  if (text.includes("EMERGENCY")) return "bg-emergency-soft text-emergency";
  if (text.includes("WARNING") && text.includes("→") && !text.includes("never")) return "bg-warning-soft text-warning";
  if (text.includes("WATCH")) return "bg-watch-soft text-watch";
  return "bg-surface-3 text-muted";
}

export function FusionSteps() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
      {fusionSteps.map((s, i) => {
        const hi = "highlight" in s && s.highlight;
        return (
          <Reveal key={s.step} delay={i * 0.05} className="h-full">
            <Card className={`relative flex h-full flex-col p-6 ${hi ? "border-brand/30 bg-brand-soft/60 ring-1 ring-brand/20" : ""}`}>
              <div className="flex items-center justify-between">
                <span className={`tabular flex size-8 items-center justify-center rounded-full text-[13px] font-semibold ${hi ? "bg-brand text-brand-foreground" : "bg-surface-2 text-muted"}`}>
                  {s.step}
                </span>
                {hi && <SparklesIcon className="size-4 text-brand" aria-hidden />}
              </div>
              <h3 className="mt-5 text-[19px] font-semibold leading-tight tracking-[-0.025em]">{s.name}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.detail}</p>
              {hi && <p className="mt-auto pt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand">The idea that sets GANGA apart</p>}
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

export function RulesAndThresholds() {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:gap-6">
      <Reveal>
        <Card className="h-full p-6 sm:p-7">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">The rule set</h3>
          <ul className="mt-4 divide-y divide-border">
            {Object.entries(RULE_TEXT).map(([id, text]) => {
              const body = text.split(" · ").slice(1).join(" · ");
              return (
                <li key={id} className="flex items-start gap-3.5 py-3">
                  <span className={`tabular mt-px inline-flex h-6 w-9 shrink-0 items-center justify-center rounded-[8px] font-mono text-[12px] font-semibold ${outcome(body)}`}>{id}</span>
                  <p className="text-[15px] leading-snug">{body}</p>
                </li>
              );
            })}
          </ul>
        </Card>
      </Reveal>
      <Reveal delay={0.06}>
        <Card className="flex h-full flex-col p-6 sm:p-7">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Thresholds</h3>
          <div className="mt-2 flex-1">
            <Table>
              <TableBody>
                {THRESHOLDS.map((t) => (
                  <TableRow key={t.label}>
                    <TableCell className="px-0 text-[14px] text-muted">{t.label}</TableCell>
                    <TableCell className="px-0 text-right">
                      <span className="tabular text-[15px] font-semibold">{t.value}</span>
                      <span className="ml-1.5 text-[12px] text-subtle">{t.unit}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 rounded-[12px] bg-simulated-soft px-3.5 py-2.5 text-[13px] leading-snug text-simulated">Placeholders until a pilot season calibrates them.</p>
        </Card>
      </Reveal>
    </div>
  );
}

export function FusionCta() {
  return (
    <div className="mt-8">
      <Button asChild variant="default" size="lg">
        <Link href="/command-center">
          See the rules fire on 26 August
          <ArrowRightIcon />
        </Link>
      </Button>
    </div>
  );
}

