"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronRightIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Detail } from "@/app/_components/overview/detail-sheet";
import { radio } from "@/content/rtu";
import { cn } from "@/lib/utils";
import { DiagramCard, SvgHit, SvgText } from "./diagram";

const STEP_MS = 1100;

const LORA: Detail = {
  eyebrow: "03 · Primary link",
  title: "LoRa",
  description: "Long-range, low-power radio. Each RTU sends its readings and waits for an acknowledgement (ACK) from the station.",
  provenance: "planned",
  rows: [
    { label: "Range", value: "Kilometres, needs a clear path" },
    { label: "Power", value: "Milliwatts" },
    { label: "When the link weakens", value: "Raise the spreading factor (SF)" },
  ],
  paragraphs: ["A higher spreading factor sends each bit more slowly. That buys range at the cost of airtime and battery."],
};

const VHF: Detail = {
  eyebrow: "03 · Fallback link",
  title: "Digital VHF radio",
  description: "Switched on only when LoRa gets no ACK. Off the rest of the time.",
  provenance: "planned",
  rows: [
    { label: "Trigger", value: "No ACK from the station" },
    { label: "Why it works", value: "Longer waves bend over ridges" },
    { label: "Standby draw", value: "Zero (hardware-gated)" },
  ],
  paragraphs: ["VHF wavelengths are metres long, so the signal diffracts over ridges and carries further than LoRa in a mountain valley."],
};

const STATION: Detail = {
  eyebrow: "03 · Receiver",
  title: "Local valley station",
  description: "Listens for LoRa and VHF, sends back the ACK, and passes every reading to the fusion engine.",
  provenance: "planned",
  links: [{ href: "#valley", label: "How the station reaches the valley" }],
};

export function Failover() {
  const [step, setStep] = React.useState(-1); // -1 idle, 0..3 = radio.steps
  const timers = React.useRef<number[]>([]);
  const arrowId = React.useId().replace(/:/g, "");

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  React.useEffect(() => clear, []);

  const running = step >= 0 && step < radio.steps.length - 1;
  const done = step === radio.steps.length - 1;

  const run = () => {
    clear();
    if (done) {
      setStep(-1);
      toast("Back on LoRa", { id: "arch-failover", description: "VHF switched off again." });
      return;
    }
    setStep(0);
    radio.steps.forEach((_, i) => {
      if (i === 0) return;
      timers.current.push(
        window.setTimeout(() => {
          setStep(i);
          if (i === radio.steps.length - 1) toast.success("Switched to digital VHF", { id: "arch-failover", description: "No ACK on LoRa, so the RTU turned its VHF radio on." });
        }, i * STEP_MS)
      );
    });
  };

  const sending = step >= 0;
  const weak = step >= 1;
  const noAck = step >= 2;
  const vhfOn = step >= 3;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <div className="flex flex-col gap-8">
        {[
          { tag: "Primary", tone: "bg-foreground text-background", ...radio.primary },
          { tag: "Fallback", tone: "bg-surface-2 text-foreground hairline", ...radio.fallback },
        ].map((b) => (
          <div key={b.tag}>
            <span className={cn("inline-flex h-6 items-center rounded-[7px] px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]", b.tone)}>{b.tag}</span>
            <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.02em]">
              {b.title} <span className="text-[14px] font-normal text-subtle">· {b.sub}</span>
            </h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              {b.points.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                  <span className="mt-[10px] size-1 shrink-0 rounded-full bg-subtle" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <DiagramCard
        label="Link failover"
        provenance="planned"
        provenanceTip="Radio design. Not built yet."
        controls={
          <Button variant="outline" size="sm" onClick={run} disabled={running}>
            {done ? <RotateCcwIcon /> : <PlayIcon />}
            {done ? "Reset" : running ? "Running…" : "Run failover"}
          </Button>
        }
        footer={
          <div>
            <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">Failover logic</p>
            <ol className="flex flex-wrap items-center gap-1.5" aria-live="polite">
              {radio.steps.map((s, i) => {
                const state = step === -1 ? "idle" : i < step ? "done" : i === step ? "now" : "next";
                return (
                  <li key={s.id} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex h-8 items-center rounded-[10px] px-3 text-[12.5px] font-medium transition-colors duration-300",
                        state === "idle" && "bg-surface-2 text-foreground hairline",
                        state === "done" && "bg-surface-2 text-muted hairline",
                        state === "next" && "bg-surface-2/40 text-subtle hairline",
                        state === "now" && s.id === "noack" && "bg-emergency-soft text-emergency",
                        state === "now" && s.id !== "noack" && "bg-primary text-primary-foreground"
                      )}
                      aria-current={state === "now" ? "step" : undefined}
                    >
                      {s.label}
                    </span>
                    {i < radio.steps.length - 1 && <ChevronRightIcon className="size-3.5 text-subtle" aria-hidden />}
                  </li>
                );
              })}
            </ol>
          </div>
        }
      >
        <svg viewBox="0 0 600 320" className="block h-auto w-full" role="img" aria-label="RTU sends on LoRa across the valley; when no acknowledgement returns, a VHF link arcs over the ridge to the local station">
          <defs>
            <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 Z" className={vhfOn ? "fill-primary" : "fill-subtle/60"} />
            </marker>
          </defs>

          <rect x={0} y={296} width={600} height={24} className="fill-surface-2" />

          {/* mountain + storm */}
          <path d="M190 296 L320 128 L452 296 Z" className="fill-surface-3" />
          <g className="fill-subtle/45">
            <circle cx={300} cy={98} r={17} />
            <circle cx={323} cy={88} r={22} />
            <circle cx={347} cy={100} r={15} />
            <rect x={284} y={98} width={78} height={17} rx={8} />
          </g>
          <path d="M298 122 l-4 10 M312 122 l-4 10 M326 122 l-4 10 M340 122 l-4 10" className="stroke-subtle/60" strokeWidth={1.4} strokeLinecap="round" />

          {/* VHF arc */}
          <SvgHit detail={VHF} label="Digital VHF fallback link">
            <path d="M88 146 Q 318 -60 548 184" className="fill-none stroke-transparent" strokeWidth={16} />
            {vhfOn && <path d="M88 146 Q 318 -60 548 184" className="fill-none stroke-primary/20" strokeWidth={10} strokeLinecap="round" />}
            <path
              d="M88 146 Q 318 -60 548 184"
              className={cn("fill-none transition-[stroke] duration-500", vhfOn ? "stroke-primary" : "stroke-subtle/55")}
              strokeWidth={vhfOn ? 3 : 1.6}
              strokeDasharray={vhfOn ? undefined : "3 6"}
              strokeLinecap="round"
              markerEnd={`url(#${arrowId})`}
            />
            <SvgText x={318} y={26} anchor="middle" size={12} weight={650} className={vhfOn ? "fill-primary" : "fill-foreground"}>
              Digital VHF · fallback
            </SvgText>
            <SvgText x={318} y={41} anchor="middle" size={10.5}>
              {vhfOn ? "On: bends over the ridge" : "Off until needed"}
            </SvgText>
          </SvgHit>

          {/* LoRa path */}
          <SvgHit detail={LORA} label="LoRa primary link">
            <line x1={88} y1={150} x2={546} y2={188} className="stroke-transparent" strokeWidth={14} />
            <line
              x1={88}
              y1={150}
              x2={546}
              y2={188}
              className={cn("transition-[stroke,opacity] duration-300", sending && !noAck ? "animate-flow stroke-primary" : "stroke-foreground/45", noAck && "opacity-45")}
              strokeWidth={weak && !noAck ? 1.3 : 1.8}
              strokeDasharray="6 6"
            />
            <SvgText x={150} y={146} size={10.5} weight={650} className="fill-foreground">
              {weak ? "LoRa · SF 7 → 12" : "LoRa · primary"}
            </SvgText>
          </SvgHit>
          {noAck && (
            <g>
              <path d="M432 172 l14 14 M446 172 l-14 14" className="stroke-emergency" strokeWidth={2.6} strokeLinecap="round" />
              <SvgText x={456} y={168} size={11} weight={650} className="fill-emergency">
                No ACK
              </SvgText>
            </g>
          )}

          {/* RTU on rock */}
          <path d="M20 296 L46 226 L92 210 L140 232 L156 296 Z" className="fill-subtle/50" />
          <line x1={88} y1={172} x2={88} y2={146} className="stroke-foreground/60" strokeWidth={2} />
          <circle cx={88} cy={146} r={2.5} className="fill-foreground/70" />
          <rect x={60} y={172} width={56} height={38} rx={7} className="fill-primary" />
          <text x={88} y={196} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-primary-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            RTU
          </text>

          {/* station */}
          <SvgHit detail={STATION} label="Local valley station">
            <path d="M482 296 V232 L527 204 L572 232 V296 Z" className="fill-foreground" />
            <line x1={548} y1={216} x2={548} y2={186} className="stroke-foreground" strokeWidth={2} />
            <line x1={541} y1={192} x2={555} y2={192} className="stroke-foreground" strokeWidth={2} />
            <SvgText x={527} y={258} anchor="middle" size={11} weight={650} className="fill-background">
              Local
            </SvgText>
            <SvgText x={527} y={272} anchor="middle" size={11} weight={650} className="fill-background">
              station
            </SvgText>
          </SvgHit>
        </svg>
      </DiagramCard>
    </div>
  );
}
