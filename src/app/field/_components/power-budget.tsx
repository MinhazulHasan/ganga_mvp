"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import NumberFlow from "@number-flow/react";
import { CheckCircle2Icon, TriangleAlertIcon, TimerIcon, ZapIcon } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { powerModel as P } from "@/content/field";
import { RULES } from "@/lib/engine";
import { cn } from "@/lib/utils";

function Control({
  id, label, unit, value, min, max, step, onChange, hint,
}: {
  id: string; label: string; unit: string; value: number; min: number; max: number; step: number; hint: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label id={id} className="text-[15px] font-medium">{label}</label>
        <span className="tabular text-[15px] font-semibold">
          <NumberFlow value={value} /> <span className="font-normal text-muted">{unit}</span>
        </span>
      </div>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        aria-labelledby={id}
        className="relative mt-4 flex h-6 w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={label}
          className="block size-6 rounded-full border border-border-strong bg-white shadow-[0_2px_8px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.08)] outline-none transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/70 active:scale-95"
        />
      </SliderPrimitive.Root>
      <div className="mt-1.5 flex justify-between text-xs text-subtle">
        <span className="tabular">{min} {unit}</span>
        <span>{hint}</span>
        <span className="tabular">{max} {unit}</span>
      </div>
    </div>
  );
}

export function PowerBudget() {
  const [panelW, setPanelW] = React.useState<number>(P.defaults.panelW);
  const [sun, setSun] = React.useState<number>(P.defaults.sunHours);
  const [hb, setHb] = React.useState<number>(P.defaults.heartbeatS);

  const drawMw = P.sensingMw + (P.joulesPerHeartbeat * 1000) / hb;
  const dailyWh = (drawMw * 24) / 1000;
  const harvestWh = panelW * sun * P.panelEfficiency;
  const autonomyDays = (P.batteryWh * P.usableFraction) / dailyWh;
  const surplus = harvestWh >= dailyWh;
  const silentS = RULES.missedHeartbeats * hb;
  const netWh = harvestWh - dailyWh;

  return (
    <Section
      eyebrow="Power budget"
      title="Solar power budget"
          >
      <div className="grid gap-5 lg:grid-cols-5">
        <Reveal className="lg:col-span-2">
          <Card className="h-full space-y-8 p-6 sm:p-7">
            <Control id="s-panel" label="Solar panel" unit="W" value={panelW} min={0.5} max={3} step={0.1} hint="Panel size" onChange={setPanelW} />
            <Control id="s-sun" label="Sun hours per day" unit="h" value={sun} min={1} max={8} step={0.5} hint="Full-sun equivalent" onChange={setSun} />
            <Control id="s-hb" label="Heartbeat interval" unit="s" value={hb} min={10} max={300} step={5} hint="Quiet-mode report" onChange={setHb} />
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={0.05}>
          <Card className="flex h-full flex-col p-6 sm:p-7">
            <div
              role="status"
              className={cn(
                "flex items-start gap-3 rounded-[16px] px-4 py-3.5",
                surplus ? "bg-normal-soft text-normal" : "bg-warning-soft text-warning"
              )}
            >
              {surplus ? <CheckCircle2Icon className="mt-0.5 size-5 shrink-0" aria-hidden /> : <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden />}
              <p className="text-[15px] font-medium leading-snug">
                {surplus
                  ? `Harvest exceeds use by ${netWh.toFixed(2)} Wh/day.`
                  : `Use exceeds harvest by ${(-netWh).toFixed(2)} Wh/day.`}
              </p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Average draw", v: drawMw, d: 1, u: "mW" },
                { l: "Daily use", v: dailyWh, d: 3, u: "Wh" },
                { l: "Daily harvest", v: harvestWh, d: 2, u: "Wh" },
                { l: "Battery alone lasts", v: autonomyDays, d: 1, u: "days" },
              ].map((m) => (
                <div key={m.l} className="rounded-[16px] bg-surface-2 p-4">
                  <dt className="text-xs text-muted">{m.l}</dt>
                  <dd className="mt-2 tabular text-[26px] font-semibold leading-none tracking-[-0.03em]">
                    <NumberFlow value={m.v} format={{ minimumFractionDigits: m.d, maximumFractionDigits: m.d }} />
                    <span className="ml-1 text-[13px] font-normal text-muted">{m.u}</span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-[18px] border border-border p-5">
              <div className="flex items-center gap-2 text-[13px] font-medium text-subtle">
                <TimerIcon className="size-4" aria-hidden /> Silence detection
              </div>
              <p className="mt-3 text-[15px] leading-relaxed">
                Silent after {RULES.missedHeartbeats} missed heartbeats. At {hb} s that is{" "}
                <span className="tabular font-semibold">
                  <NumberFlow value={silentS} format={{ maximumFractionDigits: 0 }} /> s
                </span>
                .
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                During an event, nodes burst every {RULES.burstS} s.
              </p>
            </div>
            <p className="mt-auto flex items-start gap-2 pt-5 text-xs leading-relaxed text-subtle">
              <ZapIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {P.assumptions}
            </p>
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}
