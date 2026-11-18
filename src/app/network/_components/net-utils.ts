import { ptDevices, ptLinks, vlanPlan, iosLog, type PtDevice, type Uplink } from "@/content/network";

/* ------------------------------------------------------------------
   IPv4 helpers — all addresses shown on the page are derived from
   src/content/network.ts, these only do the subnet arithmetic.
------------------------------------------------------------------- */
const toInt = (ip: string) => ip.split(".").reduce((acc, o) => ((acc << 8) + Number(o)) >>> 0, 0);
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

export type CidrInfo = {
  cidr: string;
  prefix: number;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  usable: number;
  mask: string;
};

export function cidrInfo(cidr: string): CidrInfo | null {
  const m = cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m) return null;
  const prefix = Number(m[2]);
  if (prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const net = (toInt(m[1]) & mask) >>> 0;
  const bc = (net | (~mask >>> 0)) >>> 0;
  const size = 2 ** (32 - prefix);
  return {
    cidr: `${toIp(net)}/${prefix}`,
    prefix,
    network: toIp(net),
    broadcast: toIp(bc),
    firstHost: toIp(prefix >= 31 ? net : net + 1),
    lastHost: toIp(prefix >= 31 ? bc : bc - 1),
    usable: prefix >= 31 ? size : size - 2,
    mask: toIp(mask),
  };
}

/** ".129" or ".138/29" inside 202.249.25.128/29 → "202.249.25.129" */
export function expandShortIp(short: string, subnet: string): string {
  const host = short.trim().replace(/^\./, "").replace(/\/\d+$/, "").split(" ")[0];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  const base = subnet.split("/")[0].split(".");
  const parts = host.split(".");
  return [...base.slice(0, 4 - parts.length), ...parts].join(".");
}

/** Is `ip` inside `cidr`? */
export function inCidr(ip: string, cidr: string): boolean {
  const info = cidrInfo(cidr);
  if (!info) return false;
  const n = toInt(ip);
  return n >= toInt(info.network) && n <= toInt(info.broadcast);
}

/* ------------------------------------------------------------------
   Topology helpers
------------------------------------------------------------------- */
export const vlanById = (vlan: number) => vlanPlan.find((v) => v.vlan === vlan);
export const deviceById = (id: string) => ptDevices.find((d) => d.id === id);
export const devicesInVlan = (vlan: number) => ptDevices.filter((d) => d.vlan === vlan);

/** The SVI (gateway) for a VLAN, only if the switch's addressing in the content really lists it. */
export function sviFor(vlan: number): string | null {
  const row = vlanById(vlan);
  const sw = ptDevices.find((d) => d.kind === "switch");
  if (!row || !sw) return null;
  const info = cidrInfo(row.subnet);
  if (!info) return null;
  return sw.addressing.includes(info.firstHost) ? info.firstHost : null;
}

/** Links touching a device, with the device on the other end. */
export function linksFor(id: string) {
  return ptLinks
    .filter((l) => l.from === id || l.to === id)
    .map((l) => ({ label: l.label, wan: l.wan, peer: deviceById(l.from === id ? l.to : l.from) as PtDevice }));
}

/** A link is on the live path when its lane is the router the default route points at. */
export function linkState(l: { wan?: Uplink; lane?: Uplink }, down: Record<Uplink, boolean>, route: Uplink | null) {
  if (l.wan && down[l.wan]) return "down" as const;
  if (!l.lane) return "access" as const;
  return l.lane === route ? ("active" as const) : ("standby" as const);
}

/** "HTTPS + DNS from operators; MQTT; out to the cloud" → rules with allow/deny. */
export type TrafficRule = { text: string; deny: boolean };
export function trafficRules(allowed: string): TrafficRule[] {
  return allowed
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ text: s.charAt(0).toUpperCase() + s.slice(1), deny: /^(no|blocked)\b/i.test(s) }));
}

/** Pull "2.2.2.2", "Gi0/0", "FULL" out of the OSPF note so the chip never drifts from the content. */
export function ospfFacts() {
  const m = iosLog.ospfNote.match(/neighbour\s+(\S+)\s+on\s+(\S+)\s+stays\s+(\w+)/i);
  return { neighbour: m?.[1] ?? "2.2.2.2", iface: m?.[2] ?? "Gi0/0", state: (m?.[3] ?? "FULL").toUpperCase() };
}

/* ------------------------------------------------------------------
   IOS console lines
------------------------------------------------------------------- */
export type IosLine = { kind: "cmd"; prompt: string; text: string } | { kind: "log"; text: string } | { kind: "note"; text: string };

export function parseIos(lines: readonly string[]): IosLine[] {
  return lines.map((l) => {
    const m = l.match(/^([\w.-]+(?:\([\w-]+\))?[#>])\s?(.*)$/);
    if (m && !l.startsWith("%")) return { kind: "cmd", prompt: m[1], text: m[2] };
    return { kind: "log", text: l };
  });
}

/** Local wall-clock time with milliseconds, e.g. 20:41:07.123 */
export function fmtClock(ms: number) {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}
