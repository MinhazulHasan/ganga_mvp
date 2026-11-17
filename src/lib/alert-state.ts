import { ShieldCheckIcon, EyeIcon, TriangleAlertIcon, SirenIcon, type LucideIcon } from "lucide-react";

export type AlertState = "NORMAL" | "WATCH" | "WARNING" | "EMERGENCY";

export const ALERT_STATES: AlertState[] = ["NORMAL", "WATCH", "WARNING", "EMERGENCY"];

export const STATE_RANK: Record<AlertState, number> = { NORMAL: 0, WATCH: 1, WARNING: 2, EMERGENCY: 3 };

export const STATE_META: Record<
  AlertState,
  { label: string; short: string; description: string; icon: LucideIcon; text: string; soft: string; fill: string; ring: string }
> = {
  NORMAL: {
    label: "Normal",
    short: "NORMAL",
    description: "All RTUs reporting, no anomaly.",
    icon: ShieldCheckIcon,
    text: "text-normal",
    soft: "bg-normal-soft",
    fill: "bg-normal-fill",
    ring: "ring-normal/30",
  },
  WATCH: {
    label: "Watch",
    short: "WATCH",
    description: "One signal is abnormal. Officials are told; the public is not.",
    icon: EyeIcon,
    text: "text-watch",
    soft: "bg-watch-soft",
    fill: "bg-watch-fill",
    ring: "ring-watch/30",
  },
  WARNING: {
    label: "Warning",
    short: "WARNING",
    description: "Signals agree, or an RTU went silent after rising water. Residents are warned.",
    icon: TriangleAlertIcon,
    text: "text-warning",
    soft: "bg-warning-soft",
    fill: "bg-warning-fill",
    ring: "ring-warning/30",
  },
  EMERGENCY: {
    label: "Emergency",
    short: "EMERGENCY",
    description: "The wave is confirmed moving downstream. Evacuate now.",
    icon: SirenIcon,
    text: "text-emergency",
    soft: "bg-emergency-soft",
    fill: "bg-emergency-fill",
    ring: "ring-emergency/30",
  },
};
