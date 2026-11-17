"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  LaptopIcon,
  LockKeyholeIcon,
  NetworkIcon,
  RouterIcon,
  ServerIcon,
  ShieldCheckIcon,
  WifiIcon,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Provenance } from "@/components/brand/provenance";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { asBuilt } from "@/content/network";
import { teamPhotos } from "@/content/team";
import { cidrInfo, expandShortIp, inCidr } from "./net-utils";

/* ------------------------------------------------------------------
   Everything below is derived from `asBuilt` in src/content/network.ts.
------------------------------------------------------------------- */
type Row = { label: string; value: string; mono?: boolean; copy?: boolean };
type Item = { id: string; title: string; subtitle: string; icon: LucideIcon; rows: Row[]; note?: string };

const sv = asBuilt.serverVlan;
const cv = asBuilt.clientVlan;
const [bbLink, bbSubnet] = asBuilt.backbone.detail.split("·").map((s) => s.trim());
const [rUplink, rOspf] = asBuilt.router.detail.split("·").map((s) => s.trim());
const rUplinkIp = rUplink.split(" ").pop() ?? ""; // 202.249.25.115/27
const routerId = rOspf.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1] ?? "";
const [natUp, natRole, natDown] = cv.nat.detail.split("·").map((s) => s.trim()); // "ether1 .138/29", "NAT + OSPF v2/v3", "ether2 192.168.1.1/24"
const natUpIp = expandShortIp(natUp.split(" ").pop() ?? "", cv.subnet);
const natDownCidr = natDown.split(" ").pop() ?? ""; // 192.168.1.1/24
const lanCidr = cv.lan.name.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/)?.[1] ?? "";
const [lanTopo = "", lanDhcp = ""] = cv.lan.detail.split("·").map((s) => s.trim()); // "Group switch → Wi-Fi AP + laptops", "DHCP .100–.200"
const [lanSwitch = "", lanEdge = ""] = lanTopo.split("→").map((s) => s.trim());
const lanLeaves = lanEdge.split("+").map((s) => s.trim()).filter(Boolean); // ["Wi-Fi AP", "laptops"]
const svGw = expandShortIp(sv.gateway, sv.subnet);
const cvGw = expandShortIp(cv.gateway, cv.subnet);
const gwPort = (g: string) => g.match(/\(([^)]+)\)/)?.[1] ?? "";

function subnetRows(cidr: string): Row[] {
  const i = cidrInfo(cidr);
  if (!i) return [];
  return [
    { label: "Mask", value: `${i.mask} (/${i.prefix})`, mono: true },
    { label: "Usable range", value: `${i.firstHost} – ${i.lastHost}`, mono: true },
    { label: "Broadcast", value: i.broadcast, mono: true },
  ];
}

function hostItem(h: (typeof sv.hosts)[number]): Item {
  const web = h.detail.includes(asBuilt.domain);
  return {
    id: h.ip,
    title: h.name,
    subtitle: h.detail,
    icon: web ? GlobeIcon : ServerIcon,
    rows: [
      { label: "Address", value: h.ip, mono: true, copy: true },
      { label: "Subnet", value: sv.subnet, mono: true },
      { label: "Gateway", value: `${svGw} (${gwPort(sv.gateway)})`, mono: true },
      ...(web ? [{ label: "Serves", value: asBuilt.domain, mono: true, copy: true }] : []),
      ...subnetRows(sv.subnet).slice(0, 1),
    ],
    note: asBuilt.hardening,
  };
}

const usedServer = new Set([svGw, ...sv.hosts.map((h) => h.ip)]);
const svInfo = cidrInfo(sv.subnet);
const freeServer: string[] = [];
if (svInfo) {
  const last = Number(svInfo.lastHost.split(".")[3]);
  for (let o = Number(svInfo.firstHost.split(".")[3]); o <= last; o++) {
    const ip = `${svInfo.network.split(".").slice(0, 3).join(".")}.${o}`;
    if (!usedServer.has(ip)) freeServer.push(ip);
  }
}

const ITEMS: Record<string, Item> = {
  backbone: {
    id: "backbone",
    title: asBuilt.backbone.name,
    subtitle: asBuilt.backbone.detail,
    icon: GlobeIcon,
    rows: [
      { label: "Transport", value: bbLink },
      { label: "Subnet", value: bbSubnet, mono: true, copy: true },
      ...subnetRows(bbSubnet),
      ...(inCidr(rUplinkIp.split("/")[0], bbSubnet) ? [{ label: "Our router", value: `${rUplinkIp.split("/")[0]} (E0/0)`, mono: true }] : []),
    ],
  },
  router: {
    id: "router",
    title: asBuilt.router.name,
    subtitle: asBuilt.router.detail,
    icon: RouterIcon,
    rows: [
      { label: "E0/0 · backbone", value: rUplinkIp, mono: true, copy: true },
      { label: `${gwPort(sv.gateway)} · VLAN 1010`, value: svGw, mono: true },
      { label: `${gwPort(cv.gateway)} · VLAN 1020`, value: cvGw, mono: true },
      { label: "OSPF router ID", value: routerId, mono: true },
    ],
  },
  servers: {
    id: "servers",
    title: sv.name,
    subtitle: sv.subnet,
    icon: ServerIcon,
    rows: [
      { label: "Subnet", value: sv.subnet, mono: true, copy: true },
      { label: "Gateway", value: `${svGw} (${gwPort(sv.gateway)})`, mono: true },
      ...subnetRows(sv.subnet),
      { label: "Hosts in use", value: `${sv.hosts.length} of ${(svInfo?.usable ?? 1) - 1}`, mono: true },
      ...(freeServer.length ? [{ label: "Free", value: freeServer.join(", "), mono: true }] : []),
    ],
    note: asBuilt.hardening,
  },
  clients: {
    id: "clients",
    title: cv.name,
    subtitle: cv.subnet,
    icon: NetworkIcon,
    rows: [
      { label: "Subnet", value: cv.subnet, mono: true, copy: true },
      { label: "Gateway", value: `${cvGw} (${gwPort(cv.gateway)})`, mono: true },
      { label: "g1-nat ether1", value: natUpIp, mono: true },
      ...subnetRows(cv.subnet),
    ],
  },
  nat: {
    id: "nat",
    title: cv.nat.name,
    subtitle: natRole,
    icon: RouterIcon,
    rows: [
      { label: "ether1 · VLAN 1020", value: `${natUpIp}/${cidrInfo(cv.subnet)?.prefix ?? ""}`, mono: true },
      { label: "ether2 · NAT LAN", value: natDownCidr, mono: true, copy: true },
      { label: "Role", value: natRole },
      { label: "Default gateway", value: cvGw, mono: true },
    ],
  },
  lan: {
    id: "lan",
    title: cv.lan.name,
    subtitle: cv.lan.detail,
    icon: WifiIcon,
    rows: [
      { label: "Subnet", value: lanCidr, mono: true, copy: true },
      { label: "Gateway", value: natDownCidr.split("/")[0], mono: true },
      ...(lanDhcp ? [{ label: "DHCP pool", value: dhcpRange(lanDhcp, lanCidr), mono: true }] : []),
      { label: "Devices", value: lanTopo },
      ...subnetRows(lanCidr).slice(0, 1),
    ],
  },
};
for (const h of sv.hosts) ITEMS[h.ip] = hostItem(h);

function dhcpRange(dhcp: string, cidr: string) {
  const m = dhcp.match(/\.(\d+)\s*[–-]\s*\.(\d+)/);
  if (!m) return dhcp;
  const base = cidr.split("/")[0].split(".").slice(0, 3).join(".");
  return `${base}.${m[1]} – ${base}.${m[2]} (${Number(m[2]) - Number(m[1]) + 1} leases)`;
}

/* ------------------------------------------------------------------ */

export function AsBuilt() {
  const [open, setOpen] = React.useState(false);
  const [itemId, setItemId] = React.useState<string>("router");
  const show = (id: string) => {
    setItemId(id);
    setOpen(true);
  };
  const item = ITEMS[itemId];

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)]">
        {/* Diagram */}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Group 1 network</h3>
              <p className="mt-1 text-sm text-muted">Real addresses from the camp.</p>
            </div>
            <Provenance kind={asBuilt.provenance} tip="Built and tested on the APIE Camp #11 network." />
          </div>

          <div className="mt-6 flex flex-col items-center">
            <MapNode item={ITEMS.backbone} onOpen={show} className="w-full max-w-[360px]" />
            <Stem label={`E0/0 · ${rUplinkIp}`} />
            <MapNode item={ITEMS.router} onOpen={show} detail={rOspf} className="w-full max-w-[360px]" highlight />

            {/* split to the two VLANs */}
            <div className="relative hidden h-5 w-full sm:block" aria-hidden>
              <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--net-link-strong)]" />
            </div>
            <div className="mt-4 grid w-full grid-cols-[minmax(0,1fr)] gap-4 sm:mt-0 sm:grid-cols-2 sm:gap-5">
              <div className="relative flex flex-col">
                <span className="absolute -top-px left-1/2 right-[-10px] hidden h-px bg-[var(--net-link-strong)] sm:block" aria-hidden />
                <Stem label={`${gwPort(sv.gateway)} · ${sv.gateway.split(" ")[0]}`} className="hidden sm:flex" />
                <Zone title={sv.name} subnet={sv.subnet} gateway={sv.gateway} onOpen={() => show("servers")}>
                  <ul className="divide-y divide-border overflow-hidden rounded-[14px] bg-surface ring-1 ring-border">
                    {sv.hosts.map((h) => {
                      const it = ITEMS[h.ip];
                      const Icon = it.icon;
                      return (
                        <li key={h.ip}>
                          <button
                            type="button"
                            onClick={() => show(h.ip)}
                            className="group flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                          >
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-surface-2 text-muted group-hover:bg-surface-3">
                              <Icon className="size-3.5" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium leading-tight">{h.name}</span>
                              <span className="line-clamp-2 text-[11.5px] leading-snug text-muted">{h.detail}</span>
                            </span>
                            <span className="shrink-0 font-mono text-[11.5px] tabular text-foreground">.{h.ip.split(".").pop()}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Zone>
              </div>

              <div className="relative flex flex-col">
                <span className="absolute -top-px left-[-10px] right-1/2 hidden h-px bg-[var(--net-link-strong)] sm:block" aria-hidden />
                <Stem label={`${gwPort(cv.gateway)} · ${cv.gateway.split(" ")[0]}`} className="hidden sm:flex" />
                <Zone title={cv.name} subnet={cv.subnet} gateway={cv.gateway} onOpen={() => show("clients")}>
                  <MapNode item={ITEMS.nat} onOpen={show} detail={`${natUp} · ${natRole}`} compact wrap />
                  <Stem label={`ether2 · ${natDownCidr}`} short align="left" />
                  <button
                    type="button"
                    onClick={() => show("lan")}
                    className="group flex w-full flex-col gap-2.5 rounded-[14px] border border-border bg-surface p-3 text-left outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-soft focus-visible:ring-[3px] focus-visible:ring-ring/60"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-muted">
                        <WifiIcon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold leading-tight">NAT LAN</span>
                        <span className="block font-mono text-[11.5px] text-muted">{lanCidr}</span>
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                      <Leaf icon={NetworkIcon}>{lanSwitch}</Leaf>
                      <span aria-hidden className="text-subtle">→</span>
                      {lanLeaves.map((l) => (
                        <Leaf key={l} icon={/wi-?fi/i.test(l) ? WifiIcon : LaptopIcon}>
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </Leaf>
                      ))}
                    </span>
                    {lanDhcp && <span className="font-mono text-[11px] text-subtle">{lanDhcp}</span>}
                  </button>
                </Zone>
              </div>
            </div>
          </div>
        </Card>

        {/* Photo + hardening */}
        <div className="flex flex-col gap-6">
          <figure className="overflow-hidden rounded-[22px] border border-border bg-surface shadow-card">
            <Image quality={90}
              src={teamPhotos.lab.src}
              alt={teamPhotos.lab.alt}
              width={teamPhotos.lab.width}
              height={teamPhotos.lab.height}
              sizes="(min-width: 1024px) 480px, 100vw"
              loading="eager"
              fetchPriority="low"
              className="aspect-[16/9] w-full object-cover"
            />
            <figcaption className="flex flex-col gap-0.5 px-5 py-4">
              <span className="text-[13.5px] font-medium">At the lab bench, APIE Camp #11.</span>
              <span className="text-[12.5px] text-muted">Our switch, router and access point are on the left.</span>
              <span className="mt-1 text-[11.5px] text-subtle">{teamPhotos.lab.credit}</span>
            </figcaption>
          </figure>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-[10px] bg-built-soft text-built">
                <ShieldCheckIcon className="size-4" aria-hidden />
              </span>
              <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Naming and hardening</h3>
            </div>
            <div className="mt-4 divide-y divide-border overflow-hidden rounded-[16px] bg-surface-2">
              <FactRow icon={GlobeIcon} label="Domain" value={asBuilt.domain} mono copy />
              <FactRow
                icon={ServerIcon}
                label="DNS"
                value={`BIND9 · ${sv.hosts
                  .filter((h) => /dns/i.test(h.name))
                  .map((h) => h.name.replace(/\s*DNS$/i, "").toLowerCase())
                  .join(", ")}`}
              />
              {routerId && <FactRow icon={RouterIcon} label="OSPF" value={`Router ID ${routerId} · ${natRole.replace(/^NAT\s*\+\s*OSPF\s*/i, "")} on g1-nat`} />}
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-[16px] border border-built/25 bg-built-soft/60 px-4 py-3.5">
              <LockKeyholeIcon className="mt-0.5 size-4 shrink-0 text-built" aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Hardening</p>
                <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-muted">{asBuilt.hardening}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          {item && (
            <>
              <SheetHeader>
                <span className="mb-3 inline-flex size-11 items-center justify-center rounded-[14px] bg-surface-2 text-foreground">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <SheetTitle>{item.title}</SheetTitle>
                <SheetDescription className={cn(/\d+\.\d+/.test(item.subtitle) && "font-mono text-[12.5px]")}>{item.subtitle}</SheetDescription>
                <div className="mt-2">
                  <Provenance kind={asBuilt.provenance} tip="Built and tested on the APIE Camp #11 network." />
                </div>
              </SheetHeader>
              <SheetBody>
                <div className="divide-y divide-border overflow-hidden rounded-[16px] bg-surface-2">
                  {item.rows.map((r) => (
                    <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
                      <span className="shrink-0 pt-px text-[13px] text-muted">{r.label}</span>
                      <span className="flex min-w-0 items-start gap-1.5">
                        <span className={cn("min-w-0 text-right text-[13.5px] font-medium leading-snug", r.mono && "font-mono text-[12.5px] tabular")}>{r.value}</span>
                        {r.copy && <Copy value={r.value} />}
                      </span>
                    </div>
                  ))}
                </div>
                {item.note && (
                  <div className="mt-4 flex gap-3 rounded-[16px] border border-border p-4">
                    <LockKeyholeIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    <p className="text-[13px] leading-relaxed text-muted">{item.note}</p>
                  </div>
                )}
                <p className="mt-6 px-1 text-[12.5px] leading-relaxed text-subtle">{asBuilt.title}.</p>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Stem({ label, className, short, align = "center" }: { label: string; className?: string; short?: boolean; align?: "center" | "left" }) {
  // Centered from sm up; on phones the stem hangs on the left so its label never runs past the card.
  const center = align === "center";
  return (
    <div className={cn("relative flex w-full justify-start pl-7", center && "sm:justify-center sm:pl-0", short ? "h-8" : "h-10", className)}>
      <span className="h-full w-px bg-[var(--net-link-strong)]" aria-hidden />
      <span
        className={cn(
          "absolute left-7 top-1/2 ml-2.5 -translate-y-1/2 whitespace-nowrap font-mono text-[11px] text-muted",
          center && "sm:left-1/2"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function MapNode({
  item,
  onOpen,
  className,
  detail,
  highlight,
  compact,
  wrap,
}: {
  item: Item;
  onOpen: (id: string) => void;
  className?: string;
  detail?: string;
  highlight?: boolean;
  compact?: boolean;
  wrap?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[14px] border bg-surface text-left outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-soft focus-visible:ring-[3px] focus-visible:ring-ring/60",
        compact ? "p-3" : "p-3.5",
        highlight ? "border-border-strong shadow-soft" : "border-border",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[10px]",
          compact ? "size-8" : "size-9",
          highlight ? "bg-primary/[0.07] text-primary dark:bg-primary/15" : "bg-surface-2 text-muted"
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em]">{item.title}</span>
        <span className={cn("mt-0.5 block font-mono text-[11.5px] leading-snug text-muted", wrap ? "text-pretty" : "truncate")}>{detail ?? item.subtitle}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

function Zone({ title, subnet, gateway, onOpen, children }: { title: string; subnet: string; gateway: string; onOpen: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-[18px] border border-dashed border-border-strong bg-surface-2/60 p-3">
      <button
        type="button"
        onClick={onOpen}
        className="group -m-1 flex items-start justify-between gap-2 rounded-[10px] p-1 text-left outline-none transition-colors hover:bg-surface-3/60 focus-visible:ring-[3px] focus-visible:ring-ring/60"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-tight">{title}</span>
          <span className="mt-0.5 block font-mono text-[11.5px] text-muted">
            {subnet} · gw {gateway}
          </span>
        </span>
        <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
      {children}
    </div>
  );
}

function Leaf({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] text-foreground">
      <Icon className="size-3 text-muted" aria-hidden />
      {children}
    </span>
  );
}

function FactRow({ icon: Icon, label, value, mono, copy }: { icon: LucideIcon; label: string; value: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 sm:items-center">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted sm:mt-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <span className="shrink-0 text-[13px] text-muted sm:w-24">{label}</span>
        <span className={cn("min-w-0 flex-1 text-[13.5px] font-medium sm:text-right", mono && "font-mono text-[12.5px]")}>{value}</span>
      </div>
      {copy && <Copy value={value} />}
    </div>
  );
}

function Copy({ value }: { value: string }) {
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(false), 1400);
    return () => window.clearTimeout(t);
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
      className="-my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-subtle outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      {done ? <CheckIcon className="size-3.5 text-normal" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
    </button>
  );
}
