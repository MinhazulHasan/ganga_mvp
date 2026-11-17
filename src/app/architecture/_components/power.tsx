"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { Detail } from "@/app/_components/overview/detail-sheet";
import { power } from "@/content/rtu";
import { cn } from "@/lib/utils";
import { DiagramCard, SvgHit, SvgText } from "./diagram";

const D = {
  solar: {
    eyebrow: "04 · Power path",
    title: "Solar panel",
    description: "Charges the battery on clear days. Tilted steeply so snow slides off.",
    provenance: "planned",
  },
  controller: {
    eyebrow: "04 · Power path",
    title: "Charge controller",
    description: "Protects the battery: stops charging below freezing and cuts the load before the battery is drained.",
    provenance: "planned",
  },
  battery: {
    eyebrow: "04 · Power path",
    title: "Cold-rated battery",
    description: "Chemistry rated for sub-zero nights. Most of the charge is kept in reserve for days when snow covers the panel.",
    provenance: "planned",
  },
  rtu: {
    eyebrow: "04 · Always on",
    title: "RTU, sensors and LoRa",
    description: "Sleeps most of the time and wakes briefly to measure and report. This is the only load on a normal day.",
    provenance: "planned",
  },
  vhf: {
    eyebrow: "04 · Gated load",
    title: "VHF radio",
    description: "Behind a hardware switch. It draws nothing until LoRa fails or a flood starts.",
    provenance: "planned",
  },
} satisfies Record<string, Detail>;

export function PowerPath() {
  const [emergency, setEmergency] = React.useState(false);
  const arrowId = React.useId().replace(/:/g, "");

  const onToggle = (v: boolean) => {
    setEmergency(v);
    if (v) toast("Flood emergency", { id: "arch-power", description: "Switch closed. The VHF radio is on and transmitting." });
    else toast("Back to normal", { id: "arch-power", description: "Switch open. VHF draws zero again." });
  };

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="flex flex-col gap-7">
        <div className="rounded-[18px] border border-border bg-surface-2/70 p-5">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{power.challenge.title}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{power.challenge.body}</p>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">Three ways to save energy</p>
          <ol className="flex flex-col gap-5">
            {power.tiers.map((t) => (
              <li key={t.n} className="flex gap-4">
                <span className="tabular w-7 shrink-0 text-[22px] font-semibold leading-none tracking-[-0.03em] text-subtle">{t.n}</span>
                <div>
                  <h4 className="text-[15px] font-semibold tracking-[-0.01em]">{t.title}</h4>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <DiagramCard
        label="Power path"
        provenance="planned"
        provenanceTip="Power design. Not built yet."
        controls={
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium">
            <Switch tone="danger" checked={emergency} onCheckedChange={onToggle} aria-label="Flood emergency" />
            Flood emergency
          </label>
        }
        footer={
          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">Battery use · {emergency ? "flood event" : "normal day"}</p>
              <p className="text-[11.5px] text-subtle">Illustrative</p>
            </div>
            <div className="flex h-8 overflow-hidden rounded-[9px] bg-surface-2 hairline" role="img" aria-label={emergency ? "Small share for sleep and LoRa, a larger share for VHF, the rest held in reserve" : "A tiny sliver for sleep and LoRa, zero for VHF, the rest held in reserve"}>
              <span className="w-[3%] shrink-0 bg-primary" />
              <span className={cn("shrink-0 bg-emergency-fill transition-[width] duration-500 ease-out", emergency ? "w-[22%]" : "w-0")} />
              <span className="flex flex-1 items-center justify-center px-2 text-[12px] text-muted">Reserve for snow-covered days</span>
            </div>
            <div className="mt-2.5 flex flex-wrap justify-between gap-x-6 gap-y-1 text-[12.5px]">
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-[2px] bg-primary" aria-hidden />
                <span className="font-medium">Deep sleep + LoRa</span>
                <span className="text-muted">a tiny sliver</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-[2px] bg-emergency-fill" aria-hidden />
                <span className="font-medium">VHF</span>
                <span className="text-muted">{emergency ? "transmitting" : "zero on a normal day"}</span>
              </span>
            </div>
          </div>
        }
      >
        <svg viewBox="0 30 600 216" className="block h-auto w-full" role="img" aria-label="Solar panel to charge controller to cold-rated battery. The battery feeds the RTU, sensors and LoRa all the time, and the VHF radio only through a switch.">
          <defs>
            <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 Z" className="fill-foreground/55" />
            </marker>
          </defs>

          {/* solar */}
          <SvgHit detail={D.solar} label="Solar panel">
            <rect x={18} y={36} width={112} height={100} className="fill-transparent" />
            <path d="M28 82 L98 58 L120 94 L50 118 Z" className="fill-foreground" />
            <path d="M51 74 L73 110 M74 66 L96 102 M39 100 L109 76" className="stroke-background/35" strokeWidth={1} />
            <SvgText x={74} y={138} anchor="middle" weight={600} className="fill-foreground">
              Solar panel
            </SvgText>
          </SvgHit>

          <line x1={128} y1={80} x2={194} y2={80} className="stroke-foreground/55" strokeWidth={1.6} markerEnd={`url(#${arrowId})`} />

          {/* controller */}
          <SvgHit detail={D.controller} label="Charge controller">
            <rect x={200} y={54} width={124} height={52} rx={11} className="fill-surface-2 stroke-border-strong" strokeWidth={1.2} />
            <SvgText x={262} y={76} anchor="middle" weight={600} className="fill-foreground">
              Charge
            </SvgText>
            <SvgText x={262} y={91} anchor="middle" weight={600} className="fill-foreground">
              controller
            </SvgText>
          </SvgHit>

          <line x1={324} y1={80} x2={390} y2={80} className="stroke-foreground/55" strokeWidth={1.6} markerEnd={`url(#${arrowId})`} />

          {/* battery */}
          <SvgHit detail={D.battery} label="Cold-rated battery">
            <rect x={396} y={50} width={122} height={60} rx={11} className="fill-foreground" />
            <rect x={518} y={68} width={8} height={24} rx={2} className="fill-foreground" />
            <rect x={406} y={60} width={20} height={40} rx={5} className="fill-normal-fill" />
            <SvgText x={474} y={77} anchor="middle" weight={650} className="fill-background">
              Cold-rated
            </SvgText>
            <SvgText x={474} y={92} anchor="middle" weight={650} className="fill-background">
              battery
            </SvgText>
          </SvgHit>

          {/* always-on feed */}
          <path d="M432 110 V136 H280 V164" className="fill-none stroke-primary" strokeWidth={2} strokeLinejoin="round" />
          <SvgHit detail={D.rtu} label="RTU, sensors and LoRa">
            <rect x={168} y={164} width={224} height={56} rx={11} className="fill-primary" />
            <SvgText x={280} y={188} anchor="middle" size={12.5} weight={650} className="fill-primary-foreground">
              RTU + sensors + LoRa
            </SvgText>
            <SvgText x={280} y={205} anchor="middle" size={10.5} className="fill-primary-foreground/80">
              Always on, mostly asleep
            </SvgText>
          </SvgHit>

          {/* gated feed */}
          <path d="M500 110 V134" className={cn("fill-none transition-[stroke]", emergency ? "stroke-emergency" : "stroke-foreground/45")} strokeWidth={2} />
          <circle cx={500} cy={136} r={3} className={emergency ? "fill-emergency" : "fill-foreground/60"} />
          <line
            x1={500}
            y1={136}
            x2={emergency ? 500 : 518}
            y2={emergency ? 160 : 154}
            className={cn("transition-all duration-300", emergency ? "stroke-emergency" : "stroke-foreground/60")}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle cx={500} cy={162} r={3} className={emergency ? "fill-emergency" : "fill-foreground/60"} />
          <path d="M500 164 V178" className={cn("fill-none", emergency ? "stroke-emergency" : "stroke-foreground/30")} strokeWidth={2} strokeDasharray={emergency ? undefined : "3 4"} />
          <SvgText x={526} y={152} size={10} weight={650} className={emergency ? "fill-emergency" : "fill-subtle"}>
            <tspan letterSpacing="0.1em">{emergency ? "CLOSED" : "OPEN"}</tspan>
          </SvgText>

          <SvgHit detail={D.vhf} label="VHF radio">
            <rect
              x={424}
              y={178}
              width={160}
              height={56}
              rx={11}
              className={cn("transition-colors duration-300", emergency ? "fill-emergency-soft stroke-emergency" : "fill-surface-2 stroke-border-strong")}
              strokeWidth={1.4}
              strokeDasharray={emergency ? undefined : "4 4"}
            />
            <SvgText x={504} y={202} anchor="middle" size={12.5} weight={650} className={emergency ? "fill-emergency" : "fill-foreground"}>
              VHF radio
            </SvgText>
            <SvgText x={504} y={219} anchor="middle" size={10.5} className={emergency ? "fill-emergency" : "fill-muted"}>
              {emergency ? "Transmitting" : "Off until an emergency"}
            </SvgText>
          </SvgHit>
        </svg>
      </DiagramCard>
    </div>
  );
}
