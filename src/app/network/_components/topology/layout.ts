import type { Edge, Node } from "@xyflow/react";
import { ptDevices, ptLinks, vlanPlan, type PtDevice, type Uplink } from "@/content/network";

/* Geometry in flow units (≈ px at zoom 1).
   Two WAN lanes run left → right along the top: Internet/AWS → carrier → router → switch.
   Cellular (R1) is the upper lane, satellite (R2) the lower one. The switch sits between
   the lanes on the right and drops onto the VLAN zones along the bottom. */
export const G = {
  hostW: 200,
  hostH: 128,
  hostGap: 10,
  zonePad: 10,
  zoneLabelH: 42,
  zoneGap: 16,
  zoneTop: 462,
  laneY: [0, 196] as const,
  cloudW: 188,
  carrierW: 156,
  routerW: 236,
  switchW: 268,
  /** y of the left/right handles on lane cards */
  chainHandleY: 32,
  /** y of the two handles on the cloud (out) and the switch (in), relative to the card */
  pairHandleY: [20, 52] as const,
} as const;

const COL = {
  cloud: 0,
  carrier: G.cloudW + 96,
  router: G.cloudW + 96 + G.carrierW + 112,
  switch: G.cloudW + 96 + G.carrierW + 112 + G.routerW + 132,
};
/** cloud and switch sit between the lanes, so their handle pair is centred on the two lane lines */
const MID_Y = (G.laneY[0] + G.laneY[1]) / 2 + G.chainHandleY - (G.pairHandleY[0] + G.pairHandleY[1]) / 2;

export type DeviceNodeData = { device: PtDevice; variant: "chain" | "compact" | "host"; width: number; downlinkX?: number };
export type ZoneNodeData = { vlan: number; zone: string; subnet: string; width: number; height: number };
export type DeviceFlowNode = Node<DeviceNodeData, "device">;
export type ZoneFlowNode = Node<ZoneNodeData, "zone">;
export type NetNode = DeviceFlowNode | ZoneFlowNode;

export type LinkEdgeData = { label: string; kind: "chain" | "access"; wan?: Uplink; lane?: Uplink; vlan?: number };
export type LinkFlowEdge = Edge<LinkEdgeData, "link">;

const laneOf = (d: PtDevice) => (d.uplink === "r2" ? 1 : 0);

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
  const zonesW = x - G.zoneGap;
  const chainW = COL.switch + G.switchW;
  // Centre the zones under the lanes when the lanes are wider.
  const shift = Math.max(0, Math.round((chainW - zonesW) / 2));
  if (shift) {
    for (const n of [...zones, ...hosts]) n.position = { ...n.position, x: n.position.x + shift };
  }
  const width = Math.max(zonesW + shift, chainW);

  // Align the switch downlink with the host centre nearest to it → one straight drop.
  const centres = hosts.map((h) => h.position.x + G.hostW / 2);
  const swMid = COL.switch + G.switchW / 2;
  const nearest = centres.reduce((a, b) => (Math.abs(b - swMid) < Math.abs(a - swMid) ? b : a), swMid);
  const downlinkX = Math.min(G.switchW - 28, Math.max(28, nearest - COL.switch));

  const chain: DeviceFlowNode[] = [];
  const push = (d: PtDevice, px: number, py: number, w: number, variant: DeviceNodeData["variant"], extra?: Partial<DeviceNodeData>) => {
    chain.push({
      id: d.id,
      type: "device",
      position: { x: px, y: py },
      data: { device: d, variant, width: w, ...extra },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 1,
    });
  };
  for (const d of ptDevices) {
    if (d.kind === "cloud") push(d, COL.cloud, MID_Y, G.cloudW, "compact");
    else if (d.kind === "carrier") push(d, COL.carrier, G.laneY[laneOf(d)], G.carrierW, "compact");
    else if (d.kind === "router") push(d, COL.router, G.laneY[laneOf(d)], G.routerW, "chain");
    else if (d.kind === "switch") push(d, COL.switch, MID_Y, G.switchW, "chain", { downlinkX });
  }

  const byId = new Map(ptDevices.map((d) => [d.id, d]));
  const edges: LinkFlowEdge[] = ptLinks.flatMap((l, i) => {
    const src = byId.get(l.from);
    const dst = byId.get(l.to);
    if (!src || !dst) return [];
    const access = dst.vlan !== undefined;
    const lane = l.lane === "r2" ? "2" : "1";
    const sourceHandle = access ? "b" : src.kind === "cloud" ? `r${lane}` : "r";
    const targetHandle = access ? "t" : dst.kind === "switch" ? `l${lane}` : "l";
    return [
      {
        id: `link-${i}`,
        type: "link",
        source: src.id,
        target: dst.id,
        sourceHandle,
        targetHandle,
        selectable: false,
        focusable: false,
        data: { label: l.label, kind: access ? "access" : "chain", wan: l.wan, lane: l.lane, vlan: access ? dst.vlan : undefined },
      },
    ];
  });

  // DOM (and so Tab) order follows the network: cloud → carriers → routers → switch → each VLAN zone, then its hosts.
  const order = { cloud: 0, carrier: 1, router: 2, switch: 3 } as Record<string, number>;
  chain.sort((a, b) => (order[a.data.device.kind] ?? 9) - (order[b.data.device.kind] ?? 9));
  const nodes: NetNode[] = [...chain, ...zones.flatMap((z) => [z, ...hosts.filter((h) => h.data.device.vlan === z.data.vlan)])];
  return { nodes, edges, width, height: G.zoneTop + zoneH };
}
