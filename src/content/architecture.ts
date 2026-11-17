import type { ProvenanceKind } from "@/components/brand/provenance";

export type TierComponent = { name: string; detail: string; provenance: ProvenanceKind; note?: string };
export type Tier = { id: "field" | "edge" | "cloud"; label: string; verb: string; summary: string; components: TierComponent[] };

export const architectureLine = "Alerts are decided in the valley, without the internet.";

/** The three tiers, used by the Overview. The Architecture page shows the full field design (content/rtu.ts). */
export const tiers: Tier[] = [
  {
    id: "field",
    label: "Field · RTUs",
    verb: "Sense",
    summary: "Three solar RTUs on bedrock, wired to sensors at the water's edge. LoRa to the valley, VHF if LoRa fails.",
    components: [
      { name: "RTUs: lake, gorge, confluence", detail: "Rugged solar controllers on bedrock above the flood line", provenance: "planned" },
      { name: "Wired sensors", detail: "Radar level (SDI-12) · pressure (4–20 mA) · geophone (RS-485)", provenance: "planned" },
      { name: "LoRa radio", detail: "Primary link · digital VHF takes over when no ACK comes back", provenance: "planned" },
      { name: "Heartbeat", detail: "Every RTU reports every 60 s. An RTU going silent is a warning sign.", provenance: "simulated" },
    ],
  },
  {
    id: "edge",
    label: "Edge · Valley station",
    verb: "Decide",
    summary: "Alerts are decided in the valley, without the internet.",
    components: [
      { name: "Station receiver", detail: "LoRa and VHF in · republishes each reading as MQTT", provenance: "planned" },
      { name: "MQTT broker", detail: "Mosquitto · TLS on port 8883 · servers VLAN", provenance: "planned" },
      {
        name: "GANGA fusion engine",
        detail: "Anomaly detection · silence as evidence · arrival time · alert state",
        provenance: "built",
        note: "Runs in this prototype (TypeScript, in the browser and API). Target: a Python service at the valley station.",
      },
      { name: "Village siren", detail: "Fired by the station · no internet needed", provenance: "simulated" },
    ],
  },
  {
    id: "cloud",
    label: "Remote server",
    verb: "Inform",
    summary: "Dashboard, mass SMS and reports over 4G. Never on the siren path.",
    components: [
      { name: "Command Center", detail: "Live map, evidence feed, lead times and CAP alerts — this website", provenance: "built" },
      { name: "SMS / e-mail", detail: "Mass SMS and e-mail to officials and the public", provenance: "simulated", note: "Delivery is modelled in the Command Center." },
      {
        name: "LLM post-event report",
        detail: "Plain-language summary of what the engine saw and did",
        provenance: "built",
        note: "Runs in this prototype via the OpenAI API, server-side only. CAP alerts are never written by the LLM.",
      },
      { name: "Archive and forecast", detail: "Store every reading · LSTM forecast for rain-fed floods", provenance: "planned" },
    ],
  },
];

export const fusionSteps = [
  {
    step: 1,
    name: "Anomaly detection",
    detail: "Scores level, rate and vibration together, so one noisy sensor can't raise the alarm.",
  },
  {
    step: 2,
    name: "Silence as evidence",
    detail: "An RTU that goes silent while others report rising water counts as flood evidence.",
    highlight: true,
  },
  {
    step: 3,
    name: "Arrival-time estimate",
    detail: "RTU spacing and wave speed give the arrival time at each village.",
  },
  {
    step: 4,
    name: "Alert state machine",
    detail: "NORMAL → WATCH → WARNING → EMERGENCY. Drives the siren, CAP feed and messages.",
  },
] as const;

export const resilience = [
  { name: "Encrypted telemetry", detail: "MQTT over TLS from the station receiver to the broker and on to the server." },
  { name: "Segmented network", detail: "Four VLANs with firewall ACLs; IoT reaches the broker and nothing else." },
  { name: "Edge-first decisions", detail: "The fusion engine runs at the valley station, so alerts work if the internet drops." },
  { name: "Silence is a signal", detail: "Heartbeats every 60 seconds make a destroyed RTU evidence." },
  { name: "Redundant naming", detail: "BIND9 primary and secondary keep the dashboard and broker reachable by name." },
  { name: "Off-grid by design", detail: "Solar RTUs, VHF fallback, and a local GSM modem that sends SMS without the internet." },
] as const;
