"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** Opacity when page content sits over the mountains. */
const DIM = 0.65;
/** The mountains are drawn in roughly the lower half of the window. */
const BAND_START = 0.5;

/**
 * Keeps its children (the Himalaya) fixed to the window, behind every page. The page scrolls over it.
 * Full strength only where a page marks a clear area with data-backdrop="clear" (the Overview hero);
 * as content scrolls over the mountains they fade to DIM so text stays easy to read.
 */
export function FixedBackdrop({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const top = vh * BAND_START;
      let clear = 0;
      for (const n of document.querySelectorAll<HTMLElement>('[data-backdrop="clear"]')) {
        const r = n.getBoundingClientRect();
        const covered = Math.min(r.bottom, vh) - Math.max(r.top, top);
        if (covered > 0) clear = Math.max(clear, covered / (vh - top));
      }
      el.style.opacity = (DIM + (1 - DIM) * Math.min(1, clear)).toFixed(3);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    // the new page may still be settling (scroll reset, images); check again on the next frames
    const settle = window.setTimeout(update, 120);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="himalaya-fixed pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh transition-opacity duration-150 ease-linear motion-reduce:transition-none print:hidden"
    >
      {children}
    </div>
  );
}
