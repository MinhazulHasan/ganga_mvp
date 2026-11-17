import type { Edge, Node } from "@xyflow/react";
import { ptDevices, ptLinks, vlanPlan, type PtDevice } from "@/content/network";

/* Geometry in flow units (≈ px at zoom 1). Hosts sit in VLAN zones along the bottom;
   the cloud → router → switch chain runs along the top, right-aligned so the switch's
   downlink drops straight onto the last VLAN. */
export const G = {
  hostW: 200,
  hostH: 128,
  hostGap: 10,
  zonePad: 10,
  zoneLabelH: 42,
  zoneGap: 16,
  zoneTop: 292,
  cloudW: 220,
  routerW: 280,
  switchW: 280,
  chainHandleY: 32,
} as const;

export type DeviceNodeData = { device: PtDevice; variant: "chain" | "host"; width: number; downlinkX?: number };
export type ZoneNodeData = { vlan: number; zone: string; subnet: string; width: number; height: number };
export type DeviceFlowNode = Node<DeviceNodeData, "device">;
export type ZoneFlowNode = Node<ZoneNodeData, "zone">;
export type NetNode = DeviceFlowNode | ZoneFlowNode;

export type LinkEdgeData = { label: string; kind: "chain" | "access"; wan: boolean; vlan?: number };
export type LinkFlowEdge = Edge<LinkEdgeData, "link">;

const RANK: Record<PtDevice["kind"], number> = { cloud: 0, router: 1, switch: 2, server: 3, pc: 3 };

export function buildLayout() {
  const zones: ZoneFlowNode[] = [];
  const hosts: DeviceFlowNode[] = [];
  const zoneH = G.zonePad + G.hostH + 8 + G.zoneLabelH;
  let x = 0;

  for (const v of vlanPlan) {
    const members = ptDevices.filter((d) => d.vlan === v.vlan);
    if (!members.length) continue;
    const w = members.length * G.hostW + (members.length - 1) * G.hostGap + G.zonePad * 2;
    zones.push({
      id: `zone-${v.vlan}`,
      type: "zone",
      position: { x, y: G.zoneTop },
      data: { vlan: v.vlan, zone: v.zone, subnet: v.subnet, width: w, height: zoneH },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    });
    members.forEach((d, i) => {
      hosts.push({
        id: d.id,
        type: "device",
        position: { x: x + G.zonePad + i * (G.hostW + G.hostGap), y: G.zoneTop + G.zonePad },
        data: { device: d, variant: "host", width: G.hostW },
        draggable: false,
        selectable: false,
        focusable: false,
        zIndex: 1,
      });
    });
    x += w + G.zoneGap;
  }
  const width = Math.max(x - G.zoneGap, G.cloudW + G.routerW + G.switchW + 300);

  const cloud = ptDevices.find((d) => d.kind === "cloud");
  const router = ptDevices.find((d) => d.kind === "router");
  const sw = ptDevices.find((d) => d.kind === "switch");

  // Spread the free width between the two chain links (the OSPF label is longer).
  const free = width - (G.cloudW + G.routerW + G.switchW);
  const gapWan = Math.round(free * 0.44);
  const swX = width - G.switchW;
  const routerX = G.cloudW + gapWan;

  // Align the switch downlink with the host centre nearest to it → one straight drop.
  const centres = hosts.map((h) => h.position.x + G.hostW / 2);
  const swMid = swX + G.switchW / 2;
  const nearest = centres.reduce((a, b) => (Math.abs(b - swMid) < Math.abs(a - swMid) ? b : a), swMid);
  const downlinkX = Math.min(G.switchW - 28, Math.max(28, nearest - swX));

  const chain: DeviceFlowNode[] = [];
  const push = (d: PtDevice | undefined, px: number, w: number, extra?: Partial<DeviceNodeData>) => {
    if (!d) return;
    chain.push({
      id: d.id,
      type: "device",
      position: { x: px, y: 0 },
      data: { device: d, variant: "chain", width: w, ...extra },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 1,
    });
  };
  push(cloud, 0, G.cloudW);
  push(router, routerX, G.routerW);
  push(sw, swX, G.switchW, { downlinkX });

  const byId = new Map(ptDevices.map((d) => [d.id, d]));
  const edges: LinkFlowEdge[] = ptLinks.flatMap((l, i) => {
    const a = byId.get(l.from);
    const b = byId.get(l.to);
    if (!a || !b) return [];
    const [src, dst] = RANK[a.kind] <= RANK[b.kind] ? [a, b] : [b, a];
    const access = RANK[dst.kind] === 3;
    const wan = "wan" in l && l.wan === true;
    return [
      {
        id: `link-${i}`,
        type: "link",
        source: src.id,
        target: dst.id,
        sourceHandle: access ? "b" : "r",
        targetHandle: access ? "t" : "l",
        selectable: false,
        focusable: false,
        data: { label: l.label, kind: access ? "access" : "chain", wan, vlan: access ? dst.vlan : undefined },
      },
    ];
  });

  // DOM (and so Tab) order follows the network: cloud → router → switch → each VLAN zone, then its hosts.
  // Stacking is handled by zIndex, so zones still sit underneath their hosts.
  const nodes: NetNode[] = [...chain, ...zones.flatMap((z) => [z, ...hosts.filter((h) => h.data.device.vlan === z.data.vlan)])];
  return { nodes, edges, width, height: G.zoneTop + zoneH };
}
