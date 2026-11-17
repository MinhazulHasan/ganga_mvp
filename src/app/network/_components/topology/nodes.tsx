"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowLeftRightIcon, ChevronRightIcon, CloudOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { vlanPlan } from "@/content/network";
import { useNetworkState } from "../network-state";
import { addressMode, DEVICE_ICON, deviceIconKey } from "../device-meta";
import { sviFor } from "../net-utils";
import { vlanColor } from "../vlan-tone";
import { G, type DeviceFlowNode, type ZoneFlowNode } from "./layout";

type TopologyActions = { openDevice: (id: string) => void; openVlan: (vlan: number) => void };
export const TopologyActionsContext = React.createContext<TopologyActions>({ openDevice: () => {}, openVlan: () => {} });
const useActions = () => React.useContext(TopologyActionsContext);

// React Flow gives non-selectable, non-draggable nodes `pointer-events: none`; the buttons opt back in.
const cardBase =
  "group/card pointer-events-auto relative flex flex-col rounded-[18px] border border-border bg-surface text-left outline-none " +
  "shadow-[0_1px_2px_rgb(12_13_40/0.05),0_10px_24px_-14px_rgb(12_13_40/0.22)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_12px_28px_-14px_rgb(0_0_0/0.6)] " +
  "transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong " +
  "hover:shadow-[0_2px_4px_rgb(12_13_40/0.05),0_16px_32px_-14px_rgb(12_13_40/0.28)] focus-visible:ring-[3px] focus-visible:ring-ring/60 active:translate-y-0";

/* ------------------------------------------------------------------ */

export function DeviceNode({ data }: NodeProps<DeviceFlowNode>) {
  return data.variant === "chain" ? <ChainCard data={data} /> : <HostCard data={data} />;
}

function ChainCard({ data }: { data: DeviceFlowNode["data"] }) {
  const { device: d, width, downlinkX } = data;
  const { wanDown } = useNetworkState();
  const { openDevice } = useActions();
  const unreachable = d.kind === "cloud" && wanDown;
  const Icon = DEVICE_ICON[deviceIconKey(d, { unreachable })];
  const ports = d.kind === "router" ? routerPorts(d.addressing) : [];

  return (
    <>
      {d.kind !== "cloud" && <Handle type="target" id="l" position={Position.Left} style={{ top: G.chainHandleY }} isConnectable={false} />}
      {d.kind !== "switch" && <Handle type="source" id="r" position={Position.Right} style={{ top: G.chainHandleY }} isConnectable={false} />}
      {d.kind === "switch" && <Handle type="source" id="b" position={Position.Bottom} style={{ left: downlinkX }} isConnectable={false} />}

      <button
        type="button"
        onClick={() => openDevice(d.id)}
        aria-label={`${d.label}, ${d.model}. ${d.role}.${unreachable ? " Unreachable while Gi0/1 is down." : ""} Open details.`}
        className={cn(cardBase, unreachable && "border-dashed border-border-strong shadow-none hover:shadow-none")}
        style={{ width }}
      >
        {unreachable && (
          <span className="absolute -top-2.5 right-3 z-10 inline-flex h-5 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--emergency)_12%,var(--surface))] px-2 text-[10.5px] font-semibold text-emergency ring-1 ring-emergency/25">
            <CloudOffIcon className="size-3" aria-hidden />
            Unreachable
          </span>
        )}
        <span className={cn("flex flex-col transition-[opacity,filter] duration-300", unreachable && "opacity-45 grayscale")}>
          <span className="flex items-center gap-3 px-3.5 pt-3.5">
            <span
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-[11px]",
                d.kind === "cloud" ? "bg-watch-soft text-watch" : "bg-primary/[0.07] text-primary dark:bg-primary/15"
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold leading-tight tracking-[-0.015em]">{d.label}</span>
              <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">{d.model}</span>
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-subtle opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-visible/card:opacity-100" aria-hidden />
          </span>
          <span className="block px-3.5 pt-2.5 text-[11.5px] leading-snug text-muted">{d.role}</span>

          {d.kind === "cloud" && <span className="block px-3.5 pb-3.5 pt-2 font-mono text-[11px] text-subtle">{d.addressing}</span>}

          {d.kind === "router" && (
            <span className="flex flex-wrap gap-1.5 px-3.5 pt-3">
              {ports.map((p) => {
                const down = p.wan && wanDown;
                return (
                  <span
                    key={p.name}
                    className={cn(
                      "inline-flex h-6 items-center gap-1.5 rounded-[8px] px-2 font-mono text-[10.5px] transition-colors duration-300",
                      down ? "bg-emergency-soft text-emergency" : "bg-surface-2 text-foreground"
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", down ? "bg-emergency-fill" : "bg-normal-fill")} aria-hidden />
                    {p.name}
                    <span className={down ? "text-emergency" : "text-muted"}>{down ? "down" : "up"}</span>
                  </span>
                );
              })}
            </span>
          )}

          {d.kind === "switch" && (
            <span className="grid grid-cols-2 gap-1.5 px-3.5 pt-3">
              {vlanPlan.map((v) => {
                const ip = sviFor(v.vlan);
                if (!ip) return null;
                return (
                  <span
                    key={v.vlan}
                    className="inline-flex h-6 items-center gap-1.5 rounded-[8px] px-2 font-mono text-[10.5px] tabular text-foreground"
                    style={{ background: `color-mix(in srgb, ${vlanColor(v.vlan).fill} 11%, transparent)` }}
                    title={`SVI for VLAN ${v.vlan} · ${v.zone}`}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: vlanColor(v.vlan).fill }} aria-hidden />
                    {ip}
                  </span>
                );
              })}
            </span>
          )}

          {d.standIn ? (
            <span className="mt-3 flex items-start gap-1.5 border-t border-dashed border-border-strong px-3.5 py-2.5 text-[11px] leading-snug text-subtle">
              <ArrowLeftRightIcon className="mt-px size-3 shrink-0" aria-hidden />
              <span className="text-balance">
                Stand-in for <span className="text-muted">{keepModelTogether(d.standIn)}</span>
              </span>
            </span>
          ) : (
            d.kind !== "cloud" && <span className="pb-3.5" />
          )}
        </span>
      </button>
    </>
  );
}

/** "Catalyst 9200L in the field design" → no line break inside "Catalyst 9200L". */
function keepModelTogether(text: string) {
  return text.replace(/^(\S+) (\S+)/, "$1\u00a0$2");
}

/** "Gi0/0 → switch (OSPF neighbour 2.2.2.2) · Gi0/1 → WAN" → [{ name: "Gi0/0", wan: false }, { name: "Gi0/1", wan: true }] */
function routerPorts(addressing: string) {
  return addressing.split("·").map((seg) => {
    const [name, peer = ""] = seg.trim().split("→").map((s) => s.trim());
    return { name, wan: /\bWAN\b/.test(peer) };
  });
}

function HostCard({ data }: { data: DeviceFlowNode["data"] }) {
  const { device: d, width } = data;
  const { openDevice } = useActions();
  const Icon = DEVICE_ICON[deviceIconKey(d)];
  const tone = d.vlan ? vlanColor(d.vlan) : null;
  const mode = addressMode(d);

  return (
    <>
      <Handle type="target" id="t" position={Position.Top} isConnectable={false} />
      <button
        type="button"
        onClick={() => openDevice(d.id)}
        aria-label={`${d.label}, ${d.model}, VLAN ${d.vlan}. ${d.role}. Open details.`}
        className={cn(cardBase, "rounded-[16px] p-3")}
        style={{ width, height: G.hostH }}
      >
        <span className="flex items-start justify-between gap-2">
          <span
            className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[9px]"
            style={tone ? { background: `color-mix(in srgb, ${tone.fill} 13%, transparent)`, color: tone.text } : undefined}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          {mode.toConfirm ? (
            <span className="inline-flex h-[18px] shrink-0 items-center rounded-full border border-dashed border-border-strong bg-planned-soft px-1.5 text-[10px] font-medium text-planned">
              IP to confirm
            </span>
          ) : mode.mode ? (
            <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-surface-2 px-1.5 font-mono text-[10px] text-muted">{mode.mode}</span>
          ) : null}
        </span>
        <span className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-[1.25] tracking-[-0.01em]">{d.label}</span>
        <span className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-muted">{d.role}</span>
        <span className="mt-auto truncate pt-1 font-mono text-[10.5px] text-subtle">{d.model}</span>
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function ZoneNode({ data }: NodeProps<ZoneFlowNode>) {
  const { openVlan } = useActions();
  const c = vlanColor(data.vlan);
  return (
    <button
      type="button"
      onClick={() => openVlan(data.vlan)}
      aria-label={`VLAN ${data.vlan} · ${data.zone} · ${data.subnet}. Open VLAN details.`}
      className="group/zone pointer-events-auto relative block rounded-[22px] border text-left outline-none transition-[background-color] duration-200 [background:color-mix(in_srgb,var(--zc)_6%,transparent)] hover:[background:color-mix(in_srgb,var(--zc)_10%,transparent)] focus-visible:ring-[3px] focus-visible:ring-ring/60"
      style={
        {
          width: data.width,
          height: data.height,
          "--zc": c.fill,
          borderColor: `color-mix(in srgb, ${c.fill} 28%, transparent)`,
        } as React.CSSProperties
      }
    >
      <span className="absolute inset-x-3.5 bottom-2.5 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-semibold leading-tight tracking-[-0.005em]" style={{ color: c.text }}>
            VLAN {data.vlan} · {data.zone}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] leading-tight text-muted">{data.subnet}</span>
        </span>
        <ChevronRightIcon
          className="mb-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover/zone:opacity-100 group-focus-visible/zone:opacity-100"
          style={{ color: c.text }}
          aria-hidden
        />
      </span>
    </button>
  );
}
