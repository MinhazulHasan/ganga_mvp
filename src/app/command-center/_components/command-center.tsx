"use client";

import * as React from "react";
import { BookOpenIcon } from "lucide-react";
import { SimulationPill } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ModKKbd } from "@/components/ui/mod-k-kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRun } from "./sim-store";
import { select } from "./sim-actions";
import { useCommandActions, useKeyboardShortcuts, usePlaybackLoop, useUrlParams } from "./use-sim-runtime";
import { CC_VARS } from "./bits";
import { ControlBar, MobileControls } from "./control-bar";
import { StatusHero } from "./status-hero";
import { RiverCorridor } from "./river-corridor";
import { EvidenceFeed } from "./evidence-feed";
import { VillagesPanel } from "./villages-panel";
import { NetworkMini } from "./network-mini";
import { DeliveryTimeline } from "./delivery-timeline";
import { AlertOutput, type CapBundle } from "./alert-output";
import { AtlasPanel } from "./atlas-panel";
import { DetailSheet } from "./detail-sheet";
import { WhatIfBadge } from "./what-if";
import { BroadcastEditor, CustomBroadcastBadge } from "./broadcast-editor";

export function CommandCenter({ caps, atlas = false }: { caps: CapBundle; atlas?: boolean }) {
  usePlaybackLoop();
  useKeyboardShortcuts();
  useCommandActions();
  useUrlParams();

  return (
    <div className={cn(CC_VARS, "pb-16 sm:pb-24")}>
      <TitleRow />
      <ControlBar />
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 sm:px-6 sm:pt-6">
        <MobileControls className="mb-5" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <StatusHero className="lg:col-span-12 xl:col-span-4" />
          <RiverCorridor className="lg:col-span-12 xl:col-span-8" />
          <EvidenceFeed className="lg:col-span-6 xl:col-span-4" />
          <VillagesPanel className="lg:col-span-6 xl:col-span-5" />
          <NetworkMini className="lg:col-span-12 xl:col-span-3" />
          {atlas && <AtlasPanel className="lg:col-span-12" />}
          <DeliveryTimeline className="lg:col-span-12" />
          <AlertOutput caps={caps} className="lg:col-span-12" />
        </div>
      </div>
      <DetailSheet />
      <BroadcastEditor />
    </div>
  );
}

function TitleRow() {
  const run = useRun();
  const s = run.scenario;
  return (
    <div className="relative border-b border-border">
      <div className="dot-grid pointer-events-none absolute inset-0 mask-fade-b opacity-60" aria-hidden />
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-5 pt-6 sm:px-6 sm:pt-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[36px]">Command Center</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[14px] text-muted">
            <span className="font-medium text-foreground">{s.name}</span>
            <SimulationPill />
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" size="md" className="cursor-help">
                  {s.kind === "reconstructed" ? "Reconstructed" : "Illustrative"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {s.kind === "reconstructed"
                  ? "Flood timing from published reports. Sensor readings simulated."
                  : "Made-up valley. Shows GANGA on another river."}
              </TooltipContent>
            </Tooltip>
            <WhatIfBadge />
            <CustomBroadcastBadge />
          </div>
        </div>
        {/* holds its line; the scenario badges on the left wrap instead */}
        <div className="flex flex-wrap items-center gap-3 md:shrink-0 md:flex-nowrap">
          <div className="hidden items-center gap-3 text-[12px] text-subtle xl:flex" aria-label="Keyboard shortcuts">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Space</Kbd> play
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd> 10 s
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>W</Kbd> WAN
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ModKKbd /> actions
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => select({ kind: "assumptions" })}>
            <BookOpenIcon /> Assumptions
          </Button>
        </div>
      </div>
    </div>
  );
}
