"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  BanIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  RouteIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Provenance } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ipv6, routingNote, type PtDevice } from "@/content/network";
import { members } from "@/content/team";
import { useNetworkState } from "./network-state";
import { VlanChip, VlanDot, vlanColor, vlanSurface } from "./vlan-tone";
import { addressMode, DEVICE_ICON, deviceIconKey, KIND_LABEL } from "./device-meta";
import {
  cidrInfo,
  deviceById,
  devicesInVlan,
  linksFor,
  ospfFacts,
  sviFor,
  trafficRules,
  vlanById,
} from "./net-utils";

export type NetView = { kind: "device"; id: string } | { kind: "vlan"; vlan: number };

/** Sheet state with a small navigation stack (device → its VLAN → another device …). */
export function useNetSheet() {
  const [state, setState] = React.useState<{ isOpen: boolean; stack: NetView[] }>({ isOpen: false, stack: [] });
  const open = React.useCallback((v: NetView) => setState({ isOpen: true, stack: [v] }), []);
  const push = React.useCallback((v: NetView) => setState((s) => ({ isOpen: true, stack: [...s.stack, v] })), []);
  const back = React.useCallback(() => setState((s) => ({ ...s, stack: s.stack.length > 1 ? s.stack.slice(0, -1) : s.stack })), []);
  const close = React.useCallback(() => setState((s) => ({ ...s, isOpen: false })), []);
  return { ...state, open, push, back, close };
}
export type NetSheetApi = ReturnType<typeof useNetSheet>;

const designer = members.find((m) => m.id === "swarnima")?.name ?? "Swarnima Khadka";

export function NetSheet({ api }: { api: NetSheetApi }) {
  const view = api.stack[api.stack.length - 1];
  return (
    <Sheet open={api.isOpen} onOpenChange={(o) => !o && api.close()}>
      <SheetContent>
        {view?.kind === "device" && <DeviceView id={view.id} api={api} />}
        {view?.kind === "vlan" && <VlanView vlan={view.vlan} api={api} />}
        {!view && (
          <>
            <SheetTitle className="sr-only">Network details</SheetTitle>
            <SheetDescription className="sr-only">Nothing selected.</SheetDescription>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

function BackButton({ api }: { api: NetSheetApi }) {
  if (api.stack.length < 2) return null;
  const prev = api.stack[api.stack.length - 2];
  const label = prev.kind === "vlan" ? `VLAN ${prev.vlan}` : (deviceById(prev.id)?.label ?? "Back");
  return (
    <button
      type="button"
      onClick={api.back}
      className="-ml-1.5 mb-2 inline-flex h-7 w-fit items-center gap-1 rounded-full px-2 text-[13px] font-medium text-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      <ArrowLeftIcon className="size-3.5" />
      {label}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle first:mt-0">{children}</p>;
}

function Group({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border overflow-hidden rounded-[16px] bg-surface-2", className)}>{children}</div>;
}

function Row({ label, children, mono, copy }: { label: React.ReactNode; children: React.ReactNode; mono?: boolean; copy?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 pt-px text-[13px] text-muted">{label}</span>
      <span className="flex min-w-0 items-start gap-1.5">
        <span className={cn("min-w-0 text-right text-[13.5px] font-medium leading-snug", mono && "font-mono text-[12.5px] tabular")}>{children}</span>
        {copy && <CopyButton value={copy} />}
      </span>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      aria-label={`Copy ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("Copied", { description: value });
        } catch {
          toast("Couldn't copy", { description: "Your browser blocked clipboard access." });
        }
      }}
      className="-mr-1 -mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] text-subtle outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      {done ? <CheckIcon className="size-3.5 text-normal" /> : <CopyIcon className="size-3.5" />}
    </button>
  );
}

function NavRow({ onClick, children, trailing }: { onClick: () => void; children: React.ReactNode; trailing?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface-3/70 focus-visible:bg-surface-3/70 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
      <ChevronRightIcon className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function RuleList({
  allowed,
  className,
  size = "md",
  inline = false,
}: {
  allowed: string;
  className?: string;
  size?: "sm" | "md";
  /** render with spans (for use inside buttons, where lists are not valid) */
  inline?: boolean;
}) {
  const List = inline ? "span" : "ul";
  const Item = inline ? "span" : "li";
  return (
    <List className={cn("flex flex-wrap gap-1.5", className)}>
      {trafficRules(allowed).map((r) => (
        <Item
          key={r.text}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-surface leading-tight text-foreground ring-1 ring-border",
            size === "md" ? "px-2.5 py-1 text-[12.5px]" : "px-2 py-[3px] text-[12px]"
          )}
        >
          {r.deny ? <BanIcon className="size-3.5 shrink-0 text-emergency" aria-hidden /> : <CheckIcon className="size-3.5 shrink-0 text-normal" aria-hidden />}
          <span className="sr-only">{r.deny ? "Denied:" : "Allowed:"}</span>
          {r.text}
        </Item>
      ))}
    </List>
  );
}

function Footer() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4 text-[12.5px] text-muted">
      <Provenance kind="simulated" label="Packet Tracer" tip="Designed and run in Cisco Packet Tracer, not on field hardware." />
      <span>Designed by {designer}</span>
    </div>
  );
}

function IconTile({ device, unreachable }: { device: PtDevice; unreachable?: boolean }) {
  const Icon = DEVICE_ICON[deviceIconKey(device, { unreachable })];
  const tone = device.vlan ? vlanColor(device.vlan) : null;
  return (
    <span
      className={cn(
        "mb-3 inline-flex size-11 items-center justify-center rounded-[14px] border",
        !tone && !unreachable && "border-transparent bg-primary/8 text-primary dark:bg-primary/15",
        unreachable && "border-transparent bg-surface-2 text-subtle"
      )}
      style={tone && !unreachable ? { ...vlanSurface(device.vlan!, "medium"), color: tone.text } : undefined}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/* ------------------------------------------------------------------ */

function DeviceView({ id, api }: { id: string; api: NetSheetApi }) {
  const { wanDown } = useNetworkState();
  const d = deviceById(id);
  if (!d) return <SheetTitle className="sr-only">Unknown device</SheetTitle>;
  const unreachable = d.kind === "cloud" && wanDown;
  const vlan = d.vlan ? vlanById(d.vlan) : undefined;
  const subnet = vlan ? cidrInfo(vlan.subnet) : null;
  const svi = d.vlan ? sviFor(d.vlan) : null;
  const mode = addressMode(d);
  const ospf = ospfFacts();
  const links = linksFor(d.id);

  return (
    <>
      <SheetHeader>
        <BackButton api={api} />
        <IconTile device={d} unreachable={unreachable} />
        <SheetTitle>{d.label}</SheetTitle>
        <SheetDescription>
          {d.model} · {KIND_LABEL[d.kind]}
        </SheetDescription>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.vlan && <VlanChip vlan={d.vlan} size="sm" />}
          {d.kind === "cloud" &&
            (unreachable ? (
              <Badge variant="emergency" size="sm">
                <TriangleAlertIcon aria-hidden />
                Unreachable · Gi0/1 down
              </Badge>
            ) : (
              <Badge variant="normal" size="sm">
                <CheckIcon aria-hidden />
                Reachable via Gi0/1
              </Badge>
            ))}
          {mode.toConfirm && (
            <Badge variant="planned" size="sm">
              IP to confirm
            </Badge>
          )}
        </div>
      </SheetHeader>

      <SheetBody>
        <GroupLabel>Device</GroupLabel>
        <Group>
          <Row label="Role">{d.role}</Row>
          <Row label="Packet Tracer model">{d.model}</Row>
          {d.standIn && (
            <Row label="Stand-in for">
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeftRightIcon className="size-3.5 text-subtle" aria-hidden />
                {d.standIn}
              </span>
            </Row>
          )}
        </Group>

        <GroupLabel>Addressing</GroupLabel>
        <Group>
          <Row label="As configured" mono copy={d.addressing}>
            {d.addressing}
          </Row>
          {vlan && subnet && (
            <>
              <Row label="Subnet" mono>
                {subnet.cidr}
              </Row>
              {svi && (
                <Row label="Gateway (SVI)" mono>
                  {svi}
                </Row>
              )}
              {mode.mode && (
                <Row label="Address">
                  {mode.mode}
                  {mode.toConfirm && <span className="text-muted"> · exact IP to confirm</span>}
                </Row>
              )}
            </>
          )}
          {d.kind === "switch" &&
            [10, 20, 30, 50].map((v) => {
              const ip = sviFor(v);
              if (!ip) return null;
              return (
                <Row
                  key={v}
                  label={
                    <span className="inline-flex items-center gap-2">
                      <VlanDot vlan={v} /> SVI · VLAN {v}
                    </span>
                  }
                  mono
                >
                  {ip}
                </Row>
              );
            })}
          {d.kind === "router" && (
            <>
              <Row label="OSPF neighbour" mono>
                {ospf.neighbour} on {ospf.iface} · {ospf.state}
              </Row>
              <Row label="Gi0/1 (WAN)">
                {wanDown ? <span className="text-emergency">Administratively down</span> : <span className="text-normal">Up</span>}
              </Row>
            </>
          )}
        </Group>

        {links.length > 0 && (
          <>
            <GroupLabel>Links</GroupLabel>
            <Group>
              {links.map((l) => {
                const down = l.wan && wanDown;
                return (
                  <NavRow
                    key={`${l.label}-${l.peer.id}`}
                    onClick={() => api.push({ kind: "device", id: l.peer.id })}
                    trailing={
                      down ? (
                        <Badge variant="emergency" size="sm">
                          down
                        </Badge>
                      ) : null
                    }
                  >
                    <span className="block text-[13.5px] font-medium">{l.peer.label}</span>
                    <span className={cn("block font-mono text-[12px]", down ? "text-emergency" : "text-muted")}>{l.label}</span>
                  </NavRow>
                );
              })}
            </Group>
          </>
        )}

        {vlan && (
          <>
            <GroupLabel>Allowed traffic · VLAN {vlan.vlan}</GroupLabel>
            <RuleList allowed={vlan.allowed} />
            <button
              type="button"
              onClick={() => api.push({ kind: "vlan", vlan: vlan.vlan })}
              className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline"
            >
              Open VLAN {vlan.vlan} · {vlan.zone}
              <ChevronRightIcon className="size-3.5" />
            </button>
          </>
        )}
      </SheetBody>
      <Footer />
    </>
  );
}

/* ------------------------------------------------------------------ */

function VlanView({ vlan: id, api }: { vlan: number; api: NetSheetApi }) {
  const v = vlanById(id);
  if (!v) return <SheetTitle className="sr-only">Unknown VLAN</SheetTitle>;
  const info = cidrInfo(v.subnet);
  const svi = sviFor(v.vlan);
  const devices = devicesInVlan(v.vlan);
  const docNote = ipv6.status.split(/(?<=\.)\s+/).find((s) => s.includes("2001:db8"));

  return (
    <>
      <SheetHeader>
        <BackButton api={api} />
        <span className="mb-3 inline-flex">
          <VlanChip vlan={v.vlan} size="lg" />
        </span>
        <SheetTitle>
          VLAN {v.vlan} · {v.zone}
        </SheetTitle>
        <SheetDescription className="font-mono text-[12.5px]">
          {v.subnet} · {v.ipv6}
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <GroupLabel>IPv4</GroupLabel>
        <Group>
          <Row label="Subnet" mono copy={v.subnet}>
            {v.subnet}
          </Row>
          {svi && (
            <Row label="Gateway (SVI on the switch)" mono>
              {svi}
            </Row>
          )}
          {info && (
            <>
              <Row label="Mask" mono>
                {info.mask}
              </Row>
              <Row label="Usable range" mono>
                {info.firstHost} – {info.lastHost}
              </Row>
              <Row label="Usable addresses" mono>
                {info.usable}
              </Row>
            </>
          )}
        </Group>

        <GroupLabel>IPv6 · planned</GroupLabel>
        <Group>
          <Row label="Prefix" mono copy={v.ipv6}>
            {v.ipv6}
          </Row>
          <Row label="Addressing">SLAAC</Row>
        </Group>
        {docNote && <p className="mt-2 px-1 text-[12.5px] leading-relaxed text-muted">{docNote}</p>}

        <GroupLabel>Policy</GroupLabel>
        <RuleList allowed={v.allowed} />

        {devices.length > 0 && (
          <>
            <GroupLabel>In the Packet Tracer model</GroupLabel>
            <Group>
              {devices.map((d) => {
                const Icon = DEVICE_ICON[deviceIconKey(d)];
                return (
                  <NavRow key={d.id} onClick={() => api.push({ kind: "device", id: d.id })}>
                    <span className="flex items-center gap-3">
                      <span
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] border"
                        style={{ ...vlanSurface(v.vlan, "medium"), color: vlanColor(v.vlan).text }}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium">{d.label}</span>
                        <span className="block text-[12.5px] text-muted">{d.role}</span>
                      </span>
                    </span>
                  </NavRow>
                );
              })}
            </Group>
          </>
        )}

        <div className="mt-6 flex gap-3 rounded-[16px] border border-border p-4">
          <RouteIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[13px] leading-relaxed text-muted">{routingNote}</p>
        </div>
      </SheetBody>
      <Footer />
    </>
  );
}
