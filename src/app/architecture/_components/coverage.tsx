"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronRightIcon, RotateCcwIcon, ZapOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailTrigger, type Detail } from "@/app/_components/overview/detail-sheet";
import { coverage } from "@/content/rtu";
import { cn } from "@/lib/utils";
import { DiagramCard, SvgHit, SvgText } from "./diagram";

type Cp = (typeof coverage.checkpoints)[number];

function cpDetail(c: Cp): Detail {
  return {
    eyebrow: `02 · RTU ${c.n} of 3`,
    title: c.name,
    description: c.body,
    provenance: "simulated",
    rows: [
      { label: "Position", value: `${c.km} km from the source` },
      { label: "In the replay", value: `RTU${c.n}`, mono: true },
    ],
    note: "Positions on the 26 August corridor. Readings in the replay are simulated.",
    links: [{ href: "/command-center", label: "Open the replay" }],
  };
}

/** Pin centre and label anchor for each checkpoint on the map. */
const PINS = [
  { x: 207, y: 96, leader: "M220 96 H372", ly: 92 },
  { x: 243, y: 206, leader: "M256 206 H372", ly: 202 },
  { x: 256, y: 306, leader: "M268 312 L296 336 H372", ly: 332 },
];

export function Coverage() {
  const [hot, setHot] = React.useState<number | null>(null);
  const [lost, setLost] = React.useState(false);

  const toggle = () => {
    const next = !lost;
    setLost(next);
    if (next) toast("Lake RTU silent", { id: "arch-lost", description: "The gorge RTU takes over. The silence itself is flood evidence (rule R4)." });
    else toast("Lake RTU restored", { id: "arch-lost", description: "All three checkpoints reporting." });
  };

  const sub = (i: number, c: Cp) => {
    if (lost && i === 0) return { text: "Silent · flood evidence (R4)", cls: "fill-emergency" };
    if (lost && i === 1) return { text: "Takes over the watch", cls: "fill-primary" };
    return { text: c.short, cls: "fill-muted" };
  };

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="flex flex-col gap-7">
        <div className="rounded-[18px] border border-border bg-surface-2/70 p-5">
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{coverage.callout.title}</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{coverage.callout.body}</p>
        </div>

        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">Three checkpoints</p>
          <ol className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-surface shadow-soft">
            {coverage.checkpoints.map((c, i) => (
              <li key={c.n}>
                <DetailTrigger
                  detail={cpDetail(c)}
                  onPointerEnter={() => setHot(i)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(i)}
                  onBlur={() => setHot(null)}
                  className={cn("group flex w-full items-start gap-4 px-4 py-3.5 transition-colors", hot === i ? "bg-surface-2" : "hover:bg-surface-2")}
                >
                  <span className={cn("tabular w-7 shrink-0 text-[22px] font-semibold leading-none tracking-[-0.03em] transition-colors", hot === i ? "text-foreground" : "text-subtle")}>
                    0{c.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[14.5px] font-semibold tracking-[-0.01em]">{c.name}</span>
                      <span className="tabular text-[12.5px] text-subtle">{c.km} km</span>
                    </span>
                    <span className="mt-0.5 block text-[13.5px] leading-relaxed text-muted">{c.body}</span>
                  </span>
                  <ChevronRightIcon className="mt-1 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                </DetailTrigger>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <DiagramCard
        label="Valley map"
        provenance="simulated"
        provenanceTip="The three RTUs run in the Command Center replay on simulated readings."
        controls={
          <Button variant="outline" size="sm" onClick={toggle} aria-pressed={lost}>
            {lost ? <RotateCcwIcon /> : <ZapOffIcon />}
            {lost ? "Restore lake RTU" : "Lose the lake RTU"}
          </Button>
        }
      >
        <svg viewBox="0 8 600 392" className="block h-auto w-full" role="img" aria-label="Map: lake RTU at the outlet, gorge RTU in the narrow gorge, confluence RTU where the tributary joins, villages downstream">
          {/* peaks + lake */}
          <path d="M30 74 L74 30 L104 54 L146 16 L188 58 L222 38 L262 80 Z" className="fill-surface-3" />
          <ellipse cx={140} cy={84} rx={80} ry={24} className="fill-watch-soft stroke-watch/40" strokeWidth={1.5} />
          <SvgText x={136} y={88} anchor="middle" weight={600} className="fill-foreground/70">
            Glacial lake
          </SvgText>

          {/* avalanche hazard */}
          <path d="M40 120 L53 142 L27 142 Z" className="fill-warning-soft stroke-warning" strokeWidth={1.5} strokeLinejoin="round" />
          <SvgText x={40} y={139} anchor="middle" size={11} weight={700} className="fill-warning">
            !
          </SvgText>
          <SvgText x={60} y={138} size={10.5}>
            Avalanche hazard
          </SvgText>

          {/* river + tributary */}
          <path d="M600 252 C 520 258 430 282 256 306" className="fill-none stroke-watch/35" strokeWidth={6} strokeLinecap="round" />
          <SvgText x={556} y={244} anchor="middle" size={10.5} className="fill-subtle">
            <tspan fontStyle="italic">Tributary</tspan>
          </SvgText>
          <path d="M205 96 C 235 122 228 160 240 200 S 268 262 252 300 S 236 352 290 400" className="fill-none stroke-watch/45" strokeWidth={9} strokeLinecap="round" />

          {/* gorge walls */}
          <path d="M184 170 L200 158 L218 162 L224 196 L228 232 L220 256 L198 262 L190 228 Z" className="fill-subtle/50" />
          <path d="M262 162 L284 158 L300 176 L296 214 L290 250 L270 254 L264 214 Z" className="fill-subtle/50" />
          <SvgText x={178} y={214} anchor="end" size={10.5}>
            Narrow gorge
          </SvgText>

          {/* villages */}
          {[
            [306, 362],
            [326, 354],
            [346, 364],
          ].map(([x, y]) => (
            <path key={x} d={`M${x - 8} ${y} L${x} ${y - 8} L${x + 8} ${y} V${y + 9} H${x - 8} Z`} className="fill-subtle/70" />
          ))}
          <SvgText x={326} y={390} anchor="middle" size={10.5}>
            Villages
          </SvgText>
          <SvgText x={592} y={392} anchor="end" size={10} className="fill-subtle">
            Flow direction ↓
          </SvgText>

          {/* checkpoints */}
          {coverage.checkpoints.map((c, i) => {
            const p = PINS[i];
            const isLost = lost && i === 0;
            const takeover = lost && i === 1;
            const s = sub(i, c);
            return (
              <SvgHit key={c.n} detail={cpDetail(c)} label={`${c.name}, ${c.km} km`} onHover={(v) => setHot(v ? i : null)}>
                <rect x={p.x - 18} y={p.y - 18} width={600 - p.x + 18} height={44} className="fill-transparent" />
                <path d={p.leader} className={cn("fill-none transition-colors", hot === i ? "stroke-foreground/60" : "stroke-foreground/25")} strokeWidth={1} />
                {takeover && (
                  <circle cx={p.x} cy={p.y} r={13} className="animate-pulse-ring fill-primary/40" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                )}
                {hot === i && !isLost && <circle cx={p.x} cy={p.y} r={18} className="fill-primary/15" />}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={13}
                  className={cn("transition-colors", isLost ? "fill-surface-3 stroke-subtle" : "fill-primary stroke-surface")}
                  strokeWidth={isLost ? 1.5 : 2.5}
                  strokeDasharray={isLost ? "3 3" : undefined}
                />
                <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} className={isLost ? "fill-subtle" : "fill-primary-foreground"} style={{ fontFamily: "var(--font-sans)" }}>
                  {c.n}
                </text>
                <SvgText x={380} y={p.ly} size={12.5} weight={650} className={isLost ? "fill-subtle" : "fill-foreground"}>
                  {c.name} · {c.km} km
                </SvgText>
                <SvgText x={380} y={p.ly + 16} size={10.5} className={s.cls}>
                  {s.text}
                </SvgText>
              </SvgHit>
            );
          })}
        </svg>
      </DiagramCard>
    </div>
  );
}
