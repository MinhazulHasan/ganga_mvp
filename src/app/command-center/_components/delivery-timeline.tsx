"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CircleCheckIcon,
  CloudIcon,
  InfoIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  UnplugIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { deliveryStatusAt, type Delivery, type DeliveryStatus, type RunResult } from "@/lib/engine";
import { StatePill } from "@/components/brand/state-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { runWithoutFix, useRun, useSim } from "./sim-store";
import { openBroadcast, select, setEocGsm } from "./sim-actions";
import { niceStepSeconds } from "./derive";
import { clock, tplus } from "./format";
import { Caption, PanelHeader } from "./bits";
import { useElementWidth } from "./use-element-width";
import { CustomBroadcastBadge } from "./broadcast-editor";
import { FIX_GROUPS, isTeamBroadcast } from "./broadcast-model";

const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, color-mix(in srgb, var(--emergency) 50%, transparent) 0 1.5px, transparent 1.5px 5px)",
};

export function DeliveryTimeline({ className }: { className?: string }) {
  const run = useRun();
  const s = run.scenario;
  const [measureRef, width] = useElementWidth<HTMLDivElement>(1200);
  // Track = content width minus the label column (236 px from sm up); keep ≥ 64 px between axis labels.
  const trackW = width - (width >= 560 ? 236 : 118);
  const maxTicks = Math.max(3, Math.min(8, Math.floor(trackW / 64)));

  const domain = React.useMemo(() => {
    if (!run.deliveries.length) return null;
    const lo = Math.min(...run.deliveries.map((d) => d.sendMin));
    const hi = Math.max(...run.deliveries.map((d) => d.deliverMin));
    const stepS = niceStepSeconds(hi - lo, maxTicks);
    const step = stepS / 60;
    const d0 = Math.floor(lo / step) * step;
    const d1 = Math.ceil(hi / step) * step;
    const ticks: number[] = [];
    for (let v = d0; v <= d1 + 1e-9; v += step) ticks.push(v);
    return { d0, d1, ticks };
  }, [run, maxTicks]);

  // Only re-render while the playhead is inside the plotted window.
  const tq = useSim((st) => (domain ? Math.min(domain.d1 + 1e-3, Math.max(domain.d0 - 1e-3, st.t)) : 0));

  const rows = React.useMemo(
    () =>
      run.groups.map((g) => ({
        group: g,
        deliveries: g.channels
          .map((cid) => run.deliveries.find((d) => d.group === g.id && d.channel === cid))
          .filter((d): d is Delivery => !!d),
      })),
    [run]
  );

  const custom = useSim((st) => !isTeamBroadcast(st.broadcast));

  return (
    <Card className={cn("overflow-hidden", className)}>
      <PanelHeader
        title="Message delivery"
        description="Every message, send to arrival."
        right={
          <>
            <CustomBroadcastBadge />
            <Button variant="outline" size="sm" onClick={openBroadcast}>
              <MegaphoneIcon /> Broadcast settings
            </Button>
          </>
        }
      />
      <FindingsCallout run={run} />
      {!domain ? (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <p className="text-[13px] text-muted">No messages in this run. No group has an enabled channel and a trigger the engine reaches.</p>
          <Button variant="outline" size="sm" onClick={openBroadcast}>
            <MegaphoneIcon /> Broadcast settings
          </Button>
        </div>
      ) : (
        <div ref={measureRef} className="relative px-5 pb-5 pt-4 [--lw:118px] sm:[--lw:236px]">
          <GanttLegend />
          {/* axis */}
          <div className="relative ml-[var(--lw)] h-6 border-b border-border">
            {domain.ticks.map((tk, i) => (
              <span
                key={tk}
                className={cn(
                  "absolute bottom-1.5 font-mono text-[10.5px] text-subtle tabular",
                  i === 0 ? "" : i === domain.ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                )}
                style={{ left: `${((tk - domain.d0) / (domain.d1 - domain.d0)) * 100}%` }}
              >
                {tplus(tk)}
              </span>
            ))}
          </div>

          <div className="relative">
            {/* gridlines */}
            <div className="pointer-events-none absolute inset-y-0 left-[var(--lw)] right-0" aria-hidden>
              {domain.ticks.slice(1, -1).map((tk) => (
                <span key={tk} className="absolute inset-y-0 w-px bg-border/70" style={{ left: `${((tk - domain.d0) / (domain.d1 - domain.d0)) * 100}%` }} />
              ))}
            </div>

            {rows.map(({ group, deliveries }) => (
              <div key={group.id} className="relative">
                <GroupHeader run={run} groupId={group.id} received={group.firstDeliveryMin !== null && tq >= group.firstDeliveryMin} />
                {deliveries.map((d) => {
                  const status = deliveryStatusAt(d, tq);
                  return (
                    <DeliveryRow
                      key={d.id}
                      run={run}
                      d={d}
                      status={status}
                      progress={status === "sending" ? progressAt(d, tq) : 0}
                      d0={domain.d0}
                      d1={domain.d1}
                    />
                  );
                })}
              </div>
            ))}

            {/* playhead (group headers sit above it, so it never strikes through text) */}
            {tq >= domain.d0 && tq <= domain.d1 && (
              <div
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-foreground/75"
                style={{ left: `calc(var(--lw) + (100% - var(--lw)) * ${(tq - domain.d0) / (domain.d1 - domain.d0)})` }}
                aria-hidden
              >
                <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-foreground" />
              </div>
            )}
          </div>
          <p className="mt-4 text-[11.5px] text-subtle">
            {custom ? "Latencies from your broadcast settings" : "Latencies from the team simulator"} (
            {run.channels
              .filter((c) => c.enabled)
              .map((c) => `${c.short} ${c.latencyS} s`)
              .join(" · ")}
            ). Times in {s.region} local time.
          </p>
        </div>
      )}
    </Card>
  );
}

function GanttLegend() {
  const item = "inline-flex items-center gap-1.5";
  return (
    <div className="mb-3 flex flex-wrap items-center justify-end gap-x-3.5 gap-y-1.5 text-[12px] text-muted">
      <span className={item}>
        <span className="h-2 w-3.5 rounded-[3px] bg-normal-fill" aria-hidden />
        Delivered
      </span>
      <span className={item}>
        <span className="h-2 w-3.5 rounded-[3px] bg-primary" aria-hidden />
        Sending
      </span>
      <span className={item}>
        <span className="h-2 w-3.5 rounded-[3px] border border-border-strong" aria-hidden />
        Waiting
      </span>
      <span className={item}>
        <span className="h-2 w-3.5 rounded-[3px] border border-emergency/40" style={HATCH} aria-hidden />
        Blocked
      </span>
    </div>
  );
}

const GroupHeader = React.memo(function GroupHeader({ run, groupId, received }: { run: RunResult; groupId: string; received: boolean }) {
  const s = run.scenario;
  const g = run.groups.find((x) => x.id === groupId)!;
  const trigger = run.deliveries.find((d) => d.group === g.id)?.trigger;
  return (
    <div className="relative z-20 flex flex-wrap items-center gap-x-2.5 gap-y-1 pb-1 pt-3.5 [&>*]:bg-surface">
      <span className="pr-1 text-[13.5px] font-semibold tracking-[-0.01em]">{g.name}</span>
      {trigger && (
        <span className="inline-flex items-center gap-1 pr-1 text-[11.5px] text-subtle">
          on <StatePill state={trigger} size="sm" className="h-5 px-2 text-[10px]" />
        </span>
      )}
      <span className="ml-auto pl-1.5 text-[12px] tabular">
        {g.blockedAll ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emergency">
            <UnplugIcon className="size-3.5" aria-hidden />
            nothing received
          </span>
        ) : g.firstDeliveryMin !== null ? (
          <span className={cn("inline-flex items-center gap-1.5", received ? "text-foreground" : "text-subtle")}>
            {received && <CircleCheckIcon className="size-3.5 text-normal" aria-hidden />}
            first message {clock(s, g.firstDeliveryMin)}
            <span className="text-subtle">· {tplus(g.firstDeliveryMin)}</span>
          </span>
        ) : (
          <span className="text-subtle">not triggered in this run</span>
        )}
      </span>
    </div>
  );
});

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  waiting: "waiting",
  sending: "sending",
  delivered: "delivered",
  blocked: "blocked",
};

/** Progress of a delivery in flight, in 2 % steps (so rows re-render only when the bar visibly grows). */
function progressAt(d: Delivery, t: number): number {
  return Math.round(Math.min(1, Math.max(0, (t - d.sendMin) / Math.max(1e-6, d.deliverMin - d.sendMin))) * 50) / 50;
}

const DeliveryRow = React.memo(function DeliveryRow({
  run,
  d,
  status,
  progress,
  d0,
  d1,
}: {
  run: RunResult;
  d: Delivery;
  status: DeliveryStatus;
  progress: number;
  d0: number;
  d1: number;
}) {
  const s = run.scenario;
  const ch = run.channels.find((c) => c.id === d.channel);
  const span = d1 - d0;
  const left = ((d.sendMin - d0) / span) * 100;
  const width = ((d.deliverMin - d.sendMin) / span) * 100;
  const rightLabelLeft = Math.min(100, left + width);

  return (
    <button
      type="button"
      onClick={() => select({ kind: "delivery", id: d.id })}
      aria-label={`${d.channelName} to ${d.groupName}: ${STATUS_LABEL[status]}. Open details.`}
      className="group flex h-8 w-full items-center rounded-[8px] text-left outline-none transition-colors hover:bg-surface-2/70 focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      <span className="flex w-[var(--lw)] shrink-0 items-center gap-1.5 pl-2 pr-3 text-[12.5px]">
        <span className="truncate font-medium">{ch?.short ?? d.channelName}</span>
        <span className="hidden text-[11.5px] text-subtle tabular sm:inline">{ch?.latencyS} s</span>
        {ch?.needsWan && (
          <span className="inline-flex items-center gap-0.5 text-[10.5px] text-subtle" title="Needs the WAN uplink">
            <CloudIcon className="size-3" aria-hidden />
            <span className="hidden sm:inline">WAN</span>
          </span>
        )}
      </span>
      <span className="relative h-full flex-1">
        <span
          className={cn(
            "absolute top-1/2 h-[10px] min-w-[5px] -translate-y-1/2 overflow-hidden rounded-[4px] transition-colors duration-300",
            status === "waiting" && "border border-border-strong bg-surface",
            status === "sending" && "bg-primary/20",
            status === "delivered" && "bg-normal-fill",
            status === "blocked" && "border border-emergency/40"
          )}
          style={{ left: `${left}%`, width: `${width}%`, ...(status === "blocked" ? HATCH : {}) }}
        >
          {status === "sending" && <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress * 100}%` }} />}
        </span>
        <span
          className={cn(
            "absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap pl-2 text-[11px] tabular sm:block",
            status === "blocked" ? "font-medium text-muted" : "text-subtle",
            rightLabelLeft > 72 && "-translate-x-full pr-2 pl-0"
          )}
          style={{ left: rightLabelLeft > 72 ? `${left}%` : `${rightLabelLeft}%` }}
        >
          {status === "blocked"
            ? "Needs WAN — blocked"
            : status === "delivered"
              ? `arrived ${clock(s, d.deliverMin)}`
              : status === "sending"
                ? "sending…"
                : `sends ${clock(s, d.sendMin)}`}
        </span>
      </span>
    </button>
  );
});

/* ---------------------------------------------------------------- findings */

function findingIcon(f: string): { icon: LucideIcon; tone: string } {
  if (/receives nothing|nothing gets through/i.test(f)) return { icon: UnplugIcon, tone: "text-emergency" };
  if (/still warned/i.test(f)) return { icon: ShieldCheckIcon, tone: "text-normal" };
  if (/first public warning/i.test(f)) return { icon: ZapIcon, tone: "text-watch" };
  return { icon: InfoIcon, tone: "text-muted" };
}

const FindingsCallout = React.memo(function FindingsCallout({ run }: { run: RunResult }) {
  const reduce = useReducedMotion();
  const wanAt = run.options.wanDownFromMin;
  const blockedAll = run.groups.filter((g) => g.blockedAll);
  // The fix switch only adds local SMS to the EOC and the operators; other groups are fixed in the broadcast settings.
  const isFixGroup = (id: string) => FIX_GROUPS.includes(id) && !run.options.eocGsm && run.channels.some((c) => c.id === "sms_gsm" && c.enabled);
  const blocked = blockedAll.filter((g) => isFixGroup(g.id));
  const others = blockedAll.filter((g) => !isFixGroup(g.id));
  const unfixed = runWithoutFix(run);
  const fixGroupsBlocked = (r: RunResult) => r.groups.some((g) => FIX_GROUPS.includes(g.id) && g.blockedAll);
  const fixedNow = run.options.eocGsm && wanAt !== null && fixGroupsBlocked(unfixed) && !fixGroupsBlocked(run);
  const nothingBlocked = wanAt !== null && !run.deliveries.some((d) => d.blocked);
  const lower = (name: string) => `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

  return (
    <div className="mx-5 mt-4 rounded-[16px] bg-surface-2 p-4 hairline">
      <Caption>Engine findings</Caption>
      <ul className="mt-2.5 flex flex-col gap-2">
        {run.findings.map((f) => {
          const { icon: Icon, tone } = findingIcon(f);
          return (
            <li key={f} className="flex gap-2.5 text-[13.5px] leading-snug">
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
              <span>{f}</span>
            </li>
          );
        })}
      </ul>

      {nothingBlocked && (
        <p className="mt-3 flex gap-2.5 text-[13px] leading-snug text-muted">
          <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          WAN cut at {clock(run.scenario, wanAt!)}, after all cloud messages left. Nothing blocked. Reset and cut it before Play to see the outage.
        </p>
      )}

      <AnimatePresence initial={false} mode="popLayout">
        {blocked.length > 0 && (
          <motion.div
            key="fix"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3.5 flex flex-col gap-3 rounded-[14px] bg-surface p-3.5 shadow-soft hairline sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-2.5">
              <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <p className="text-[13.5px] leading-snug">
                <span className="font-semibold">Fix:</span> add SMS from the local GSM modem for {blocked.map((g) => `the ${lower(g.name)}`).join(" and ")}. It
                needs no WAN.
              </p>
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2.5 self-end text-[13px] font-medium sm:self-auto">
              Add local SMS
              <Switch tone="success" checked={run.options.eocGsm} onCheckedChange={(v) => setEocGsm(v)} />
            </label>
          </motion.div>
        )}
        {others.length > 0 && (
          <motion.div
            key="fix-custom"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3.5 flex flex-col gap-3 rounded-[14px] bg-surface p-3.5 shadow-soft hairline sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-2.5">
              <MegaphoneIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <p className="text-[13.5px] leading-snug">
                <span className="font-semibold">Fix:</span> give {others.map((g) => g.name).join(" and ")} a channel that works without the WAN, such as local
                SMS or the siren.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 self-end sm:self-auto" onClick={openBroadcast}>
              Broadcast settings
            </Button>
          </motion.div>
        )}
        {fixedNow && (
          <motion.div
            key="fixed"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="mt-3.5 flex flex-col gap-2 rounded-[14px] bg-normal-soft p-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex gap-2.5 text-[13.5px] font-medium leading-snug text-normal">
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              Fixed. EOC and operators get local SMS with the WAN down.
            </p>
            <button
              type="button"
              onClick={() => setEocGsm(false)}
              className="shrink-0 self-end rounded-full px-2.5 py-1 text-[12px] font-medium text-normal outline-none transition-colors hover:bg-normal/10 focus-visible:ring-[3px] focus-visible:ring-ring/60 sm:self-auto"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
