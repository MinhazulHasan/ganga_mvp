"use client";

import * as React from "react";
import { motion, useInView } from "motion/react";
import { toast } from "sonner";
import {
  BadgeCheckIcon,
  BanIcon,
  BrainCircuitIcon,
  CheckIcon,
  CircleDashedIcon,
  CpuIcon,
  FileTextIcon,
  FlaskConicalIcon,
  GlobeIcon,
  MailIcon,
  MessageSquareTextIcon,
  PauseIcon,
  PlayIcon,
  RadioIcon,
  RouterIcon,
  ServerIcon,
  SirenIcon,
  SmartphoneIcon,
  UnplugIcon,
  WrenchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import type { ProvenanceKind } from "@/components/brand/provenance";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDetailSheet, type Detail } from "./detail-sheet";
import type { OverviewFacts } from "./facts";
import { useMediaQuery, usePrefersReducedMotion } from "./hooks";

type NodeId = "sensors" | "lora" | "gateway" | "broker" | "fusion" | "wan" | "siren" | "gsm" | "sns" | "email" | "llm" | "local" | "cloud";
type Lane = "chain" | "local" | "cloud";
type Edge = { id: string; from: NodeId; to: NodeId; lane: Lane; step: number; /** take the end x from this element (panel edge) */ endX?: NodeId };

const CHAIN: Edge[] = [
  { id: "c1", from: "sensors", to: "lora", lane: "chain", step: 0 },
  { id: "c2", from: "lora", to: "gateway", lane: "chain", step: 1 },
  { id: "c3", from: "gateway", to: "broker", lane: "chain", step: 2 },
  { id: "c4", from: "broker", to: "fusion", lane: "chain", step: 3 },
];
const DESKTOP_EDGES: Edge[] = [
  ...CHAIN,
  { id: "d1", from: "fusion", to: "siren", lane: "local", step: 4, endX: "local" },
  { id: "d2", from: "fusion", to: "gsm", lane: "local", step: 4, endX: "local" },
  { id: "d3", from: "fusion", to: "wan", lane: "cloud", step: 4 },
  { id: "d4", from: "wan", to: "sns", lane: "cloud", step: 5, endX: "cloud" },
  { id: "d5", from: "wan", to: "email", lane: "cloud", step: 5, endX: "cloud" },
  { id: "d6", from: "wan", to: "llm", lane: "cloud", step: 5, endX: "cloud" },
];
const MOBILE_EDGES: Edge[] = [
  ...CHAIN,
  { id: "m1", from: "fusion", to: "local", lane: "local", step: 4 },
  { id: "m2", from: "fusion", to: "wan", lane: "cloud", step: 4 },
  { id: "m3", from: "wan", to: "cloud", lane: "cloud", step: 5 },
];

const HOP_S = 1.05;
const STEP_S = 0.4;
const CYCLE_S = 4.4;

type Geo = { w: number; h: number; paths: Record<string, { d: string; sx: number; sy: number; ex: number; ey: number }> };

const KIND: Record<ProvenanceKind, { icon: LucideIcon; label: string; className: string }> = {
  built: { icon: BadgeCheckIcon, label: "Built", className: "text-built" },
  simulated: { icon: FlaskConicalIcon, label: "Simulated", className: "text-simulated" },
  planned: { icon: CircleDashedIcon, label: "Planned", className: "text-subtle" },
};

export type FlowDetails = Record<Exclude<NodeId, "local" | "cloud">, Detail & { provenance: ProvenanceKind }>;

export function DataFlow({ facts, details }: { facts: OverviewFacts; details: FlowDetails }) {
  const show = useDetailSheet();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const reduce = usePrefersReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { amount: 0.2 });
  const [geo, setGeo] = React.useState<Geo | null>(null);
  const [cut, setCut] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const animate = !reduce && !paused && inView;
  const edges = isDesktop ? DESKTOP_EDGES : MOBILE_EDGES;

  // Measure node boxes and draw beams between them. ResizeObserver also fires once on observe.
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const el = (id: NodeId) => root.querySelector<HTMLElement>(`[data-flow-id="${id}"]`);
    const measure = () => {
      const box = root.getBoundingClientRect();
      const paths: Geo["paths"] = {};
      for (const e of edges) {
        const a = el(e.from);
        const b = el(e.to);
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        if (isDesktop) {
          const xEl = e.endX ? el(e.endX) : null;
          const sx = ra.right - box.left;
          const sy = ra.top + ra.height / 2 - box.top;
          const ex = (xEl ? xEl.getBoundingClientRect().left : rb.left) - box.left;
          const ey = rb.top + rb.height / 2 - box.top;
          const dx = (ex - sx) * 0.5;
          paths[e.id] = { d: `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`, sx, sy, ex, ey };
        } else {
          const sx = ra.left + ra.width / 2 - box.left;
          const sy = ra.bottom - box.top;
          const ex = rb.left + rb.width / 2 - box.left;
          const ey = rb.top - box.top;
          const dy = (ey - sy) * 0.5;
          paths[e.id] = { d: `M ${sx} ${sy} C ${sx} ${sy + dy}, ${ex} ${ey - dy}, ${ex} ${ey}`, sx, sy, ex, ey };
        }
      }
      setGeo({ w: box.width, h: box.height, paths });
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    root.querySelectorAll<HTMLElement>("[data-flow-id]").forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  }, [edges, isDesktop]);

  const toggleWan = (next: boolean) => {
    setCut(next);
    if (next) {
      toast.warning("WAN cut", { description: "Siren and local SMS still go out." });
    } else {
      toast.success("WAN restored");
    }
  };

  // ⌘K action from the page ("Cut the WAN") dispatches this event.
  const onCommandToggle = React.useEffectEvent(() => toggleWan(!cut));
  React.useEffect(() => {
    const handler = () => onCommandToggle();
    window.addEventListener("ganga:toggle-wan", handler);
    return () => window.removeEventListener("ganga:toggle-wan", handler);
  }, []);

  const open = (id: keyof FlowDetails) => show(details[id]);
  const residentsT = facts.wan.residentsMin !== null ? facts.firstPublic?.t : null;

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
      {/* header */}
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Reading to siren</h3>
          <p className="mt-0.5 text-[13px] text-muted">Select a part for details.</p>
        </div>
        <div className="flex items-center gap-2">
          {!reduce && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? "Play the data-flow animation" : "Pause the data-flow animation"}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60 [&_svg]:size-4"
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
          )}
          <label
            className={cn(
              "flex cursor-pointer select-none items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 text-[13.5px] font-medium transition-colors",
              cut ? "bg-emergency-soft text-emergency" : "bg-surface-2 text-foreground"
            )}
          >
            {cut ? <UnplugIcon className="size-4" aria-hidden /> : <GlobeIcon className="size-4 text-muted" aria-hidden />}
            Cut the WAN
            <Switch tone="danger" checked={cut} onCheckedChange={toggleWan} aria-label="Cut the WAN uplink" />
          </label>
        </div>
      </div>

      {/* diagram */}
      <div className="px-4 py-8 sm:px-7 lg:px-8 lg:py-10">
        <div ref={containerRef} className="relative">
          {geo && (
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-visible"
              width={geo.w}
              height={geo.h}
              viewBox={`0 0 ${geo.w} ${geo.h}`}
              fill="none"
            >
              {edges.map((e) => {
                const p = geo.paths[e.id];
                if (!p) return null;
                const blocked = cut && e.lane === "cloud";
                return (
                  <Beam
                    key={`${e.id}-${isDesktop ? "d" : "m"}`}
                    id={e.id}
                    {...p}
                    lane={e.lane}
                    blocked={blocked}
                    animate={animate && !blocked}
                    delay={e.step * STEP_S}
                  />
                );
              })}
            </svg>
          )}

          <div
            className={cn(
              "relative grid grid-cols-2 gap-x-3 gap-y-8",
              "lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto_minmax(236px,1.5fr)] lg:grid-rows-[auto_auto] lg:items-center lg:gap-x-5 lg:gap-y-5 xl:gap-x-8"
            )}
          >
            <FlowNode flowId="sensors" icon={CpuIcon} title="Sensor nodes" sub={`${facts.scenario.nodesKm.length} on the river · level + vibration`} kind={details.sensors.provenance} onOpen={() => open("sensors")} className="col-span-2 row-start-1 lg:col-span-1 lg:col-start-1 lg:row-span-2 lg:row-start-1" />
            <FlowChip flowId="lora" icon={RadioIcon} label="LoRa" kind={details.lora.provenance} onOpen={() => open("lora")} className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-2 lg:row-span-2 lg:row-start-1" />
            <FlowNode flowId="gateway" icon={RouterIcon} title="LoRa gateway" sub="Raspberry Pi 5 · to MQTT" kind={details.gateway.provenance} onOpen={() => open("gateway")} className="col-span-2 row-start-3 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1" />
            <FlowNode flowId="broker" icon={ServerIcon} title="MQTT broker" sub="Mosquitto · TLS 8883" kind={details.broker.provenance} onOpen={() => open("broker")} className="col-span-2 row-start-4 lg:col-span-1 lg:col-start-4 lg:row-span-2 lg:row-start-1" />
            <FlowNode flowId="fusion" icon={BrainCircuitIcon} title="Fusion engine" sub="Decides on the edge" kind={details.fusion.provenance} emphasis onOpen={() => open("fusion")} className="col-span-2 row-start-5 lg:col-span-1 lg:col-start-5 lg:row-span-2 lg:row-start-1" />

            {/* WAN uplink */}
            <FlowChip
              flowId="wan"
              icon={cut ? UnplugIcon : GlobeIcon}
              label={cut ? "WAN down" : "WAN uplink"}
              blocked={cut}
              onOpen={() => open("wan")}
              className="col-start-2 row-start-6 lg:col-start-6 lg:row-start-2"
            />

            {/* local outputs */}
            <Panel
              flowId="local"
              title="Local path"
              hint="No internet needed"
              tone="local"
              ok={cut}
              className="col-start-1 row-span-2 row-start-6 self-start lg:col-start-7 lg:row-span-1 lg:row-start-1 lg:self-end"
            >
              <OutputRow flowId="siren" icon={SirenIcon} title="Village siren" meta={latency(facts, "siren")} kind={details.siren.provenance} onOpen={() => open("siren")} delivered={cut} />
              <OutputRow flowId="gsm" icon={SmartphoneIcon} title="Local SMS" meta={latency(facts, "sms_gsm")} kind={details.gsm.provenance} onOpen={() => open("gsm")} delivered={cut} />
            </Panel>

            {/* cloud outputs */}
            <Panel
              flowId="cloud"
              title="Cloud path"
              hint={cut ? "Blocked" : "Needs the WAN"}
              tone="cloud"
              blocked={cut}
              className="col-start-2 row-start-7 lg:col-start-7 lg:row-start-2 lg:self-start"
            >
              <OutputRow flowId="sns" icon={MessageSquareTextIcon} title="Cloud SMS" meta={latency(facts, "sms_sns")} kind={details.sns.provenance} onOpen={() => open("sns")} blocked={cut} />
              <OutputRow flowId="email" icon={MailIcon} title="E-mail" meta={latency(facts, "email")} kind={details.email.provenance} onOpen={() => open("email")} blocked={cut} />
              <OutputRow flowId="llm" icon={FileTextIcon} title="LLM report" meta="" kind={details.llm.provenance} onOpen={() => open("llm")} blocked={cut} />
            </Panel>
          </div>
        </div>

        {/* legend */}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted lg:mt-10">
          <span className="inline-flex items-center gap-2">
            <span className="h-[2px] w-5 rounded-full bg-primary" aria-hidden /> Local path
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-[2px] w-5 rounded-full bg-chart-3" aria-hidden /> Cloud path
          </span>
          <span aria-hidden className="hidden h-3 w-px bg-border-strong sm:block" />
          {(Object.keys(KIND) as ProvenanceKind[]).map((k) => {
            const Icon = KIND[k].icon;
            return (
              <span key={k} className="inline-flex items-center gap-1.5">
                <Icon className={cn("size-3.5", KIND[k].className)} aria-hidden /> {KIND[k].label}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3.5 rounded-[4px] border border-dashed border-border-strong" aria-hidden /> Dashed card = not built yet
          </span>
        </div>
      </div>

      {/* outcome */}
      <div
        className={cn(
          "border-t border-border px-5 py-5 transition-colors duration-300 sm:px-7",
          cut ? "bg-surface-2/70" : "bg-surface-2/40"
        )}
        aria-live="polite"
      >
        {cut ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:gap-10">
            <div>
              <p className="text-[20px] font-semibold leading-snug tracking-[-0.02em]">WAN down. Villages still warned.</p>
              <p className="mt-1.5 text-[13px] text-muted">Rasuwa flood replay, WAN down from the start.</p>
            </div>
            <ul className="flex flex-col gap-3 text-[13.5px] leading-relaxed">
              <li className="flex gap-3">
                <span className="mt-0.5 grid grid-cols-1 size-5 shrink-0 place-items-center rounded-full bg-normal-fill text-white dark:text-[#21222c]">
                  <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
                </span>
                <span>
                  <span className="font-medium">Residents downstream are still warned{residentsT ? ` at ${residentsT}` : ""}.</span>{" "}
                  <span className="text-muted">Siren and local GSM need no internet.</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid grid-cols-1 size-5 shrink-0 place-items-center rounded-full bg-surface-3 text-muted">
                  <XIcon className="size-3" strokeWidth={3} aria-hidden />
                </span>
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                  {facts.wan.blocked.map((g) => (
                    <span key={g} className="rounded-full bg-surface px-2.5 py-0.5 text-[12.5px] font-medium hairline">
                      {g}
                    </span>
                  ))}
                  <span className="text-muted">get nothing. Their channels need the cloud.</span>
                </span>
              </li>
              {facts.wan.blockedWithFix.length === 0 && (
                <li className="flex gap-3">
                  <span className="mt-0.5 grid grid-cols-1 size-5 shrink-0 place-items-center rounded-full bg-surface-3 text-foreground">
                    <WrenchIcon className="size-3" aria-hidden />
                  </span>
                  <span>
                    <span className="font-medium">The fix:</span>{" "}
                    <span className="text-muted">local GSM SMS for officials and operators. Nobody is cut off.</span>
                  </span>
                </li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-[14px] leading-relaxed text-muted">
            <span className="font-medium text-foreground">All paths open.</span> The alert decision runs on the edge. Cloud channels are extras.{" "}
            <span className="text-foreground">Try cutting the WAN.</span>
          </p>
        )}
      </div>
    </div>
  );
}

function latency(facts: OverviewFacts, id: string) {
  const c = facts.channels.find((x) => x.id === id);
  return c ? `${c.latencyS} s` : "";
}

function Beam({
  id,
  d,
  sx,
  sy,
  ex,
  ey,
  lane,
  blocked,
  animate,
  delay,
}: {
  id: string;
  d: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  lane: Lane;
  blocked: boolean;
  animate: boolean;
  delay: number;
}) {
  const gid = `beam-${id}`;
  const len = Math.hypot(ex - sx, ey - sy) || 1;
  const ux = (ex - sx) / len;
  const uy = (ey - sy) / len;
  const tail = Math.min(150, Math.max(60, len * 0.7));
  const color = lane === "cloud" ? "var(--chart-3)" : "var(--primary)";
  return (
    <g>
      <path
        d={d}
        style={{ stroke: blocked ? "var(--subtle)" : color, strokeOpacity: blocked ? 0.75 : 0.3, transition: "stroke 300ms" }}
        strokeWidth={blocked ? 1.25 : 1.5}
        strokeDasharray={blocked ? "3 6" : undefined}
        strokeLinecap="round"
      />
      <circle cx={ex} cy={ey} r={2.5} style={{ fill: blocked ? "var(--subtle)" : color, fillOpacity: blocked ? 0.75 : 0.45 }} />
      {animate && (
        <>
          <defs>
            <motion.linearGradient
              id={gid}
              gradientUnits="userSpaceOnUse"
              initial={{ x1: sx - tail * ux, y1: sy - tail * uy, x2: sx, y2: sy }}
              animate={{
                x1: [sx - tail * ux, ex],
                y1: [sy - tail * uy, ey],
                x2: [sx, ex + tail * ux],
                y2: [sy, ey + tail * uy],
              }}
              transition={{ duration: HOP_S, delay, repeat: Infinity, repeatDelay: CYCLE_S - HOP_S, ease: [0.4, 0, 0.6, 1] }}
            >
              <stop offset="0" style={{ stopColor: color, stopOpacity: 0 }} />
              <stop offset="0.7" style={{ stopColor: color, stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
            </motion.linearGradient>
          </defs>
          <path d={d} stroke={`url(#${gid})`} strokeWidth={8} strokeOpacity={0.16} strokeLinecap="round" />
          <path d={d} stroke={`url(#${gid})`} strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function KindMark({ kind, className, light }: { kind: ProvenanceKind; className?: string; light?: boolean }) {
  const k = KIND[kind];
  const Icon = k.icon;
  return (
    <span className={cn("inline-flex", className)}>
      <Icon className={cn("size-3.5", light ? "opacity-80" : k.className)} aria-hidden />
      <span className="sr-only">{k.label}</span>
    </span>
  );
}

function FlowNode({
  flowId,
  icon: Icon,
  title,
  sub,
  kind,
  emphasis,
  onOpen,
  className,
}: {
  flowId: NodeId;
  icon: LucideIcon;
  title: string;
  sub: string;
  kind: ProvenanceKind;
  emphasis?: boolean;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center lg:block", className)}>
      <button
        data-flow-id={flowId}
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className={cn(
          "relative flex w-full max-w-[300px] items-center gap-3 rounded-[16px] border p-3 text-left outline-none transition-[box-shadow,background-color,border-color] duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/60 lg:max-w-none lg:flex-col lg:items-start lg:gap-3 lg:p-3.5",
          emphasis
            ? "border-transparent bg-primary text-primary-foreground shadow-float hover:bg-primary/92"
            : cn(
                "bg-surface shadow-soft hover:bg-surface-2/60 hover:shadow-card",
                kind === "planned" ? "border-dashed border-border-strong" : "border-border"
              )
        )}
      >
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[11px]",
            emphasis ? "bg-white/14 dark:bg-black/10" : "bg-surface-2 text-foreground"
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 pr-5 lg:pr-0">
          <span className="block text-[14px] font-semibold leading-tight tracking-[-0.01em]">{title}</span>
          <span className={cn("mt-1 block text-[12px] leading-snug lg:hidden xl:block", emphasis ? "opacity-75" : "text-muted")}>{sub}</span>
        </span>
        <KindMark kind={kind} light={emphasis} className="absolute right-3 top-3" />
      </button>
    </div>
  );
}

function FlowChip({
  flowId,
  icon: Icon,
  label,
  kind,
  blocked,
  onOpen,
  className,
}: {
  flowId: NodeId;
  icon: LucideIcon;
  label: string;
  kind?: ProvenanceKind;
  blocked?: boolean;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center", className)}>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={`${label} — details`}
        className="group flex flex-col items-center gap-1.5 rounded-[14px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
      >
        <span
          data-flow-id={flowId}
          className={cn(
            "grid size-11 place-items-center rounded-full border bg-surface shadow-soft transition-colors duration-200 group-hover:bg-surface-2",
            blocked ? "border-dashed border-subtle text-subtle" : kind === "planned" ? "border-dashed border-border-strong" : "border-border"
          )}
        >
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
            blocked ? "bg-surface-3 text-foreground" : "text-muted"
          )}
        >
          {blocked && <BanIcon className="mr-1 inline size-3 -translate-y-px" aria-hidden />}
          {label}
        </span>
      </button>
    </div>
  );
}

function Panel({
  flowId,
  title,
  hint,
  tone,
  blocked,
  ok,
  className,
  children,
}: {
  flowId: NodeId;
  title: string;
  hint: string;
  tone: "local" | "cloud";
  blocked?: boolean;
  ok?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-flow-id={flowId}
      className={cn(
        "rounded-[18px] border p-2 transition-[opacity,border-color,background-color] duration-300",
        blocked ? "border-dashed border-border-strong bg-surface-2/40" : "border-border bg-surface-2/70",
        ok && "border-normal-fill/50",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-0.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">
          <span className={cn("h-[2px] w-3 rounded-full", tone === "cloud" ? "bg-chart-3" : "bg-primary", blocked && "bg-subtle")} aria-hidden />
          {title}
        </span>
        <span
          className={cn(
            "hidden whitespace-nowrap text-[11px] sm:inline lg:hidden xl:inline",
            blocked ? "font-medium text-foreground" : ok ? "font-medium text-normal" : "text-subtle"
          )}
        >
          {ok ? "Still delivering" : hint}
        </span>
      </div>
      <div className={cn("flex flex-col gap-1.5", blocked && "opacity-50")}>{children}</div>
    </div>
  );
}

function OutputRow({
  flowId,
  icon: Icon,
  title,
  meta,
  kind,
  onOpen,
  blocked,
  delivered,
}: {
  flowId: NodeId;
  icon: LucideIcon;
  title: string;
  meta: string;
  kind: ProvenanceKind;
  onOpen: () => void;
  blocked?: boolean;
  delivered?: boolean;
}) {
  return (
    <button
      data-flow-id={flowId}
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="flex w-full items-center gap-2 rounded-[12px] bg-surface px-2 py-2 text-left shadow-soft sm:gap-2.5 sm:px-2.5 outline-none transition-colors duration-200 hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      <Icon className="size-4 shrink-0 text-muted" aria-hidden />
      <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium", blocked && "line-through decoration-subtle")}>{title}</span>
      {delivered ? (
        <CheckIcon className="size-3.5 shrink-0 text-normal" strokeWidth={2.5} aria-label="Still delivered" />
      ) : (
        <span className="hidden shrink-0 font-mono text-[10.5px] text-subtle sm:inline lg:hidden xl:inline">{meta}</span>
      )}
      <KindMark kind={kind} className="hidden shrink-0 sm:inline-flex" />
    </button>
  );
}
