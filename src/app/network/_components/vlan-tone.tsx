import * as React from "react";
import { cn } from "@/lib/utils";

/** CSS colour references for a VLAN (see network-css.ts). */
export function vlanColor(vlan: number) {
  return { fill: `var(--net-vlan-${vlan})`, text: `var(--net-vlan-${vlan}-text)` };
}

/** Soft tinted background + border for a VLAN surface. */
export function vlanSurface(vlan: number, strength: "soft" | "medium" = "soft"): React.CSSProperties {
  const c = vlanColor(vlan).fill;
  return strength === "soft"
    ? { background: `color-mix(in srgb, ${c} 7%, transparent)`, borderColor: `color-mix(in srgb, ${c} 26%, transparent)` }
    : { background: `color-mix(in srgb, ${c} 13%, transparent)`, borderColor: `color-mix(in srgb, ${c} 34%, transparent)` };
}

/** "VLAN 20" chip in the VLAN's colour. Icon-free, the number carries the meaning. */
export function VlanChip({ vlan, size = "md", className }: { vlan: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const c = vlanColor(vlan);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-mono font-medium tabular",
        size === "sm" && "h-5 px-2 text-[10.5px]",
        size === "md" && "h-6 px-2.5 text-[11.5px]",
        size === "lg" && "h-8 px-3 text-[13px]",
        className
      )}
      style={{ ...vlanSurface(vlan, "medium"), color: c.text }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c.fill }} aria-hidden />
      VLAN {vlan}
    </span>
  );
}

export function VlanDot({ vlan, className }: { vlan: number; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ background: vlanColor(vlan).fill }} aria-hidden />;
}
