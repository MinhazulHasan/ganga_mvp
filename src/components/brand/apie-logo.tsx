import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official APIE logo (from the team deck, transparent padding trimmed so `height` is the artwork's height).
 * Colour in light mode, white in dark mode. Source is 211×68 px: keep height ≤ 36 for a sharp 2× render.
 */
export function ApieLogo({ className, height = 22 }: { className?: string; height?: number }) {
  const width = Math.round((height * 211) / 68);
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width, height }}>
      <Image src="/brand/apie-logo-color.png" alt="APIE — Asia Pacific Internet Engineering" width={width} height={height} unoptimized className="logo-on-light dark:hidden" />
      <Image src="/brand/apie-logo-white.png" alt="APIE — Asia Pacific Internet Engineering" width={width} height={height} unoptimized className="logo-on-dark hidden dark:block" />
    </span>
  );
}

/** SOI Asia logo (white artwork) on the SOI red tile, as on soi.asia. */
export function SoiLogoTile({ className, size = 56 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[14px] bg-[#c9252c]", className)}
      style={{ width: size, height: size }}
    >
      <Image src="/brand/soi-logo-white.png" alt="SOI Asia — School on Internet" width={size * 0.72} height={size * 0.72} />
    </span>
  );
}
