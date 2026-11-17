"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const THUMB = 26;

/**
 * iOS-style slider: thin track, primary fill, large white thumb. An optional tick under the
 * track marks the default value so it is easy to find again.
 */
export function IosSlider({
  value,
  min,
  max,
  step,
  mark,
  label,
  valueText,
  onValueChange,
  onValueCommit,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  /** default value, shown as a tick under the track */
  mark?: number;
  label: string;
  valueText: string;
  onValueChange: (v: number) => void;
  onValueCommit: (v: number) => void;
  className?: string;
}) {
  // Radix keeps the thumb inside the track: its centre runs from THUMB/2 to (100% − THUMB/2).
  const pct = mark === undefined ? null : ((mark - min) / (max - min)) * 100;
  const markLeft = pct === null ? null : `calc(${pct}% + ${((THUMB / 2) * (1 - pct / 50)).toFixed(2)}px)`;
  return (
    <SliderPrimitive.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onValueChange(v[0])}
      onValueCommit={(v) => onValueCommit(v[0])}
      className={cn("relative flex h-8 w-full touch-none select-none items-center", className)}
    >
      <SliderPrimitive.Track className="relative h-[5px] grow overflow-hidden rounded-full bg-surface-3">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      {markLeft && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-[calc(50%+7px)] h-[5px] w-[2px] -translate-x-1/2 rounded-full bg-[var(--subtle)] opacity-70"
          style={{ left: markLeft }}
        />
      )}
      <SliderPrimitive.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-[26px] cursor-grab rounded-full border border-black/[0.06] bg-white shadow-[0_3px_8px_rgb(0_0_0/0.16),0_1px_1px_rgb(0_0_0/0.1)] outline-none transition-[transform,box-shadow] duration-150 hover:scale-[1.04] focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-[1.08] active:cursor-grabbing dark:border-transparent dark:shadow-[0_3px_10px_rgb(0_0_0/0.5)]"
      />
    </SliderPrimitive.Root>
  );
}
