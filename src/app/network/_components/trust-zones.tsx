"use client";

import * as React from "react";
import { motion } from "motion/react";
import { BanIcon, BrickWallShieldIcon, CheckIcon, CloudIcon, LayersIcon, RadioTowerIcon, ServerCogIcon, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Provenance } from "@/components/brand/provenance";
import { cn } from "@/lib/utils";
import { ptDevices, vlanPlan } from "@/content/network";
import { resilience } from "@/content/architecture";
import { usePrefersReducedMotion } from "./network-state";
import { vlanColor } from "./vlan-tone";

type Dest = {
  id: "broker" | "internet" | "vlans";
  title: string;
  detail: string;
  icon: LucideIcon;
  allow: boolean;
  verdict: string;
  tone?: number;
};

const iot = vlanPlan.find((v) => v.zone === "IoT") ?? vlanPlan[2];
const gateway = ptDevices.find((d) => d.vlan === iot.vlan);
const broker = ptDevices.find((d) => d.id === "broker");
const cloud = ptDevices.find((d) => d.kind === "cloud");
const port = iot.allowed.match(/:(\d{2,5})/)?.[1] ?? "8883";
const others = vlanPlan.filter((v) => v.vlan !== iot.vlan && v.vlan !== broker?.vlan);
// "Four VLANs with firewall ACLs; IoT reaches the broker and nothing else." → the second clause
const nothingElse =
  resilience.find((r) => r.name === "Segmented network")?.detail.split(";").pop()?.trim() ?? "IoT reaches the broker and nothing else.";

const DESTS: Dest[] = [
  {
    id: "broker",
    title: broker?.label ?? "MQTT broker",
    detail: `VLAN ${broker?.vlan ?? 20} · MQTT over TLS · TCP ${port}`,
    icon: ServerCogIcon,
    allow: true,
    tone: broker?.vlan,
    verdict: `Permitted. The station receiver publishes readings to the broker over TLS on TCP ${port} — the one flow the IoT VLAN is allowed.`,
  },
  {
    id: "internet",
    title: "Internet",
    detail: `${cloud?.label ?? "AWS / Internet"} · via the WAN`,
    icon: CloudIcon,
    allow: false,
    verdict: "Dropped. The IoT VLAN has no internet access; readings reach the cloud only through the servers VLAN.",
  },
  {
    id: "vlans",
    title: "Other VLANs",
    detail: others.map((v) => `${v.zone} ${v.vlan}`).join(" · "),
    icon: LayersIcon,
    allow: false,
    verdict: `Dropped. ${nothingElse} ${others.map((v) => `${v.zone} (VLAN ${v.vlan})`).join(" and ")} stay out of reach.`,
  },
];

/* Diagram geometry (viewBox units); HTML overlays use the same numbers as percentages. */
const W = 600;
const H = 300;
const SRC = { x: 0, w: 168, cy: H / 2 };
const FW_X = 280;
const DST_X = 346;
const DST_Y = [54, 150, 246];
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Source → firewall curve for lane `y` (same control points as the drawn path). */
function lane(y: number) {
  const p0 = [SRC.x + SRC.w, SRC.cy];
  const p1 = [SRC.w + 70, SRC.cy];
  const p2 = [FW_X - 70, y];
  const p3 = [FW_X, y];
  const d = `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t ** 2, e = t ** 3;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]]);
  }
  return { d, pts };
}

export function TrustZones() {
  const [sel, setSel] = React.useState<Dest["id"]>("broker");
  const reduce = usePrefersReducedMotion();
  const current = DESTS.find((d) => d.id === sel) ?? DESTS[0];
  const iotColor = vlanColor(iot.vlan);

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Trust zones</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            What the IoT VLAN may reach. Pick a destination to test the flow.
          </p>
        </div>
        <Provenance kind="planned" tip="Firewall policy from the field deployment plan." />
      </div>

      {/* Diagram (sm and up) */}
      <div className="relative mt-6 hidden sm:block" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <line x1={FW_X} x2={FW_X} y1={14} y2={H - 6} stroke="var(--border-strong)" strokeWidth={1.5} strokeDasharray="3 5" />
          {DESTS.map((d, i) => {
            const y = DST_Y[i];
            const active = d.id === sel;
            const { d: curve, pts } = lane(y);
            const color = d.allow ? "var(--normal-fill)" : "var(--net-link-strong)";
            // Permitted packets continue to the destination; denied ones stop and fade at the ACL.
            const path = d.allow ? [...pts, [DST_X, y] as [number, number]] : pts;
            return (
              <g key={d.id} opacity={active ? 1 : 0.38} style={{ transition: "opacity .25s ease" }}>
                <path d={curve} fill="none" stroke={color} strokeWidth={active ? 2.25 : 1.5} strokeLinecap="round" />
                <path
                  d={`M ${FW_X} ${y} L ${DST_X} ${y}`}
                  fill="none"
                  stroke={d.allow ? color : "var(--border-strong)"}
                  strokeWidth={d.allow ? (active ? 2.25 : 1.5) : 1.25}
                  strokeDasharray={d.allow ? undefined : "4 5"}
                  strokeLinecap="round"
                />
                {active && !reduce && (
                  <motion.circle
                    key={`pkt-${sel}`}
                    r={4.5}
                    fill={d.allow ? "var(--normal-fill)" : "var(--emergency-fill)"}
                    initial={{ cx: path[0][0], cy: path[0][1], opacity: 0 }}
                    animate={{
                      cx: path.map((p) => p[0]),
                      cy: path.map((p) => p[1]),
                      opacity: path.map((_, k) => (k === 0 || k === path.length - 1 ? 0 : 1)),
                    }}
                    transition={{ duration: d.allow ? 1.1 : 0.85, ease: "linear" }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Firewall label */}
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: pct(FW_X, W), top: pct(4, H) }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted shadow-soft ring-1 ring-border">
            <BrickWallShieldIcon className="size-3.5" aria-hidden />
            ACL
          </span>
        </span>

        {/* Verdict markers on the firewall line */}
        {DESTS.map((d, i) => (
          <span
            key={d.id}
            className={cn(
              "absolute inline-flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ring-4 ring-surface transition-opacity duration-200",
              d.allow ? "bg-normal-fill text-white dark:text-[#21222c]" : "bg-emergency-soft text-emergency",
              d.id !== sel && "opacity-60"
            )}
            style={{ left: pct(FW_X, W), top: pct(DST_Y[i], H) }}
            aria-hidden
          >
            {d.allow ? <CheckIcon className="size-3.5" strokeWidth={3} /> : <BanIcon className="size-3.5" strokeWidth={2.5} />}
          </span>
        ))}

        {/* Source */}
        <div
          className="absolute flex -translate-y-1/2 flex-col rounded-[16px] border p-3.5"
          style={{
            left: pct(SRC.x, W),
            top: pct(SRC.cy, H),
            width: pct(SRC.w, W),
            background: `color-mix(in srgb, ${iotColor.fill} 8%, var(--surface))`,
            borderColor: `color-mix(in srgb, ${iotColor.fill} 30%, transparent)`,
          }}
        >
          <span
            className="inline-flex size-8 items-center justify-center rounded-[10px]"
            style={{ background: `color-mix(in srgb, ${iotColor.fill} 16%, transparent)`, color: iotColor.text }}
          >
            <RadioTowerIcon className="size-4" aria-hidden />
          </span>
          <span className="mt-2.5 text-[13px] font-semibold leading-tight" style={{ color: iotColor.text }}>
            VLAN {iot.vlan} · {iot.zone}
          </span>
          <span className="mt-0.5 text-[12px] leading-snug text-muted">{gateway?.label ?? "Station receiver"}</span>
          <span className="mt-1 font-mono text-[11px] text-subtle">{iot.subnet}</span>
        </div>

        {/* Destinations */}
        {DESTS.map((d, i) => (
          <DestButton
            key={d.id}
            d={d}
            active={d.id === sel}
            onSelect={() => setSel(d.id)}
            style={{ left: pct(DST_X, W), top: pct(DST_Y[i], H), width: pct(W - DST_X, W) }}
            className="absolute -translate-y-1/2"
          />
        ))}
      </div>

      {/* Mobile list */}
      <div className="mt-5 sm:hidden">
        <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold" style={{ color: iotColor.text }}>
          <RadioTowerIcon className="size-4" aria-hidden />
          From VLAN {iot.vlan} · {iot.zone} <span className="font-mono text-[11.5px] font-normal text-muted">{iot.subnet}</span>
        </p>
        <div className="flex flex-col gap-2">
          {DESTS.map((d) => (
            <DestButton key={d.id} d={d} active={d.id === sel} onSelect={() => setSel(d.id)} showVerdictIcon />
          ))}
        </div>
      </div>

      {/* Verdict */}
      <div
        className={cn(
          "mt-5 flex items-start gap-3 rounded-[14px] p-3.5 transition-colors duration-300 sm:mt-6",
          current.allow ? "bg-normal-soft" : "bg-surface-2"
        )}
        aria-live="polite"
      >
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-bold uppercase tracking-[0.08em]",
            current.allow ? "bg-normal-fill text-white dark:text-[#21222c]" : "bg-emergency-soft text-emergency"
          )}
        >
          {current.allow ? <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden /> : <BanIcon className="size-3.5" aria-hidden />}
          {current.allow ? "Permit" : "Deny"}
        </span>
        <p className="text-[13.5px] leading-relaxed text-foreground">
          <span className="font-medium">
            VLAN {iot.vlan} → {current.title}.
          </span>{" "}
          <span className="text-muted">{current.verdict}</span>
        </p>
      </div>
    </Card>
  );
}

function DestButton({
  d,
  active,
  onSelect,
  style,
  className,
  showVerdictIcon,
}: {
  d: Dest;
  active: boolean;
  onSelect: () => void;
  style?: React.CSSProperties;
  className?: string;
  showVerdictIcon?: boolean;
}) {
  const Icon = d.icon;
  const tone = d.tone ? vlanColor(d.tone) : null;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-[14px] border bg-surface p-2.5 text-left outline-none transition-[border-color,box-shadow,background-color] duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/60",
        active ? "border-border-strong shadow-[0_6px_18px_-10px_rgb(12_13_40/0.35)] dark:shadow-[0_8px_20px_-10px_rgb(0_0_0/0.7)]" : "border-border hover:border-border-strong hover:bg-surface-2/60",
        className
      )}
    >
      <span
        className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]", !tone && "bg-surface-2 text-muted")}
        style={tone ? { background: `color-mix(in srgb, ${tone.fill} 14%, transparent)`, color: tone.text } : undefined}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight">{d.title}</span>
        <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{d.detail}</span>
      </span>
      {showVerdictIcon && (
        <span
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
            d.allow ? "bg-normal-soft text-normal" : "bg-emergency-soft text-emergency"
          )}
          aria-hidden
        >
          {d.allow ? <CheckIcon className="size-3.5" strokeWidth={3} /> : <BanIcon className="size-3.5" />}
        </span>
      )}
      <span className="sr-only">{d.allow ? "(permitted)" : "(denied)"}</span>
    </button>
  );
}
