"use client";

import * as React from "react";

/**
 * Measure an element's content box. Returns a callback ref and the size.
 * SVGs on this page lay out in real pixels from this value, so text stays crisp.
 */
export function useElementSize<T extends HTMLElement>(initial: { width: number; height: number }) {
  const [el, setEl] = React.useState<T | null>(null);
  const [size, setSize] = React.useState(initial);

  React.useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      const width = Math.round(r.width);
      const height = Math.round(r.height);
      if (width > 0) setSize((s) => (s.width === width && s.height === height ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return [setEl, size] as const;
}

/** Width-only convenience wrapper. */
export function useElementWidth<T extends HTMLElement>(initial: number) {
  const [ref, size] = useElementSize<T>({ width: initial, height: 0 });
  return [ref, size.width] as const;
}
