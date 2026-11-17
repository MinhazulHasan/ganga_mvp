"use client";

import * as React from "react";
import { ChevronRightIcon } from "lucide-react";
import { DetailTrigger, type Detail } from "@/app/_components/overview/detail-sheet";
import { protocols, rtuIntro, type ProtocolId } from "@/content/rtu";
import { cn } from "@/lib/utils";
import { DiagramCard, PointBlock, SvgHit, SvgText } from "./diagram";

const RTU_DETAIL: Detail = {
  eyebrow: "01 · Local brain",
  title: "Remote Terminal Unit (RTU)",
  description: rtuIntro.rtu.body,
  provenance: "planned",
  rows: [
    { label: "Mount", value: "Bedrock above the flood line" },
    { label: "Power", value: "Solar + cold-rated battery" },
    { label: "Sensor inputs", value: "SDI-12 · 4–20 mA · RS-485" },
    { label: "Radio", value: "LoRa, digital VHF fallback" },
  ],
  note: "The three RTUs in the Command Center replay run on simulated readings.",
  links: [{ href: "/command-center", label: "See the RTUs in the replay" }],
};

function protocolDetail(p: (typeof protocols)[number]): Detail {
  return {
    eyebrow: "Field sensor · wired to the RTU",
    title: p.sensor,
    description: p.body,
    provenance: "planned",
    rows: [
      { label: "Connection", value: p.tag, mono: true },
      { label: "Feeds the engine", value: p.feeds },
    ],
    paragraphs: [p.why],
  };
}

export function RtuBrain() {
  const [active, setActive] = React.useState<ProtocolId | null>(null);
  const on = (id: ProtocolId) => active === id;
  const dim = (id: ProtocolId) => active !== null && active !== id;
  const hover = (id: ProtocolId) => (v: boolean) => setActive(v ? id : null);
  const cable = (id: ProtocolId) => cn("fill-none transition-[stroke,opacity] duration-200", on(id) ? "stroke-primary" : "stroke-foreground/40", dim(id) && "opacity-30");
  const part = (id: ProtocolId) => cn("transition-[fill,opacity] duration-200", on(id) ? "fill-primary" : "fill-foreground", dim(id) && "opacity-30");

  const chip = (id: ProtocolId, cx: number, y: number, w: number) => {
    const p = protocols.find((x) => x.id === id)!;
    return (
      <g className={cn("transition-opacity duration-200", dim(id) && "opacity-30")}>
        <rect x={cx - w / 2} y={y} width={w} height={20} rx={10} className={cn("transition-[fill,stroke]", on(id) ? "fill-primary stroke-primary" : "fill-surface stroke-border-strong")} strokeWidth={1} />
        <text x={cx} y={y + 13.6} textAnchor="middle" fontSize={10.5} fontWeight={600} className={on(id) ? "fill-primary-foreground" : "fill-foreground"} style={{ fontFamily: "var(--font-mono)" }}>
          {p.tag}
        </text>
      </g>
    );
  };

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="flex flex-col gap-7">
        <PointBlock title={rtuIntro.rtu.title} body={rtuIntro.rtu.body} />
        <PointBlock title={rtuIntro.wired.title} body={rtuIntro.wired.body} />

        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">Field protocols</p>
          <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-surface shadow-soft">
            {protocols.map((p) => (
              <li key={p.id}>
                <DetailTrigger
                  detail={protocolDetail(p)}
                  onPointerEnter={() => setActive(p.id)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(p.id)}
                  onBlur={() => setActive(null)}
                  className={cn("group flex w-full items-start gap-3.5 px-4 py-3.5 transition-colors", on(p.id) ? "bg-surface-2" : "hover:bg-surface-2")}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-6 min-w-[68px] shrink-0 items-center justify-center rounded-full px-2 font-mono text-[11px] font-semibold transition-colors",
                      on(p.id) ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground hairline"
                    )}
                  >
                    {p.tag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold tracking-[-0.01em]">{p.sensor}</span>
                    <span className="mt-0.5 block text-[13.5px] leading-relaxed text-muted">{p.body}</span>
                  </span>
                  <ChevronRightIcon className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                </DetailTrigger>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <DiagramCard label="Cross-section at the lake" provenance="planned" provenanceTip="Field design. Hardware not built yet.">
        <svg viewBox="0 108 600 272" className="block h-auto w-full" role="img" aria-label="RTU on bedrock above the flood line, wired to a radar level sensor, a submerged pressure sensor and a geophone">
          {/* mountains + ground */}
          <path d="M0 300 L70 205 L110 238 L180 140 L250 225 L300 190 L360 252 L410 228 L470 300 Z" className="fill-surface-3" />
          <rect x={0} y={300} width={600} height={80} className="fill-surface-2" />

          {/* lake */}
          <ellipse cx={250} cy={322} rx={175} ry={24} className="fill-watch-soft stroke-watch/40" strokeWidth={1.5} />
          <rect x={150} y={315} width={18} height={6} rx={1.5} transform="rotate(-8 159 318)" className="fill-surface stroke-border-strong" />
          <rect x={292} y={324} width={14} height={5} rx={1.5} transform="rotate(12 299 326)" className="fill-surface stroke-border-strong" />
          <rect x={372} y={316} width={12} height={5} rx={1.5} className="fill-surface stroke-border-strong" />

          {/* flood zone */}
          <line x1={16} y1={268} x2={462} y2={268} className="stroke-emergency" strokeWidth={1.5} strokeDasharray="6 6" />
          <SvgText x={18} y={260} size={10.5} weight={650} className="fill-emergency">
            <tspan letterSpacing="0.12em">FLOOD ZONE</tspan>
          </SvgText>

          {/* bedrock */}
          <path d="M455 380 L462 318 Q470 262 520 246 L600 236 V380 Z" className="fill-subtle/45" />
          <SvgText x={545} y={300} anchor="middle" weight={650} className="fill-foreground">
            Safe bedrock
          </SvgText>
          <SvgText x={545} y={315} anchor="middle" size={10}>
            above the flood line
          </SvgText>

          {/* cables (buried) */}
          <path d="M205 334 V356 H455" className={cable("sdi12")} strokeWidth={on("sdi12") ? 2.6 : 2} strokeLinejoin="round" />
          <path d="M331 338 V356" className={cable("ma")} strokeWidth={on("ma") ? 2.6 : 2} />
          <path d="M438 312 V356 H455" className={cable("rs485")} strokeWidth={on("rs485") ? 2.6 : 2} strokeLinejoin="round" />
          <path d="M455 356 C 480 356 486 320 492 290 S 498 232 505 220" className="fill-none stroke-foreground/60" strokeWidth={4} strokeLinecap="round" />
          <SvgText x={300} y={373} anchor="middle" size={10} className="fill-subtle">
            Armored cable bundle
          </SvgText>

          {/* radar (SDI-12) */}
          <SvgHit detail={protocolDetail(protocols[0])} label="Radar level sensor, SDI-12" onHover={hover("sdi12")}>
            <rect x={196} y={196} width={92} height={110} className="fill-transparent" />
            <path d="M205 334 V232 H262" className={cn("fill-none", dim("sdi12") ? "stroke-foreground/20" : "stroke-foreground/55")} strokeWidth={3} strokeLinejoin="round" />
            <rect x={254} y={232} width={16} height={12} rx={2} className={part("sdi12")} />
            <path d="M262 246 L248 300 M262 246 L276 300" className={cn("fill-none", on("sdi12") ? "stroke-primary" : "stroke-foreground/35", dim("sdi12") && "opacity-30")} strokeWidth={1.2} strokeDasharray="3 4" />
            {chip("sdi12", 262, 204, 58)}
          </SvgHit>

          {/* pressure (4–20 mA) */}
          <SvgHit detail={protocolDetail(protocols[1])} label="Submerged pressure sensor, 4–20 mA" onHover={hover("ma")}>
            <rect x={296} y={276} width={70} height={66} className="fill-transparent" />
            <line x1={331} y1={298} x2={331} y2={328} className={cn(on("ma") ? "stroke-primary" : "stroke-foreground/30", dim("ma") && "opacity-30")} strokeWidth={1} strokeDasharray="2 3" />
            <rect x={322} y={328} width={18} height={10} rx={5} className={part("ma")} />
            {chip("ma", 331, 278, 64)}
          </SvgHit>

          {/* geophone (RS-485) */}
          <SvgHit detail={protocolDetail(protocols[2])} label="Geophone, RS-485" onHover={hover("rs485")}>
            <rect x={400} y={272} width={62} height={44} className="fill-transparent" />
            <rect x={432} y={292} width={12} height={8} rx={2} className={part("rs485")} />
            <path d="M434 300 L442 300 L438 312 Z" className={part("rs485")} />
            {chip("rs485", 430, 268, 60)}
          </SvgHit>

          {/* RTU + solar */}
          <SvgHit detail={RTU_DETAIL} label="RTU">
            <rect x={492} y={120} width={100} height={128} className="fill-transparent" />
            <line x1={537} y1={150} x2={537} y2={184} className="stroke-foreground/60" strokeWidth={2.5} />
            <rect x={497} y={138} width={80} height={10} rx={2} transform="rotate(-10 537 143)" className="fill-foreground" />
            <line x1={537} y1={226} x2={537} y2={246} className="stroke-foreground/60" strokeWidth={3} />
            <rect x={505} y={184} width={64} height={42} rx={8} className="fill-primary" />
            <text x={537} y={210} textAnchor="middle" fontSize={14} fontWeight={700} className="fill-primary-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              RTU
            </text>
          </SvgHit>
          <SvgText x={596} y={122} anchor="end" size={10} className="fill-subtle">
            Solar-powered
          </SvgText>
        </svg>
      </DiagramCard>
    </div>
  );
}
