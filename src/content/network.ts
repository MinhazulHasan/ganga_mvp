import type { ProvenanceKind } from "@/components/brand/provenance";

/* ---------------------------------------------------------------
   1) GANGA deployment network — Swarnima's Cisco Packet Tracer model
   --------------------------------------------------------------- */
export type PtDevice = {
  id: string;
  label: string;
  model: string;
  role: string;
  vlan?: 10 | 20 | 30 | 50;
  addressing: string;
  standIn?: string;
  kind: "router" | "switch" | "server" | "pc" | "cloud";
};

export const ptDevices: PtDevice[] = [
  { id: "r1", label: "GANGA-R1", model: "Cisco 2911", role: "Edge router · OSPF process 1 · WAN uplink", addressing: "Gi0/0 → switch (OSPF neighbour 2.2.2.2) · Gi0/1 → WAN", standIn: "MikroTik hEX in the field design", kind: "router" },
  { id: "sw", label: "GANGA_SW", model: "Catalyst 3650-24PS", role: "Layer-3 switch · VLAN gateways", addressing: "SVIs 10.0.10.1 · 10.0.20.1 · 10.0.30.1 · 10.0.50.1", standIn: "Catalyst 9200L in the field design", kind: "switch" },
  { id: "aws", label: "AWS / Internet", model: "Server-PT", role: "Cloud and internet stand-in", addressing: "Behind R1 Gi0/1", kind: "cloud" },
  { id: "admin", label: "Admin PC", model: "PC-PT", role: "Network management", vlan: 10, addressing: "10.0.10.0/24 · DHCP", kind: "pc" },
  { id: "broker", label: "Broker + Fusion server", model: "Server-PT", role: "MQTT broker and fusion engine", vlan: 20, addressing: "10.0.20.0/24 · static (IP to confirm)", kind: "server" },
  { id: "dns", label: "DNS / Web server", model: "Server-PT", role: "BIND9 DNS and the dashboard", vlan: 20, addressing: "10.0.20.0/24 · static (IP to confirm)", kind: "server" },
  { id: "gw", label: "Gateway PC", model: "PC-PT", role: "LoRa gateway stand-in", vlan: 30, addressing: "10.0.30.0/24 · DHCP", kind: "pc" },
  { id: "op", label: "Operator PC", model: "PC-PT", role: "Flood operators' console", vlan: 50, addressing: "10.0.50.0/24 · DHCP", kind: "pc" },
];

export const ptLinks = [
  { from: "r1", to: "aws", label: "Gi0/1 · WAN", wan: true },
  { from: "r1", to: "sw", label: "Gi0/0 · OSPF area 0" },
  { from: "sw", to: "admin", label: "VLAN 10" },
  { from: "sw", to: "broker", label: "VLAN 20" },
  { from: "sw", to: "dns", label: "VLAN 20" },
  { from: "sw", to: "gw", label: "VLAN 30" },
  { from: "sw", to: "op", label: "VLAN 50" },
] as const;

/** Real Cisco IOS messages for `shutdown` / `no shutdown` on GigabitEthernet0/1. */
export const iosLog = {
  cut: [
    "GANGA-R1(config)# interface GigabitEthernet0/1",
    "GANGA-R1(config-if)# shutdown",
    "%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to administratively down",
    "%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to down",
  ],
  restore: [
    "GANGA-R1(config-if)# no shutdown",
    "%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up",
    "%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up",
  ],
  ospfNote: "OSPF neighbour 2.2.2.2 on Gi0/0 stays FULL. Only the WAN is down.",
};

/* ---------------------------------------------------------------
   2) VLAN and addressing plan (field deployment)
   --------------------------------------------------------------- */
export const vlanPlan = [
  { vlan: 10, zone: "Management", subnet: "10.0.10.0/24", ipv6: "2001:db8:10::/64", allowed: "SSH / Winbox from admin hosts only" },
  { vlan: 20, zone: "Servers", subnet: "10.0.20.0/24", ipv6: "2001:db8:20::/64", allowed: "HTTPS + DNS from operators; MQTT; out to the cloud" },
  { vlan: 30, zone: "IoT", subnet: "10.0.30.0/24", ipv6: "2001:db8:30::/64", allowed: "MQTT :8883 to the broker only; no internet" },
  { vlan: 50, zone: "Operators", subnet: "10.0.50.0/24", ipv6: "2001:db8:50::/64", allowed: "Command Center + DNS; blocked from IoT and Mgmt" },
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
