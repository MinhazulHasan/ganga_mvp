import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GANGA mark: Himalayan peaks above a river wave, on the brand tile
 * (glacier above, the valley's river below: what GANGA watches).
 * Same artwork as src/app/icon.svg, favicon.ico and apple-icon.png. Original design for Team PASS.
 */
export function GangaMark({ className, title = "GANGA" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={title} className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8.5" className="fill-brand" />
      <path d="M4.6 21.4 12.6 9.2a.9.9 0 0 1 1.5 0l3.3 5.1 2.1-3a.9.9 0 0 1 1.5 0l6.4 10.1z" fill="white" />
      <path d="M12.6 9.2a.9.9 0 0 1 1.5 0l3.3 5.1-1.9 2.8-2.15-2.1-2.15 2.1z" className="fill-brand" fillOpacity={0.16} />
      <path
        d="M5.4 25.2c1.77-1.25 3.53-1.25 5.3 0s3.53 1.25 5.3 0 3.53-1.25 5.3 0 3.53 1.25 5.3 0"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GangaWordmark({ className, subtitle = true }: { className?: string; subtitle?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <GangaMark className="size-[30px]" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[0.12em]">GANGA</span>
        {subtitle && <span className="mt-1 text-[10.5px] font-medium tracking-wide text-subtle">Team PASS · APIE Camp #11</span>}
      </span>
    </span>
  );
}
