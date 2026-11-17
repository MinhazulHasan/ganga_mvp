"use client";

import * as React from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getStraightPath, type EdgeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useNetworkState } from "../network-state";
import { vlanColor } from "../vlan-tone";
import { G, type LinkFlowEdge } from "./layout";

export function LinkEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<LinkFlowEdge>) {
  const { wanDown } = useNetworkState();
  if (!data) return null;
  const down = data.wan && wanDown;
  const chain = data.kind === "chain";

  let path: string;
  let lx: number;
  let ly: number;
  if (chain) {
    [path, lx, ly] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  } else {
    [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 14 });
    // Label sits on the vertical drop, between the shared bus and the top of the VLAN zone.
    const busY = (sourceY + targetY) / 2;
    lx = targetX;
    ly = (busY + targetY - G.zonePad) / 2;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: down ? "var(--emergency)" : chain ? "var(--net-link-strong)" : "var(--net-link)",
          strokeWidth: chain ? 2 : 1.5,
          strokeDasharray: down ? "7 6" : undefined,
          strokeLinecap: "round",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute flex flex-col items-center gap-1"
          style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
          data-wan-label={data.wan ? "" : undefined}
        >
          {chain ? (
            <span
              className={cn(
                "inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2.5 font-mono text-[11px] font-medium shadow-[0_1px_2px_rgb(12_13_40/0.06)] transition-colors duration-300",
                down
                  ? "border-emergency/30 bg-[color-mix(in_srgb,var(--emergency)_12%,var(--surface))] text-emergency"
                  : "border-border-strong bg-surface text-foreground"
              )}
            >
              {data.label}
            </span>
          ) : (
            <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-2 font-mono text-[10.5px] text-muted">
              {data.vlan && <span className="size-1.5 rounded-full" style={{ background: vlanColor(data.vlan).fill }} aria-hidden />}
              {data.label}
            </span>
          )}
          {down && (
            <span className="absolute top-full mt-1 whitespace-nowrap rounded-full bg-surface px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.06em] text-emergency ring-1 ring-emergency/35">
              admin down
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
