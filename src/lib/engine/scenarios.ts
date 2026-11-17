import type { Scenario } from "./types";

/**
 * 26 August 2026 — Bhote Koshi flash flood (Rasuwa).
 * Corridor geometry from the Team PASS simulator (distances approximate).
 * Flood-front timing is anchored on two published points:
 *  - wave at Rasuwagadhi / border at 08:44 (T+7 min)  — HiRISK via Watchers
 *  - threshold gauge ~100 km downstream crossed at 11:20 (T+163 min) — team deck reconstruction
 * Between anchors the front moves at a constant speed (piecewise linear).
 */
export const aug26: Scenario = {
  id: "aug26",
  name: "26 August 2026 · Bhote Koshi flash flood",
  shortName: "26 Aug 2026 · Rasuwa",
  river: "Bhote Koshi / Trishuli",
  region: "Rasuwa, Nepal",
  triggerClock: "08:37",
  date: "2026-08-26",
  utcOffset: "+05:45",
  kind: "reconstructed",
  description:
    "A rock-ice avalanche from the Lirung massif dammed the Lhende Khola. The dam failed and a debris flood ran down the Bhote Koshi into the Trishuli.",
  nodesKm: [6, 15, 28, 50, 75],
  villages: [
    { id: "rasuwagadhi", name: "Rasuwagadhi / Gyirong Port", km: 22, note: "Nepal–China border crossing" },
    { id: "timure", name: "Timure", km: 32 },
    { id: "syaphrubesi", name: "Syaphrubesi", km: 45 },
    { id: "mailung", name: "Mailung", km: 62, note: "Upper Trishuli hydropower area" },
    { id: "betrawati", name: "Betrawati", km: 85 },
    { id: "trishuli", name: "Trishuli Bazar", km: 104, note: "Below the threshold gauge" },
  ],
  gaugeKm: 100,
  arrival: [
    { km: 0, min: 0, label: "Avalanche · 08:37" },
    { km: 22, min: 7, label: "Rasuwagadhi · 08:44", source: "hirisk" },
    { km: 100, min: 163, label: "Gauge crossed · 11:20", source: "deck" },
  ],
  heartbeatS: 60,
  geophoneRangeKm: 15,
  rampS: 45,
  procDelayS: 10,
  durationMin: 180,
  realFirstSmsMin: 38,
  assumptions: [
    "River distances come from the Team PASS simulator and are approximate.",
    "The flood front is modelled between two published timings: Rasuwagadhi at 08:44 and the downstream gauge at 11:20. Real speeds varied along the valley.",
    "Sensor readings are simulated. Nodes N1–N2 sit in the Lhende Khola catchment, which straddles the Nepal–China border, so a real deployment needs cross-border data sharing.",
    "Thresholds are placeholders until a pilot season calibrates them.",
  ],
};

/** A generic valley used to show that GANGA ports to any river (constant 8 m/s). */
export const template: Scenario = {
  id: "template",
  name: "Template valley · illustrative",
  shortName: "Template valley",
  river: "Template river",
  region: "Any mountain valley",
  triggerClock: "06:00",
  date: "2026-07-15",
  utcOffset: "+05:45",
  kind: "illustrative",
  description: "A made-up valley with a constant 8 m/s flood front. Use it to show how GANGA ports to another river.",
  nodesKm: [5, 12, 25, 40],
  villages: [
    { id: "a", name: "Village A", km: 15 },
    { id: "b", name: "Village B", km: 35 },
    { id: "c", name: "Town C", km: 55 },
  ],
  gaugeKm: 60,
  arrival: [
    { km: 0, min: 0, label: "Trigger" },
    { km: 60, min: 125, label: "8 m/s" },
  ],
  heartbeatS: 60,
  geophoneRangeKm: 10,
  rampS: 90,
  procDelayS: 10,
  durationMin: 140,
  assumptions: ["All numbers are illustrative."],
};

export const scenarios = { aug26, template } as const;
export const scenarioList = [aug26, template];

export function getScenario(id: string | null | undefined): Scenario {
  return (id && (scenarios as Record<string, Scenario>)[id]) || aug26;
}
