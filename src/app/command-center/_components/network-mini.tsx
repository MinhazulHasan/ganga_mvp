"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, CloudIcon, MonitorIcon, NetworkIcon, RadioTowerIcon, RouterIcon, ServerIcon, type LucideIcon } from "lucide-react";
import { iosLog, ptDevices } from "@/content/network";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRun, useSim, type WanEvent } from "./sim-store";
import { select } from "./sim-actions";
import { clock, tplus } from "./format";
import { PanelHeader } from "./bits";
import { useElementWidth } from "./use-element-width";
import { useCloudView, type CloudPhase } from "./cloud-view";

const H = 252;

type ChipSpec = { id: string; label: string; sub: string; icon: LucideIcon; x: number; y: number; w: number; h: number };

const device = (id: string) => ptDevices.find((d) => d.id === id);

export function NetworkMini({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  const [measureRef, width] = useElementWidth<HTMLDivElement>(300);
  const W = Math.max(width, 260);
  const wanDown = useSim((st) => st.wanDownFromMin !== null && st.t >= st.wanDownFromMin);
  const log = useSim((st) => st.wanLog);
  // The cloud dashboard's view of the site (Andrrew's rule: > 15 s without data = STALE).
  const cloud = useCloudView();
  const cloudSub =
    cloud.phase === "live" ? "cloud link up" : cloud.phase === "gap" ? `no data · ${cloud.gapS} s` : `STALE · ${clock(s, cloud.staleAt ?? 0)}`;

  const cx = W / 2;
  const leafW = Math.min(104, (W - 28 - 16) / 3);
  const leafXs = [14 + leafW / 2, cx, W - 14 - leafW / 2];
  const chips: ChipSpec[] = [
    { id: "aws", label: device("aws")?.label ?? "AWS / Internet", sub: cloudSub, icon: CloudIcon, x: cx, y: 22, w: 140, h: 32 },
    { id: "r1", label: device("r1")?.label ?? "GANGA-R1", sub: device("r1")?.model ?? "", icon: RouterIcon, x: cx, y: 102, w: 136, h: 34 },
    { id: "sw", label: device("sw")?.label ?? "GANGA_SW", sub: "Layer-3 switch", icon: NetworkIcon, x: cx, y: 160, w: 136, h: 34 },
    { id: "broker", label: "Broker/engine", sub: "VLAN 20", icon: ServerIcon, x: leafXs[0], y: 224, w: leafW, h: 38 },
    { id: "gw", label: "Receiver", sub: "VLAN 30", icon: RadioTowerIcon, x: leafXs[1], y: 224, w: leafW, h: 38 },
    { id: "op", label: "Operators", sub: "VLAN 50", icon: MonitorIcon, x: leafXs[2], y: 224, w: leafW, h: 38 },
  ];
  const byId = Object.fromEntries(chips.map((c) => [c.id, c]));
  const awsB = byId.aws.y + byId.aws.h / 2;
  const r1T = byId.r1.y - byId.r1.h / 2;
  const wanMidY = (awsB + r1T) / 2;

  return (
    <Card className={cn("flex flex-col overflow-hidden xl:h-[620px]", className)}>
      <PanelHeader title="Edge network" description="Packet Tracer model. Click a device." />
      <div className="@container flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
        <div className="flex min-h-0 flex-1 flex-col gap-3 @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div ref={measureRef} className="min-w-0">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" role="group" aria-label="Edge network diagram">
              {/* edge site boundary */}
              <rect x={4} y={78} width={W - 8} height={H - 82} rx={16} fill="none" style={{ stroke: "var(--border-strong)" }} strokeDasharray="4 4" />
              <text x={14} y={94} className="fill-subtle text-[10px] font-semibold uppercase tracking-[0.1em]">
                Edge site
              </text>
              <text x={W - 14} y={94} textAnchor="end" className="fill-normal text-[10px] font-medium">
                works offline
              </text>

              {/* WAN link */}
              <line
                x1={cx}
                x2={cx}
                y1={awsB}
                y2={r1T}
                style={{ stroke: wanDown ? "var(--emergency)" : "var(--border-strong)" }}
                strokeWidth={wanDown ? 2 : 1.5}
                strokeDasharray={wanDown ? "4 4" : undefined}
              />
              {wanDown ? (
                <g>
                  <circle cx={cx} cy={wanMidY} r={8} style={{ fill: "var(--emergency-soft)", stroke: "var(--emergency)" }} strokeWidth={1.4} />
                  <path
                    d={`M${cx - 3} ${wanMidY - 3} L${cx + 3} ${wanMidY + 3} M${cx + 3} ${wanMidY - 3} L${cx - 3} ${wanMidY + 3}`}
                    style={{ stroke: "var(--emergency)" }}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                  <text x={cx + 14} y={wanMidY + 3.5} className="fill-emergency text-[10px] font-semibold">
                    Gi0/1 down
                  </text>
                </g>
              ) : (
                <text x={cx + 8} y={wanMidY + 3.5} className="fill-subtle font-mono text-[9.5px]">
                  Gi0/1 · WAN
                </text>
              )}

              {/* R1 — switch */}
              <line x1={cx} x2={cx} y1={byId.r1.y + byId.r1.h / 2} y2={byId.sw.y - byId.sw.h / 2} style={{ stroke: "var(--border-strong)" }} strokeWidth={1.5} />
              <text x={cx + 8} y={(byId.r1.y + byId.sw.y) / 2 + 3.5} className="fill-subtle font-mono text-[9.5px]">
                Gi0/0 · OSPF
              </text>
              {wanDown && (
                <g>
                  <rect x={cx - 52} y={(byId.r1.y + byId.sw.y) / 2 - 7} width={38} height={14} rx={7} style={{ fill: "var(--normal-soft)" }} />
                  <text x={cx - 33} y={(byId.r1.y + byId.sw.y) / 2 + 3} textAnchor="middle" className="fill-normal text-[9px] font-semibold">
                    FULL
                  </text>
                </g>
              )}

              {/* switch — VLAN leaves */}
              {["broker", "gw", "op"].map((id) => {
                const c = byId[id];
                const top = byId.sw.y + byId.sw.h / 2;
                const midY = top + 12;
                return (
                  <path
                    key={id}
                    d={`M${cx} ${top} V${midY} H${c.x} V${c.y - c.h / 2}`}
                    fill="none"
                    style={{ stroke: "var(--border-strong)" }}
                    strokeWidth={1.3}
                    strokeLinejoin="round"
                  />
                );
              })}

              {chips.map((c) => (
                <DeviceChip key={c.id} c={c} cloud={c.id === "aws" ? cloud.phase : undefined} />
              ))}
            </svg>
          </div>
          <Terminal log={log} wanDown={wanDown} scenarioClock={(m) => clock(s, m)} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-[11.5px] text-subtle">
        <span>Real IOS messages</span>
        <Link
          href="/network"
          className="-mr-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-medium text-foreground outline-none transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/60"
        >
          Full network <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

const CLOUD_SUB: Record<CloudPhase, string> = {
  live: "fill-normal",
  gap: "fill-subtle",
  stale: "fill-emergency font-semibold",
};

function DeviceChip({ c, cloud }: { c: ChipSpec; cloud?: CloudPhase }) {
  const Icon = c.icon;
  const open = () => select({ kind: "device", id: c.id });
  const x = c.x - c.w / 2;
  const y = c.y - c.h / 2;
  const two = c.h >= 38;
  const stale = cloud === "stale";
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${c.label}${cloud ? ` — cloud view ${c.sub}` : ""} — open details`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="group cursor-pointer outline-none"
    >
      <rect
        x={x}
        y={y}
        width={c.w}
        height={c.h}
        rx={10}
        className={cn(
          "transition-colors",
          stale ? "fill-emergency-soft stroke-emergency/60" : "fill-surface stroke-border-strong group-hover:fill-surface-2"
        )}
        strokeWidth={1}
      />
      <rect x={x - 3} y={y - 3} width={c.w + 6} height={c.h + 6} rx={12} fill="none" className="stroke-ring opacity-0 group-focus-visible:opacity-100" strokeWidth={2.5} />
      {two ? (
        <>
          <Icon x={c.x - 6} y={y + 5} width={12} height={12} className="text-muted" strokeWidth={2} />
          <text x={c.x} y={y + 27} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
            {c.label}
          </text>
          <text x={c.x} y={y + 37} textAnchor="middle" className="fill-subtle font-mono text-[8.5px]">
            {c.sub}
          </text>
        </>
      ) : (
        <>
          <Icon x={x + 10} y={c.y - 7} width={14} height={14} className={stale ? "text-emergency" : "text-muted"} strokeWidth={2} />
          <text x={x + 30} y={c.y - 1} className={cn("text-[11px] font-semibold", cloud === "gap" ? "fill-muted" : "fill-foreground")}>
            {c.label}
          </text>
          <text x={x + 30} y={c.y + 10} className={cn("font-mono text-[9px]", cloud ? CLOUD_SUB[cloud] : "fill-subtle")}>
            {c.sub}
          </text>
        </>
      )}
    </g>
  );
}

function Terminal({ log, wanDown, scenarioClock }: { log: WanEvent[]; wanDown: boolean; scenarioClock: (m: number) => string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pinned = React.useRef(true);

  // Stay pinned to the newest line (like a real console) unless the user scrolls up.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stick = () => {
      if (pinned.current) el.scrollTop = el.scrollHeight;
    };
    const onScroll = () => {
      pinned.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    };
    const ro = new ResizeObserver(stick);
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    pinned.current = true;
    el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div className="flex min-h-[176px] min-w-0 flex-col overflow-hidden rounded-[14px] bg-[var(--term-bg)] font-mono text-[10.5px] leading-[1.55] text-[#e6e6ef] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2 text-[10px] text-[#8b8fb8]">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/15" />
          </span>
          GANGA-R1 · console
        </span>
        <span className={wanDown ? "text-[#ff6e6e]" : "text-[#50fa7b]"}>{wanDown ? "Gi0/1 down" : "Gi0/1 up"}</span>
      </div>
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5" aria-live="polite">
        {log.length === 0 ? (
          <p className="text-[#8b8fb8]">
            <span className="text-[#50fa7b]">GANGA-R1#</span> Router up, WAN on Gi0/1. Cut the WAN (switch or <span className="text-[#f8f8f2]">W</span>) to see the
            interface go down.
          </p>
        ) : (
          log.map((ev) => (
            <div key={ev.id} className="mb-2 last:mb-0">
              <p className="text-[#6f76a8]">
                ── {scenarioClock(ev.at)} · {tplus(ev.at)} · operator {ev.kind === "cut" ? "cuts" : "restores"} the WAN
              </p>
              {(ev.kind === "cut" ? iosLog.cut : iosLog.restore).map((line) => (
                <p key={line} className={cn("break-words", line.startsWith("%") ? (ev.kind === "cut" ? "text-[#ffb86c]" : "text-[#50fa7b]") : "text-[#f8f8f2]")}>
                  {line}
                </p>
              ))}
              {ev.kind === "cut" && <p className="text-[#8be9fd]">{iosLog.ospfNote}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
