import {
  CloudIcon,
  CloudOffIcon,
  MonitorCogIcon,
  MonitorIcon,
  NetworkIcon,
  RadioTowerIcon,
  RouterIcon,
  ServerCogIcon,
  ServerIcon,
  type LucideIcon,
} from "lucide-react";
import type { PtDevice } from "@/content/network";

/** Icons for devices. Look up with `DEVICE_ICON[deviceIconKey(d)]` (a static map keeps React's compiler rules happy). */
export const DEVICE_ICON = {
  router: RouterIcon,
  switch: NetworkIcon,
  cloud: CloudIcon,
  cloudOff: CloudOffIcon,
  server: ServerIcon,
  broker: ServerCogIcon,
  pc: MonitorIcon,
  admin: MonitorCogIcon,
  gateway: RadioTowerIcon,
} satisfies Record<string, LucideIcon>;
type DeviceIconKey = keyof typeof DEVICE_ICON;

export function deviceIconKey(d: PtDevice, opts?: { unreachable?: boolean }): DeviceIconKey {
  if (d.kind === "cloud") return opts?.unreachable ? "cloudOff" : "cloud";
  if (d.id === "admin") return "admin";
  if (d.id === "gw") return "gateway";
  if (d.id === "broker") return "broker";
  return d.kind;
}

export const KIND_LABEL: Record<PtDevice["kind"], string> = {
  router: "Router",
  switch: "Layer-3 switch",
  cloud: "Cloud",
  server: "Server",
  pc: "PC",
};

/** "10.0.20.0/24 · static (IP to confirm)" → { mode: "static", toConfirm: true } */
export function addressMode(d: PtDevice): { mode: "DHCP" | "Static" | null; toConfirm: boolean } {
  const a = d.addressing.toLowerCase();
  return {
    mode: a.includes("dhcp") ? "DHCP" : a.includes("static") ? "Static" : null,
    toConfirm: a.includes("to confirm"),
  };
}
