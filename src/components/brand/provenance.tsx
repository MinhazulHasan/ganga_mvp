"use client";

import * as React from "react";
import { BadgeCheckIcon, FlaskConicalIcon, CircleDashedIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ProvenanceKind = "built" | "simulated" | "planned";

const META: Record<ProvenanceKind, { label: string; icon: React.ElementType; tip: string }> = {
  built: {
    label: "Built",
    icon: BadgeCheckIcon,
    tip: "Exists and runs today — either built at APIE Camp #11 or running in this website.",
  },
  simulated: {
    label: "Simulated",
    icon: FlaskConicalIcon,
    tip: "Real code, simulated input. The flood, sensors or radio links are modelled, not measured.",
  },
  planned: {
    label: "Planned",
    icon: CircleDashedIcon,
    tip: "Part of the design, not built yet. Shown so the full system is clear.",
  },
};

/** Honesty label used everywhere a component, number or feature is shown. */
export function Provenance({ kind, label, size = "sm", tip }: { kind: ProvenanceKind; label?: string; size?: "sm" | "md"; tip?: string }) {
  const m = META[kind];
  const Icon = m.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={kind} size={size} className="cursor-help">
          <Icon aria-hidden />
          {label ?? m.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tip ?? m.tip}</TooltipContent>
    </Tooltip>
  );
}

/** Permanent "Simulation" chip for anything driven by the scenario model. */
export function SimulationPill({ className }: { className?: string }) {
  return (
    <Badge variant="simulated" size="md" className={className}>
      <span className="relative flex size-1.5">
        <span className="absolute inset-0 rounded-full bg-simulated animate-pulse-ring" />
        <span className="relative size-1.5 rounded-full bg-simulated" />
      </span>
      Simulation
    </Badge>
  );
}
