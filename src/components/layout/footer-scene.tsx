"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SCENE } from "./footer-scene-paths";

type Box = readonly [number, number, number, number];

/** Places a layer over the landscape in scene units (the landscape is drawn with cover / bottom-centre scaling). */
function at([x, y, w, h]: Box): React.CSSProperties {
  return { "--bx": x, "--by": y, "--bw": w, "--bh": h } as React.CSSProperties;
}

const R = 210; // sun bloom radius, scene units
const SUN_BOX: Box = [SCENE.sun.x - R, SCENE.sun.y - R, R * 2, R * 2];

/**
 * Footer background: an original flat illustration of the Himalaya at sunset (dusk in the dark theme), with forests,
 * the river winding out of the valley, and a few birds. Its sky starts at the page colour, so it melts into the page. The scene is a static SVG per theme; only small layers move
 * (the sun breathes, birds glide and flap, light sparkles on the river), using transform and opacity.
 * Paused while off screen; static when the visitor prefers reduced motion.
 */
export function FooterScene({ className }: { className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.max(width / SCENE.W, height / SCENE.H);
      el.style.setProperty("--fs-s", s.toFixed(5));
      el.style.setProperty("--fs-x0", ((width - SCENE.W * s) / 2).toFixed(2));
      el.style.setProperty("--fs-y0", (height - SCENE.H * s).toFixed(2));
      el.setAttribute("data-ready", "");
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => el.toggleAttribute("data-paused", !entry.isIntersecting), {
      rootMargin: "120px 0px",
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" data-paused="" className={cn("fs-scene", className)}>
      <Image src="/brand/footer-land-light.svg" alt="" fill unoptimized sizes="100vw" className="fs-land dark:hidden" />
      <Image src="/brand/footer-land-dark.svg" alt="" fill unoptimized sizes="100vw" className="fs-land hidden dark:block" />
      <div className="fs-at fs-bloom" style={at(SUN_BOX)} />
      <svg
        className="fs-at fs-sparkles"
        style={at(SCENE.sparkles.box)}
        viewBox={SCENE.sparkles.box.join(" ")}
        preserveAspectRatio="none"
        focusable="false"
      >
        {SCENE.sparkles.p.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </svg>
      <svg
        className="fs-at fs-birds"
        style={at(SCENE.birds.box)}
        viewBox={SCENE.birds.box.join(" ")}
        preserveAspectRatio="none"
        focusable="false"
      >
        {SCENE.birds.d.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </div>
  );
}
