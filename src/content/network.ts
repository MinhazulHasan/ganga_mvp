import type { ProvenanceKind } from "@/components/brand/provenance";

/* ---------------------------------------------------------------
   1) GANGA deployment network — Swarnima's Cisco Packet Tracer model
      (source of truth: network/configs/*.txt and network/apieGanga.pkt)
   --------------------------------------------------------------- */
export type Uplink = "r1" | "r2";

export type PtPort = { name: string; ip?: string; peer: string; wan?: boolean };

export type PtDevice = {
  id: string;
  label: string;
  model: string;
  role: string;
  vlan?: 10 | 20 | 30 | 50;
  addressing: string;
  /** host address, shown on the host card */
  ip?: string;
  /** switch port the host is plugged into */
  port?: string;
  ports?: PtPort[];
  /** which WAN uplink this router or carrier belongs to */
  uplink?: Uplink;
  standIn?: string;
  /** file name in network/configs/, without .txt */
  config?: string;
  note?: string;
  kind: "router" | "switch" | "server" | "pc" | "cloud" | "carrier";
};

export const uplinks: Record<Uplink, { router: string; carrier: string; medium: string; cost: number; switchPort: string; nextHop: string }> = {
  r1: { router: "GANGA-R1", carrier: "ISP-A", medium: "cellular", cost: 1, switchPort: "GigabitEthernet1/0/24", nextHop: "10.0.0.1" },
  r2: { router: "GANGA-R2", carrier: "ISP-B", medium: "satellite", cost: 100, switchPort: "GigabitEthernet1/0/23", nextHop: "10.0.0.5" },
};

export const ptDevices: PtDevice[] = [
  {
    id: "aws",
    label: "Internet / AWS",
    model: "2911 + Server-PT",
    role: "Stand-in for the internet and the AWS server",
    addressing: "AWS server 203.0.113.2/30 · gw 203.0.113.1",
    config: "INTERNET-AWS",
    note: "Not operated by us. One router stands in for the real, redundant internet because Packet Tracer cannot draw it.",
    kind: "cloud",
  },
  {
    id: "ispA",
    label: "ISP-A",
    model: "Cisco 2911",
    role: "Cellular carrier",
    addressing: "Gi0/0 198.51.100.2 → R1 · Gi0/1 172.16.1.1 → internet",
    uplink: "r1",
    config: "ISP-A",
    note: "Outside our responsibility.",
    kind: "carrier",
  },
  {
    id: "ispB",
    label: "ISP-B",
    model: "Cisco 2911",
    role: "Satellite carrier",
    addressing: "Gi0/0 192.0.2.2 → R2 · Gi0/1 172.16.2.1 → internet",
    uplink: "r2",
    config: "ISP-B",
    note: "Outside our responsibility.",
    kind: "carrier",
  },
  {
    id: "r1",
    label: "GANGA-R1",
    model: "Cisco 2911",
    role: "Primary router · cellular · NAT",
    addressing: "Gi0/0 10.0.0.1/30 → switch · Gi0/1 198.51.100.1/30 → ISP-A (cellular)",
    ports: [
      { name: "Gi0/0", ip: "10.0.0.1/30", peer: "GANGA-SW" },
      { name: "Gi0/1", ip: "198.51.100.1/30", peer: "ISP-A", wan: true },
    ],
    uplink: "r1",
    standIn: "MikroTik hEX in the field design",
    config: "GANGA-R1",
    kind: "router",
  },
  {
    id: "r2",
    label: "GANGA-R2",
    model: "Cisco 2911",
    role: "Backup router · satellite · NAT",
    addressing: "Gi0/0 10.0.0.5/30 → switch · Gi0/1 192.0.2.1/30 → ISP-B (satellite)",
    ports: [
      { name: "Gi0/0", ip: "10.0.0.5/30", peer: "GANGA-SW" },
      { name: "Gi0/1", ip: "192.0.2.1/30", peer: "ISP-B", wan: true },
    ],
    uplink: "r2",
    standIn: "Satellite terminal, not costed yet",
    config: "GANGA-R2",
    kind: "router",
  },
  {
    id: "sw",
    label: "GANGA-SW",
    model: "Catalyst 3650-24PS",
    role: "Layer-3 switch · VLAN gateways · DHCP · ACLs",
    addressing: "SVIs 10.0.10.1 · 10.0.20.1 · 10.0.30.1 · 10.0.50.1",
    standIn: "Catalyst 9200L in the field design",
    config: "GANGA-SW",
    kind: "switch",
  },
  { id: "admin", label: "Admin PC", model: "PC-PT", role: "Network management", vlan: 10, addressing: "10.0.10.0/24 · DHCP", port: "Gi1/0/5", kind: "pc" },
  { id: "broker", label: "Broker + Fusion server", model: "Server-PT", role: "MQTT broker and fusion engine", vlan: 20, addressing: "10.0.20.10/24 · static · gw 10.0.20.1 · dns 10.0.20.11", ip: "10.0.20.10", port: "Gi1/0/10", kind: "server" },
  { id: "dns", label: "DNS / Web server", model: "Server-PT", role: "DNS and the dashboard", vlan: 20, addressing: "10.0.20.11/24 · static · gw 10.0.20.1", ip: "10.0.20.11", port: "Gi1/0/11", kind: "server" },
  { id: "gw", label: "Gateway PC", model: "PC-PT", role: "Station receiver stand-in (LoRa + VHF)", vlan: 30, addressing: "10.0.30.0/24 · DHCP · port-security", port: "Gi1/0/1", kind: "pc" },
  { id: "op", label: "Operator PC", model: "PC-PT", role: "Flood operators' console", vlan: 50, addressing: "10.0.50.0/24 · DHCP", port: "Gi1/0/20", kind: "pc" },
];

export type PtLink = { from: string; to: string; label: string; wan?: Uplink; lane?: Uplink };

export const ptLinks: PtLink[] = [
  { from: "aws", to: "ispA", label: "", lane: "r1" },
  { from: "aws", to: "ispB", label: "", lane: "r2" },
  { from: "ispA", to: "r1", label: "cellular", wan: "r1", lane: "r1" },
  { from: "ispB", to: "r2", label: "satellite", wan: "r2", lane: "r2" },
  { from: "r1", to: "sw", label: "cost 1", lane: "r1" },
  { from: "r2", to: "sw", label: "cost 100", lane: "r2" },
  { from: "sw", to: "admin", label: "Gi1/0/5" },
  { from: "sw", to: "broker", label: "Gi1/0/10" },
  { from: "sw", to: "dns", label: "Gi1/0/11" },
  { from: "sw", to: "gw", label: "Gi1/0/1" },
  { from: "sw", to: "op", label: "Gi1/0/20" },
];

/** Real Cisco IOS lines for `shutdown` / `no shutdown` on a router's Gi0/1. */
export function shutLines(host: string) {
  return [
    `${host}(config)# interface GigabitEthernet0/1`,
    `${host}(config-if)# shutdown`,
    "%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to administratively down",
    "%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to down",
  ];
}
export function noShutLines(host: string) {
  return [
    `${host}(config)# interface GigabitEthernet0/1`,
    `${host}(config-if)# no shutdown`,
    "%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up",
    "%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up",
  ];
}
/** `show ip route ospf` on the switch: the only OSPF route it learns is the default. */
export function defaultRouteLine(via: Uplink | null, age = "00:00:04") {
  if (!via) return null;
  const u = uplinks[via];
  return `O*E2 0.0.0.0/0 [110/1] via ${u.nextHop}, ${age}, ${u.switchPort}`;
}

/** Whole-site WAN loss (both uplinks), used by the Command Center and the Overview. */
export const iosLog = {
  cut: [...shutLines("GANGA-R1"), ...shutLines("GANGA-R2")],
  restore: [...noShutLines("GANGA-R1"), ...noShutLines("GANGA-R2")],
  ospfNote: "OSPF neighbour 2.2.2.2 on Gi0/0 stays FULL on both routers. Only the WAN is down.",
};

/** Ping from the Broker + Fusion server to the AWS server, as in Swarnima's Packet Tracer recording. */
export const awsServer = "203.0.113.2";
export function pingLines(result: "ok" | "failover" | "offline") {
  const reply = `Reply from ${awsServer}: bytes=32 time<1ms TTL=124`;
  const unreachable = "Reply from 10.0.20.1: Destination host unreachable.";
  const body =
    result === "ok" ? [reply, reply, reply, reply] : result === "failover" ? ["Request timed out.", reply, reply, reply] : [unreachable, unreachable, unreachable, unreachable];
  const received = body.filter((l) => l === reply).length;
  return [
    `Pinging ${awsServer} with 32 bytes of data:`,
    ...body,
    `Ping statistics for ${awsServer}: Sent = 4, Received = ${received}, Lost = ${4 - received} (${((4 - received) / 4) * 100}% loss)`,
  ];
}

export const failover = {
  how: "Both routers send a default route into OSPF. The switch prefers GANGA-R1 (cost 1) over GANGA-R2 (cost 100). If R1's cellular port goes down, R1 withdraws its route and OSPF re-converges on satellite. In the Packet Tracer test the first pings are lost, then the cloud replies over the backup path.",
  gap: "Failover fires when R1's WAN port goes down. If the cellular network fails further out while the port stays up, R1 keeps its route. An IP SLA probe with tracking closes that gap.",
  gapProvenance: "planned" as ProvenanceKind,
};

/** What the Packet Tracer model does not cover yet (from Swarnima's recording, plus the IP SLA gap). */
export const nextSteps = [
  { title: "Field-test sensors and radio range", detail: "The field side is drawn, not simulated. LoRa and VHF ranges need real tests in the valley." },
  { title: "Backup switch", detail: "Two routers remove one single point of failure. GANGA-SW is still the other one." },
  { title: "Backup broker", detail: "One Broker + Fusion server today. A second one would take over if it fails." },
  { title: "MQTT security", detail: "The ACL opens only TCP 8883, MQTT over TLS. Certificates and access control still need real-world testing." },
  { title: "IP SLA tracking", detail: "Moves traffic to satellite even when the cellular port stays up but the carrier is down." },
] as const;

/** Swarnima's recording of the model in Cisco Packet Tracer, and the files behind it. */
export const ptMedia = {
  video: "/network/ganga-pt-demo.mp4",
  poster: "/network/ganga-pt-demo-poster.jpg",
  duration: "2:56",
  screenshot: "/network/pt-topology.png",
  pkt: "/network/apieGanga.pkt",
  pktSize: "110 KB",
  chapters: [
    { t: 0, label: "Overview" },
    { t: 24, label: "VLANs & ACLs" },
    { t: 47, label: "Two routers" },
    { t: 84, label: "Ping the cloud" },
    { t: 106, label: "Cut R1" },
    { t: 131, label: "Backup path" },
    { t: 142, label: "Route table" },
    { t: 149, label: "What's next" },
  ],
};

/* ---------------------------------------------------------------
   2) VLAN and addressing plan (field deployment)
   --------------------------------------------------------------- */
export const vlanPlan = [
  { vlan: 10, zone: "Management", subnet: "10.0.10.0/24", ipv6: "2001:db8:10::/64", allowed: "Admin PCs manage the network; blocked from operators" },
  { vlan: 20, zone: "Servers", subnet: "10.0.20.0/24", ipv6: "2001:db8:20::/64", allowed: "Web, ping and DNS from operators; MQTT :8883 from IoT; out to the cloud via NAT" },
  { vlan: 30, zone: "IoT", subnet: "10.0.30.0/24", ipv6: "2001:db8:30::/64", allowed: "MQTT :8883 to the broker only; no internet" },
  { vlan: 50, zone: "Operators", subnet: "10.0.50.0/24", ipv6: "2001:db8:50::/64", allowed: "Web, ping and DNS to the servers; blocked from IoT and Mgmt; no internet" },
] as const;

export const routingNote = "OSPF area 0 carries every VLAN subnet, so a new VLAN is advertised automatically.";

/* ---------------------------------------------------------------
   3) IPv6 — dual-stack
   --------------------------------------------------------------- */
export const ipv6 = {
  why: [
    { title: "Address space", detail: "Every sensor gets a globally unique address." },
    { title: "Taught at the camp", detail: "IPv6 for IoT and the IPv4 → IPv6 transition." },
    { title: "Future-proof cloud", detail: "AWS IoT Core has dual-stack endpoints." },
  ],
  steps: [
    "Router: enable IPv6 and advertise a /64 per VLAN (SLAAC)",
    "BIND9: add AAAA records so every service resolves over IPv6",
    "Firewall: mirror the IPv4 ACLs in the IPv6 filter",
    "Cloud: point the gateway at the IoT Core dual-stack endpoint",
  ],
  status: "Dual-stack keeps IPv4 working. New devices can be IPv6-first. 2001:db8::/32 is a documentation prefix. Real ones come from the ISP or APNIC.",
  provenance: "planned" as ProvenanceKind,
};

/* ---------------------------------------------------------------
   4) Network we actually built at APIE Camp #11 (Group 1)
   --------------------------------------------------------------- */
export const asBuilt = {
  title: "Network topology — Group 1, as built at APIE Camp #11",
  domain: "group1.apiecamp.asia",
  provenance: "built" as ProvenanceKind,
  backbone: { name: "APIE backbone", detail: "L2VPN · 202.249.25.96/27" },
  router: { name: "Group Router (CML)", detail: "E0/0 202.249.25.115/27 · OSPF router ID 1.1.1.1" },
  serverVlan: {
    name: "VLAN 1010 · servers",
    subnet: "202.249.25.128/29",
    gateway: ".129 (E0/1)",
    hosts: [
      { name: "Recursive DNS", detail: "BIND9 resolver", ip: "202.249.25.130" },
      { name: "Primary DNS", detail: "BIND9 master", ip: "202.249.25.131" },
      { name: "Secondary DNS", detail: "BIND9 slave", ip: "202.249.25.132" },
      { name: "Web server", detail: "Apache · group1.apiecamp.asia", ip: "202.249.25.133" },
    ],
  },
  clientVlan: {
    name: "VLAN 1020 · client side",
    subnet: "202.249.25.136/29",
    gateway: ".137 (E0/2)",
    nat: { name: "g1-nat (MikroTik)", detail: "ether1 .138/29 · NAT + OSPF v2/v3 · ether2 192.168.1.1/24" },
    lan: { name: "NAT LAN 192.168.1.0/24", detail: "Group switch → Wi-Fi AP + laptops · DHCP .100–.200" },
  },
  hardening: "Non-default SSH port · only VLAN 1020 may manage the servers",
} as const;
