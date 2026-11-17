import Image from "next/image";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { universities } from "@/content/team";
import { ApieLogo } from "./apie-logo";

/** SOI Asia animated mark (from soi.asia), played once; a still frame for reduced motion. */
export function SoiAnimatedMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden bg-[#c9252c] shadow-soft", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.27) }}
    >
      <video
        className="size-full object-cover motion-reduce:hidden"
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/brand/soi-mark.png"
        aria-label="SOI Asia logo animation"
      >
        <source src="/brand/soi-animation.webm" type="video/webm" />
        <source src="/brand/soi-animation.mp4" type="video/mp4" />
      </video>
      <Image src="/brand/soi-mark.png" alt="SOI Asia" width={size} height={size} className="hidden size-full motion-reduce:block" />
    </span>
  );
}

/** SOI Asia lockup: the animated mark with the SOI wordmark beside it (red in light mode, white in dark). */
export function SoiLockup({ size = 52, className }: { size?: number; className?: string }) {
  const h = Math.round(size * 0.72);
  const w = Math.round((h * 300) / 197);
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: Math.round(size * 0.22) }}>
      <SoiAnimatedMark size={size} />
      <span className="relative inline-flex shrink-0" style={{ width: w, height: h }}>
        <Image src="/brand/soi-wordmark-red.png" alt="SOI" width={w} height={h} unoptimized className="logo-on-light dark:hidden" />
        <Image src="/brand/soi-wordmark-white.png" alt="SOI" width={w} height={h} unoptimized className="logo-on-dark hidden dark:block" />
      </span>
    </span>
  );
}

const supporters = [
  { key: "soi", href: "https://www.soi.asia/", name: "SOI Asia", sub: "School on Internet Asia" },
  { key: "apie", href: "https://apie.soi.asia/", name: "APIE Program", sub: "Asia Pacific Internet Engineering" },
] as const;

/**
 * "Supported by SOI Asia · APIE" — one plaque, two halves, so the supporters read as one unit
 * and the layout never wraps awkwardly. size "lg" for the Overview hero, "md" for the footer.
 */
export function SupportersLockup({ size = "lg", className }: { size?: "lg" | "md"; className?: string }) {
  const lg = size === "lg";
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">Supported by</p>
      <ul
        className={cn(
          "supporters-plaque grid grid-cols-2 divide-x divide-border overflow-hidden border border-border bg-surface/85 shadow-soft backdrop-blur-sm",
          lg ? "max-w-[560px] rounded-[22px]" : "max-w-[440px] rounded-[18px]",
        )}
      >
        {supporters.map((s) => (
          <li key={s.key} className="min-w-0">
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group relative flex h-full flex-col outline-none transition-colors duration-200 hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/60",
                lg ? "gap-4 p-5" : "gap-3 p-4",
              )}
            >
              <span className={cn("flex items-center", lg ? "h-14" : "h-11")}>
                {s.key === "soi" ? <SoiLockup size={lg ? 52 : 40} /> : <ApieLogo height={lg ? 34 : 26} />}
              </span>
              <span className="flex flex-col gap-0.5 leading-tight">
                <span className={cn("font-semibold tracking-[-0.01em]", lg ? "text-[16px]" : "text-[14px]")}>{s.name}</span>
                <span className={cn("text-muted", lg ? "text-[13px]" : "text-[12px]")}>{s.sub}</span>
              </span>
              <ArrowUpRightIcon
                aria-hidden
                className={cn(
                  "absolute text-subtle opacity-50 transition-[opacity,color,transform] duration-200 group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-foreground group-hover:opacity-100 motion-reduce:transform-none",
                  lg ? "right-4 top-4 size-4" : "right-3 top-3 size-3.5",
                )}
              />
              <span className="sr-only">(opens {s.href.replace("https://", "").replace(/\/$/, "")} in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Team PASS universities, large logos with names. */
export function UniversityRow({ size = "lg", className, label = "Built by students from" }: { size?: "lg" | "md"; className?: string; label?: string }) {
  const lg = size === "lg";
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">{label}</p>}
      <ul className={cn("flex flex-wrap items-center", lg ? "gap-x-7 gap-y-4" : "gap-x-5 gap-y-3")}>
        {universities.map((u) => (
          <li key={u.short} className="inline-flex items-center gap-2.5" title={`${u.name} · ${u.country}`}>
            <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5", lg ? "size-14" : "size-11")}>
              <Image src={u.logo} alt={u.name} width={lg ? 48 : 38} height={lg ? 48 : 38} className="size-full object-contain" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className={cn("font-semibold", lg ? "text-[15px]" : "text-[13.5px]")}>{u.short}</span>
              <span className={cn("text-muted", lg ? "text-[12.5px]" : "text-[11.5px]")}>{u.country}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
