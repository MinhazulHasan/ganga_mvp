"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, CloudIcon, ExternalLinkIcon, MegaphoneIcon, RotateCcwIcon, SignalIcon, SlidersHorizontalIcon } from "lucide-react";
import { deliveryStatusAt, getScenario, RULE_TEXT, RULES, type Delivery, type Evidence, type RunResult } from "@/lib/engine";
import { ptDevices, vlanPlan } from "@/content/network";
import { event, sources } from "@/content/event";
import { StatePill } from "@/components/brand/state-pill";
import { Provenance } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetBody, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSim } from "./sim-store";
import { closeSheet, jumpTo, openBroadcast, openWhatIf, resetBroadcast, resetWhatIfs, select } from "./sim-actions";
import { clock, tplus } from "./format";
import { Caption, DetailList, DetailRow, KIND_ICON, ruleText, TimeStamp } from "./bits";
import { CloudStatusInline } from "./cloud-view";
import { changedParams } from "./what-if-model";
import { isTeamBroadcast } from "./broadcast-model";

/* ---------------------------------------------------------------- evidence */

export function EvidenceSheet({ run, e }: { run: RunResult; e: Evidence }) {
  const s = run.scenario;
  const Icon = KIND_ICON[e.kind];
  const node = e.node ? run.nodes.find((n) => n.id === e.node) : undefined;
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2.5">
          {e.state ? (
            <StatePill state={e.state} />
          ) : (
            <span className="flex size-7 items-center justify-center rounded-[9px] bg-surface-2 text-muted hairline">
              <Icon className="size-3.5" aria-hidden />
            </span>
          )}
          <SheetTitle>{e.title}</SheetTitle>
        </div>
        <SheetDescription className="tabular">
          {clock(s, e.t)} · {tplus(e.t)}
        </SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-6">
        <p className="text-[15px] leading-relaxed">{e.detail}</p>
        <section>
          <Caption>Rule</Caption>
          <div className="mt-2 rounded-[14px] bg-surface-2 px-4 py-3 hairline">
            <span className="font-mono text-[12px] font-semibold text-muted">{e.rule}</span>
            <p className="mt-0.5 text-[14px] leading-relaxed">{ruleText(e.rule).split(" · ").slice(1).join(" · ") || ruleText(e.rule)}</p>
          </div>
        </section>
        {e.values && e.values.length > 0 && (
          <section>
            <Caption>Values</Caption>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.values.map((v) => (
                <span key={v} className="rounded-[8px] bg-surface-2 px-2 py-1 font-mono text-[12px] text-foreground tabular hairline">
                  {v}
                </span>
              ))}
            </div>
          </section>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              jumpTo(e.t, e.title);
              closeSheet();
            }}
          >
            Jump to this moment
          </Button>
          {node && (
            <Button variant="outline" size="sm" onClick={() => select({ kind: "node", id: node.id })}>
              Open {node.id} <ArrowRightIcon />
            </Button>
          )}
        </div>
      </SheetBody>
    </>
  );
}

/* ---------------------------------------------------------------- delivery */

export function DeliverySheet({ run, d }: { run: RunResult; d: Delivery }) {
  const s = run.scenario;
  const ch = run.channels.find((c) => c.id === d.channel);
  const status = useSim((st) => deliveryStatusAt(d, st.t));
  const dispatchS = run.groupConfig.find((g) => g.id === d.group)?.dispatchS ?? 0;
  return (
    <>
      <SheetHeader>
        <SheetTitle>{d.channelName}</SheetTitle>
        <SheetDescription>Recipient: {d.groupName}</SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-5">
        <DetailList>
          <DetailRow label="Status now">
            <Badge
              variant={status === "delivered" ? "normal" : status === "blocked" ? "emergency" : status === "sending" ? "watch" : "neutral"}
              className="capitalize"
            >
              {status}
            </Badge>
          </DetailRow>
          <DetailRow label="Triggered by">
            <StatePill state={d.trigger} size="sm" />
          </DetailRow>
          <DetailRow label="Leaves the edge">
            <TimeStamp clock={clock(s, d.sendMin)} tplus={tplus(d.sendMin)} />
          </DetailRow>
          <DetailRow label={d.blocked ? "Would have arrived" : "Arrives"}>
            <TimeStamp clock={clock(s, d.deliverMin)} tplus={tplus(d.deliverMin)} />
          </DetailRow>
          <DetailRow label="Channel latency">{ch ? `${ch.latencyS} s` : "—"}</DetailRow>
          <DetailRow label="Path">
            <span className="inline-flex items-center gap-1.5">
              {ch?.needsWan ? <CloudIcon className="size-3.5 text-muted" /> : <SignalIcon className="size-3.5 text-normal" />}
              {ch?.needsWan ? "Needs the WAN uplink" : "Local, no WAN needed"}
            </span>
          </DetailRow>
        </DetailList>
        {d.blocked && (
          <p className="rounded-[14px] bg-emergency-soft px-4 py-3 text-[14px] font-medium text-emergency">{d.reason ?? "Blocked."}</p>
        )}
        <p className="text-[12px] leading-relaxed text-subtle">
          Send time = state change + {run.options.procDelayS} s engine processing
          {dispatchS ? ` + ${dispatchS} s dispatch delay for this group` : ""}. Latency from the broadcast settings.
        </p>
        <Button variant="outline" size="sm" className="self-start" onClick={openBroadcast}>
          <MegaphoneIcon /> Edit broadcast settings
        </Button>
      </SheetBody>
    </>
  );
}

/* ---------------------------------------------------------------- device */

export function DeviceSheet({ id, run }: { id: string; run: RunResult }) {
  const dv = ptDevices.find((d) => d.id === id);
  const wanDown = useSim((st) => st.wanDownFromMin !== null && st.t >= st.wanDownFromMin);
  if (!dv) return null;
  const vlan = dv.vlan ? vlanPlan.find((v) => v.vlan === dv.vlan) : undefined;
  return (
    <>
      <SheetHeader>
        <SheetTitle>{dv.label}</SheetTitle>
        <SheetDescription>{dv.role}</SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-5">
        <DetailList>
          <DetailRow label="Model">{dv.model}</DetailRow>
          <DetailRow label="Addressing">
            <span className="font-mono text-[12.5px]">{dv.addressing}</span>
          </DetailRow>
          {dv.vlan && <DetailRow label="VLAN">{dv.vlan}</DetailRow>}
          {dv.standIn && <DetailRow label="In the field">{dv.standIn}</DetailRow>}
          {(dv.id === "r1" || dv.id === "aws") && (
            <DetailRow label="WAN now">
              <span className={wanDown ? "font-medium text-emergency" : "text-normal"}>{wanDown ? "Down (both uplinks shut)" : "Up · cellular, satellite on standby"}</span>
            </DetailRow>
          )}
          {dv.id === "aws" && (
            <DetailRow label="Cloud view">
              <CloudStatusInline className="text-[13.5px]" />
            </DetailRow>
          )}
        </DetailList>
        {vlan && (
          <section>
            <Caption>VLAN {vlan.vlan} · {vlan.zone}</Caption>
            <DetailList className="mt-2">
              <DetailRow label="IPv4">
                <span className="font-mono text-[12.5px]">{vlan.subnet}</span>
              </DetailRow>
              <DetailRow label="IPv6">
                <span className="font-mono text-[12.5px]">{vlan.ipv6}</span>
              </DetailRow>
              <DetailRow label="Allowed">{vlan.allowed}</DetailRow>
            </DetailList>
          </section>
        )}
        {dv.id === "aws" && (
          <p className="text-[12.5px] leading-relaxed text-muted">
            The cloud dashboard mirrors the edge. After 15 s without data it shows STALE, not an all-clear. The edge keeps alerting.
          </p>
        )}
        <p className="text-[12.5px] leading-relaxed text-muted">
          Team&apos;s Cisco Packet Tracer model. The fusion engine for the {run.scenario.shortName} alerts runs on the broker server in VLAN 20.
        </p>
        <Button variant="outline" size="sm" asChild className="self-start">
          <Link href="/network" onClick={() => closeSheet()}>
            Full network <ArrowRightIcon />
          </Link>
        </Button>
      </SheetBody>
    </>
  );
}

/* ---------------------------------------------------------------- assumptions */

/** What the user changed for this run, so the assumptions never read as the baseline when they are not. */
function WhatIfInEffect({ run }: { run: RunResult }) {
  const whatIf = useSim((st) => st.whatIf);
  const broadcast = useSim((st) => st.broadcast);
  const base = getScenario(run.scenario.id);
  const changes = changedParams(whatIf, base);
  const custom = !isTeamBroadcast(broadcast);
  if (!changes.length && !custom) return null;
  return (
    <section className="rounded-[16px] bg-surface-2 px-4 py-3.5 hairline">
      <Caption>In effect for this run</Caption>
      <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">
        {changes.map((c) => (
          <li key={c.key} className="flex items-baseline justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontalIcon className="size-3.5 translate-y-px text-muted" aria-hidden />
              {c.label}
            </span>
            <span className="tabular">
              <span className="font-semibold">{c.to}</span> <span className="text-subtle">· default {c.from}</span>
            </span>
          </li>
        ))}
        {custom && (
          <li className="inline-flex items-center gap-2">
            <MegaphoneIcon className="size-3.5 translate-y-px text-muted" aria-hidden />
            Broadcast settings differ from the team defaults
          </li>
        )}
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {changes.length > 0 && (
          <>
            <Button variant="outline" size="xs" onClick={openWhatIf}>
              <SlidersHorizontalIcon /> Open what-if
            </Button>
            <Button variant="ghost" size="xs" onClick={() => resetWhatIfs()}>
              <RotateCcwIcon /> Reset what-ifs
            </Button>
          </>
        )}
        {custom && (
          <Button variant="ghost" size="xs" onClick={() => resetBroadcast()}>
            <RotateCcwIcon /> Reset broadcast
          </Button>
        )}
      </div>
    </section>
  );
}

export function AssumptionsSheet({ run }: { run: RunResult }) {
  const s = run.scenario;
  const firstSms = event.facts.find((f) => f.label === "First SMS");
  const thresholds: [string, string][] = [
    ["Ground vibration", `${RULES.vibMmS} mm/s`],
    ["Rate of rise", `${RULES.riseCmMin} cm/min`],
    ["Event-mode report interval", `${RULES.burstS} s`],
    ["Silent after", `${RULES.missedBursts} missed bursts (event mode) · ${RULES.missedHeartbeats} heartbeats (quiet)`],
    ["Receiver-fault window", `${RULES.gatewayWindowS} s`],
    ["Speed assumed before measuring", `${RULES.priorSpeedMs} m/s (worst case)`],
  ];
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <SheetTitle>Assumptions & rules</SheetTitle>
          <Provenance kind="simulated" />
        </div>
        <SheetDescription>{s.name}</SheetDescription>
      </SheetHeader>
      <SheetBody className="flex flex-col gap-6">
        <WhatIfInEffect run={run} />
        <section>
          <Caption>Scenario</Caption>
          <p className="mt-2 text-[14px] leading-relaxed">{s.description}</p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {s.kind === "reconstructed" ? "Reconstructed from published sources." : "Illustrative, not a real event."} Trigger {s.triggerClock} local time ·{" "}
            {s.region}.
          </p>
        </section>
        <section>
          <Caption>Assumptions</Caption>
          <ul className="mt-2 flex flex-col gap-2">
            {s.assumptions.map((a) => (
              <li key={a} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-border-strong" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <Caption>Flood-front anchors</Caption>
          <DetailList className="mt-2">
            {s.arrival.map((a) => {
              const src = a.source ? sources[a.source] : undefined;
              return (
                <div key={`${a.km}-${a.min}`} className="py-2.5 text-[14px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{a.label}</span>
                    <span className="font-mono text-[12px] text-muted tabular">
                      km {a.km} · {tplus(a.min)}
                    </span>
                  </div>
                  {src && (
                    <p className="mt-0.5 text-[12px] text-subtle">
                      {src.url ? (
                        <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                          {src.label} <ExternalLinkIcon className="size-3" />
                        </a>
                      ) : (
                        src.label
                      )}
                      {src.note && ` — ${src.note}`}
                    </p>
                  )}
                </div>
              );
            })}
          </DetailList>
        </section>
        {s.realFirstSmsMin && firstSms && (
          <section>
            <Caption>Real-world comparison</Caption>
            <p className="mt-2 text-[14px] leading-relaxed">
              First SMS {firstSms.value}. {firstSms.detail}
            </p>
            <p className="mt-0.5 text-[12px] text-subtle">
              {sources[firstSms.source].label}
              {sources[firstSms.source].note && ` — ${sources[firstSms.source].note}`}
            </p>
          </section>
        )}
        <section>
          <Caption>Rules</Caption>
          <ul className="mt-2 flex flex-col gap-1.5">
            {Object.entries(RULE_TEXT).map(([k, v]) => (
              <li key={k} className="flex gap-2.5 text-[14px] leading-relaxed">
                <span className="mt-[3px] inline-flex h-5 shrink-0 items-center rounded-[6px] bg-surface-2 px-1.5 font-mono text-[10.5px] font-semibold text-muted hairline">
                  {k}
                </span>
                {v.split(" · ").slice(1).join(" · ")}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <Caption>Thresholds · placeholders until a pilot season</Caption>
          <DetailList className="mt-2">
            {thresholds.map(([k, v]) => (
              <DetailRow key={k} label={k}>
                <span className={cn("tabular")}>{v}</span>
              </DetailRow>
            ))}
          </DetailList>
        </section>
      </SheetBody>
    </>
  );
}
