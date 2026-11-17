"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {
  /** "default" = navy/purple when on, "danger" = red when on, "success" = green when on */
  tone?: "default" | "danger" | "success";
}

function Switch({ className, tone = "default", ...props }: SwitchProps) {
  const on =
    tone === "danger"
      ? "data-[state=checked]:bg-emergency-fill"
      : tone === "success"
        ? "data-[state=checked]:bg-normal-fill"
        : "data-[state=checked]:bg-primary";
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer items-center rounded-full bg-surface-3 p-[2px] outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50",
        on,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-[22px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-transform duration-200 ease-[cubic-bezier(0.3,1.4,0.6,1)] data-[state=checked]:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
