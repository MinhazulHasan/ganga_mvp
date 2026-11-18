"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon, CloudIcon, CloudOffIcon } from "lucide-react";
import { Provenance } from "@/components/brand/provenance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uplinks } from "@/content/network";
import { useNetworkState } from "../network-state";
import type { WanOutcome } from "../wan-outcome";

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export function WanCallout({ outcome, className }: { outcome: WanOutcome; className?: string }) {
  const { down, route, offline: wanDown } = useNetworkState();
  const onSat = route === "r2";
  const headline = wanDown
    ? "Both uplinks are down"
    : onSat
      ? "Cellular down · satellite took over"
      : down.r2
        ? "Satellite down · cellular carries all"
        : "If both uplinks go down";

  return (
    <div className={cn("flex flex-col rounded-[18px] bg-surface-2 p-5 hairline", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">Alert delivery</p>
          <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
            <span
              className={cn("size-2 rounded-full transition-colors duration-300", wanDown ? "bg-emergency-fill" : onSat || down.r2 ? "bg-watch" : "bg-normal-fill")}
              aria-hidden
            />
            {headline}
          </p>
        </div>
        <Provenance
          kind="simulated"
          tip={`From the GANGA broadcast model, replayed on ${outcome.scenario} with both uplinks down from the start.`}
        />
      </div>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-normal">
            <CircleCheckIcon className="size-4" aria-hidden />
            Still works from the edge
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {outcome.local.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span>{c.name}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-muted tabular">≈{c.latencyS} s</span>
              </li>
            ))}
          </ul>
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {outcome.reached.map((g) => (
              <li key={g.name} className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
                <span>{g.name}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-foreground tabular">{g.first}</span>
              </li>
            ))}
          </ul>
          {outcome.sameAsUp && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">Residents are warned as early as with the internet up.</p>
          )}
        </div>

        <div>
          <p className={cn("flex items-center gap-1.5 text-[13px] font-semibold transition-colors", wanDown ? "text-emergency" : onSat ? "text-watch" : "text-muted")}>
            {wanDown ? <CloudOffIcon className="size-4" aria-hidden /> : <CloudIcon className="size-4" aria-hidden />}
            Needs an uplink
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {outcome.cloud.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("transition-colors duration-300", wanDown && "text-muted line-through decoration-emergency/60")}>{c.name}</span>
                <span className={cn("shrink-0 font-mono text-[11.5px] tabular", wanDown ? "text-emergency" : onSat ? "text-watch" : "text-muted")}>
                  {wanDown ? "blocked" : onSat ? "via satellite" : `≈${c.latencyS} s`}
                </span>
              </li>
            ))}
          </ul>
          {outcome.cutOff.length > 0 && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              {onSat
                ? `Delivered over ${uplinks.r2.router} for now. If satellite fails too, ${joinNames(outcome.cutOff)} ${outcome.cutOff.length > 1 ? "get" : "gets"} nothing until an uplink is back.`
                : `${joinNames(outcome.cutOff)} ${outcome.cutOff.length > 1 ? "get" : "gets"} nothing until an uplink is back.`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <p className="text-[12px] text-subtle">Times are after the trigger in the {outcome.scenario} replay.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/command-center">
            See it on the delivery timeline
            <ArrowRightIcon />
          </Link>
        </Button>
      </div>
    </div>
  );
}
