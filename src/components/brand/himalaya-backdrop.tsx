import { cn } from "@/lib/utils";
import { HIMALAYA_RANGES, HIMALAYA_SNOW, HIMALAYA_VIEWBOX } from "./himalaya-paths";

const LAYERS = [
  ["far", 0.045],
  ["mid", 0.06],
  ["near", 0.075],
  ["front", 0.095],
] as const;

/**
 * Abstract Himalaya range, anchored to the bottom of its box. Decorative only.
 * Light theme: navy at low opacity with white snow caps. Dark theme: a soft lavender, dimmed.
 */
export function HimalayaBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox={HIMALAYA_VIEWBOX}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none text-foreground dark:text-[#a9aedb] dark:opacity-75", className)}
    >
      {LAYERS.map(([layer, opacity]) => (
        <g key={layer}>
          <path d={HIMALAYA_RANGES[layer]} fill="currentColor" fillOpacity={opacity} />
          {layer === "far" &&
            HIMALAYA_SNOW.map((d) => (
              <path key={d} d={d} className="fill-background [fill-opacity:0.9] dark:fill-current dark:[fill-opacity:0.07]" />
            ))}
        </g>
      ))}
    </svg>
  );
}

/**
 * The same window-fixed Himalaya, for a muted (grey) section. The section clips it to its own box and paints it
 * above its grey background, so the mountains stay visible there instead of being washed out by the grey.
 * Geometry matches the global backdrop in the root layout, so the two line up exactly.
 */
export function SectionHimalaya() {
  return (
    <div aria-hidden="true" className="himalaya-section pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh print:hidden">
      <HimalayaBackdrop className="absolute inset-x-0 bottom-0 h-[55%] w-full sm:h-[70%] lg:h-full" />
    </div>
  );
}
