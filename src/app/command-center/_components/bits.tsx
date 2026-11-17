"use client";

import * as React from "react";
import {
  ActivityIcon,
  BellRingIcon,
  CheckCheckIcon,
  CircleIcon,
  GaugeIcon,
  HouseIcon,
  InfoIcon,
  ServerCrashIcon,
  TrendingUpIcon,
  WavesIcon,
  WifiOffIcon,
  type LucideIcon,
} from "lucide-react";
import { RULE_TEXT, type EvidenceKind, type NodeStatus, type VillageStatus } from "@/lib/engine";
import { STATE_META } from "@/lib/alert-state";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Page-scoped colours that the global tokens do not cover (river, flood, terrain, terminal).
 * Applied to the page root and to every portalled sheet, because portals leave the page root.
 */
export const CC_VARS = cn(
  "[--river:#8db3dc] dark:[--river:#6c7bb0]",
  "[--river-soft:#e6eff9] dark:[--river-soft:#2e3347]",
  "[--flood:#8b5a2b] dark:[--flood:#c4925f]",
  "[--flood-hi:#e39b45] dark:[--flood-hi:#f3c38e]",
  "[--flood-soft:#f7eee4] dark:[--flood-soft:rgb(196_146_95/0.16)]",
  "[--flood-ink:#7a4a1e] dark:[--flood-ink:#e9b98a]",
  "[--sky:#eef3fa] dark:[--sky:#2c2f3e]",
  "[--ridge:rgb(12_13_40/0.1)] dark:[--ridge:rgb(248_248_242/0.09)]",
  "[--mtn-1:#e8eef7] dark:[--mtn-1:#303344]",
  "[--mtn-2:#dee6f1] dark:[--mtn-2:#35384b]",
  "[--mtn-3:#d3dceb] dark:[--mtn-3:#3b3f53]",
  "[--snow:#ffffff] dark:[--snow:#7d84a8]",
  "[--term-bg:#0c0d28] dark:[--term-bg:#191a21]"
);

/** Card header used by every panel: 17px title, short muted description, actions on the right. */
export function PanelHeader({
  title,
  description,
  right,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/** Small uppercase caption (not an eyebrow — eyebrows are brand red and used once per page). */
export function Caption({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle", className)} {...props} />;
}

const RULE_EXTRA: Record<string, string> = {
  ETA: "ETA · Arrival times from measured wave speed",
  HB: "HB · Heartbeat check · a quiet RTU missed reports",
};

export function ruleText(rule: string): string {
  return (RULE_TEXT as Record<string, string>)[rule] ?? RULE_EXTRA[rule] ?? rule;
}

/** Rule code chip (R1…R7, ETA, HB) with the rule in a tooltip. */
export function RuleChip({ rule, className }: { rule: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex h-5 shrink-0 cursor-help items-center rounded-[6px] bg-surface-2 px-1.5 font-mono text-[10.5px] font-semibold text-muted hairline",
            className
          )}
        >
          {rule}
        </span>
      </TooltipTrigger>
      <TooltipContent>{ruleText(rule)}</TooltipContent>
    </Tooltip>
  );
}

export const KIND_ICON: Record<EvidenceKind, LucideIcon> = {
  vibration: ActivityIcon,
  rise: TrendingUpIcon,
  silence: WifiOffIcon,
  corroboration: CheckCheckIcon,
  state: InfoIcon,
  speed: GaugeIcon,
  gateway: ServerCrashIcon,
  info: InfoIcon,
};

/* ---------------------------------------------------------------- status chips */

const VILLAGE_STATUS: Record<VillageStatus, { label: string; icon: LucideIcon; className: string }> = {
  normal: { label: "Not warned", icon: HouseIcon, className: "bg-surface-2 text-muted" },
  warned: { label: "Warned", icon: BellRingIcon, className: "bg-watch-soft text-watch" },
  flooded: { label: "Flooded", icon: WavesIcon, className: "bg-[var(--flood-soft)] text-[var(--flood-ink)]" },
};

export function VillageStatusChip({ status, className }: { status: VillageStatus; className?: string }) {
  const m = VILLAGE_STATUS[status];
  const Icon = m.icon;
  return (
    <Badge size="md" className={cn(m.className, className)}>
      <Icon aria-hidden />
      {m.label}
    </Badge>
  );
}

const NODE_STATUS: Record<NodeStatus, { label: string; className: string; dot: string }> = {
  alive: { label: "Reporting", className: "bg-normal-soft text-normal", dot: "bg-normal-fill" },
  anomaly: { label: "Anomaly", className: "bg-warning-soft text-warning", dot: "bg-warning-fill" },
  "destroyed-unseen": { label: "Report overdue", className: "bg-warning-soft text-warning", dot: "bg-warning-fill" },
  silent: { label: "Silent = evidence", className: "bg-emergency-soft text-emergency", dot: "bg-emergency-fill" },
};

export function NodeStatusChip({ status, className }: { status: NodeStatus; className?: string }) {
  const m = NODE_STATUS[status];
  return (
    <Badge size="md" className={cn(m.className, className)}>
      {status === "silent" ? <WifiOffIcon aria-hidden /> : <CircleIcon aria-hidden className="fill-current !size-2" />}
      {m.label}
    </Badge>
  );
}

export const nodeStatusLabel = (s: NodeStatus) => NODE_STATUS[s].label;
export const villageStatusLabel = (s: VillageStatus) => VILLAGE_STATUS[s].label;
export { STATE_META };

/** Clock time with the T+ offset underneath or beside it. */
export function TimeStamp({
  clock,
  tplus,
  inline = false,
  className,
}: {
  clock: string;
  tplus: string;
  inline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular", inline ? "inline-flex items-baseline gap-1.5" : "flex flex-col", className)}>
      <span className="font-medium text-foreground">{clock}</span>
      <span className="font-mono text-[11px] text-subtle">{tplus}</span>
    </span>
  );
}

/** Key/value row for sheets (grouped-list style). */
export function DetailRow({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5 text-[14px]", className)}>
      <span className="text-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function DetailList({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("divide-y divide-border rounded-[16px] bg-surface-2/60 px-4 hairline", className)} {...props} />;
}
