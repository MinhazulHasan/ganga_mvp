"use client";

import * as React from "react";
import { ChartLineIcon, CpuIcon, HistoryIcon, NetworkIcon, UnplugIcon, UsersIcon } from "lucide-react";
import { useCommandStore } from "@/lib/stores/command-store";

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Page-scoped ⌘K actions for the Overview. */
export function OverviewCommands() {
  const register = useCommandStore((s) => s.register);
  React.useEffect(
    () =>
      register([
        {
          id: "overview-cut-wan",
          group: "Overview",
          label: "Toggle the WAN in the data-flow diagram",
          icon: <UnplugIcon />,
          keywords: ["wan", "outage", "network", "internet", "diagram"],
          run: () => {
            jump("how-it-works");
            window.dispatchEvent(new Event("ganga:toggle-wan"));
          },
        },
        { id: "overview-what-happened", group: "Overview", label: "What happened in the Rasuwa flood", icon: <HistoryIcon />, keywords: ["timeline", "event"], run: () => jump("what-happened") },
        { id: "overview-fusion", group: "Overview", label: "How the fusion engine decides", icon: <CpuIcon />, keywords: ["rules", "silence"], run: () => jump("fusion-engine") },
        { id: "overview-chart", group: "Overview", label: "Gauge chart", icon: <ChartLineIcon />, keywords: ["proof", "gauge", "chart"], run: () => jump("proof-chart") },
        { id: "overview-camp", group: "Overview", label: "What we built at camp", icon: <NetworkIcon />, keywords: ["dns", "bind9", "ospf", "camp"], run: () => jump("built-at-camp") },
        { id: "overview-team", group: "Overview", label: "Team PASS", icon: <UsersIcon />, keywords: ["people", "mentor"], run: () => jump("team") },
      ]),
    [register]
  );
  return null;
}
