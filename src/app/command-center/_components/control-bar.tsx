"use client";

import * as React from "react";
import { PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { scenarioList, type ScenarioId } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SPEEDS, useSim, type Speed } from "./sim-store";
import { cutWan, reset, restoreWan, setEocGsm, setScenario, setSpeed, togglePlay } from "./sim-actions";
import { SimClock } from "./sim-clock";
import { TimelineScrubber } from "./timeline-scrubber";
import { WhatIfControl } from "./what-if";

/* ---------------------------------------------------------------- controls */

export function PlayButton({ className }: { className?: string }) {
  const playing = useSim((s) => s.playing);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          onClick={togglePlay}
          aria-label={playing ? "Pause the replay" : "Play the replay"}
          className={cn("size-12 rounded-full shadow-card [&_svg]:size-5", className)}
        >
          {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="translate-x-[1.5px] fill-current" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {playing ? "Pause" : "Play"} <Kbd className="h-4.5 border-white/25 bg-white/10 text-white dark:border-black/20 dark:bg-black/10 dark:text-[#21222c]">Space</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export function ScenarioSwitch({ className }: { className?: string }) {
  const id = useSim((s) => s.scenarioId);
  return (
    <Segmented<ScenarioId>
      size="sm"
      aria-label="Scenario"
      value={id}
      onValueChange={(v) => setScenario(v)}
      options={scenarioList.map((s) => ({ value: s.id, label: s.shortName }))}
      className={className}
    />
  );
}

export function SpeedSwitch({ className }: { className?: string }) {
  const speed = useSim((s) => s.speed);
  return (
    <Segmented<string>
      size="sm"
      aria-label="Playback speed (simulated seconds per real second)"
      value={String(speed)}
      onValueChange={(v) => setSpeed(Number(v) as Speed)}
      options={SPEEDS.map((v) => ({ value: String(v), label: <span className="tabular">{v}×</span> }))}
      className={className}
    />
  );
}

export function WanSwitch({ className, showKbd = false }: { className?: string; showKbd?: boolean }) {
  const cut = useSim((s) => s.wanDownFromMin !== null);
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Switch id={id} tone="danger" checked={cut} onCheckedChange={(v) => (v ? cutWan() : restoreWan())} />
      <label htmlFor={id} className="cursor-pointer select-none whitespace-nowrap text-[13px] font-medium">
        Cut WAN
      </label>
      {showKbd && <Kbd>W</Kbd>}
    </div>
  );
}

export function SmsSwitch({ className, compact = false }: { className?: string; compact?: boolean }) {
  const on = useSim((s) => s.eocGsm);
  const id = React.useId();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-2.5", className)}>
          <Switch id={id} tone="success" checked={on} onCheckedChange={(v) => setEocGsm(v)} />
          <label htmlFor={id} className="cursor-pointer select-none whitespace-nowrap text-[13px] font-medium">
            {compact ? (
              <>
                <span className="min-[1400px]:hidden">Local SMS for EOC</span>
                <span className="hidden min-[1400px]:inline">Add local SMS to EOC & operators</span>
              </>
            ) : (
              "Add local SMS to EOC & operators"
            )}
          </label>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Local GSM SMS for the district EOC and hydropower and road operators. No WAN needed.
      </TooltipContent>
    </Tooltip>
  );
}

/** Icon-only (the console row is capped at 1440 px and What-if needs the room); the tooltip names it. */
export function ResetButton({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" onClick={() => reset()} aria-label="Reset the replay" className={cn("text-muted hover:text-foreground", className)}>
          <RotateCcwIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Reset the replay</TooltipContent>
    </Tooltip>
  );
}

/* ---------------------------------------------------------------- bar */

/**
 * Sticky console bar under the site header. Desktop: clock on the left, controls and the
 * scrubber on the right. Below lg the secondary controls move to <MobileControls/>.
 */
export function ControlBar() {
  return (
    <div data-cc-bar className="glass sticky top-[60px] z-30 border-b border-border">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 sm:px-6 md:flex-nowrap md:gap-x-4 xl:gap-x-5">
        <PlayButton />
        <SimClock />
        <div className="ml-auto flex items-center gap-1.5 md:order-last md:ml-0 xl:hidden">
          <WhatIfControl placement="compact" />
          <ResetButton />
        </div>
        <div className="hidden h-14 w-px shrink-0 bg-border xl:block" />
        <div className="flex w-full min-w-0 flex-col gap-1.5 md:w-auto md:flex-1">
          <div className="hidden items-center gap-3 xl:flex">
            <ScenarioSwitch />
            <SpeedSwitch />
            <WhatIfControl placement="bar" />
            <div className="ml-auto flex items-center gap-4 min-[1440px]:gap-5">
              <WanSwitch />
              <SmsSwitch compact />
              <ResetButton className="-ml-1" />
            </div>
          </div>
          <TimelineScrubber />
        </div>
      </div>
    </div>
  );
}

/**
 * Secondary controls below xl (not sticky): an iOS grouped list on phones,
 * a single wrapping toolbar on tablets and small laptops.
 */
export function MobileControls({ className }: { className?: string }) {
  const row = "flex flex-col gap-2 border-t border-border px-4 py-3 first:border-t-0 md:flex-row md:items-center md:gap-2.5 md:border-0 md:p-0";
  const label = "text-[12px] font-medium text-muted";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[18px] border border-border bg-surface shadow-soft md:flex md:flex-wrap md:items-center md:gap-x-6 md:gap-y-3 md:px-5 md:py-3 xl:hidden",
        className
      )}
    >
      <div className={row}>
        <span className={label}>Scenario</span>
        <ScenarioSwitch className="w-full md:w-auto" />
      </div>
      <div className={row}>
        <span className={label}>
          Speed<span className="md:hidden"> · simulated seconds per real second</span>
        </span>
        <SpeedSwitch className="w-full md:w-auto" />
      </div>
      <div className={cn(row, "flex-row items-center")}>
        <WanSwitch />
      </div>
      <div className={cn(row, "flex-row items-center")}>
        <SmsSwitch />
      </div>
    </div>
  );
}
