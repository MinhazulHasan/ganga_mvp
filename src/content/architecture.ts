import type { ProvenanceKind } from "@/components/brand/provenance";

export type TierComponent = { name: string; detail: string; provenance: ProvenanceKind; note?: string };
export type Tier = { id: "field" | "edge" | "cloud"; label: string; verb: string; summary: string; components: TierComponent[] };

export const architectureLine = "Alerts are decided at the edge, without the internet.";

export const tiers: Tier[] = [
  {
    id: "field",
    label: "Field · Sensors",
    verb: "Sense",
    summary: "Solar sensor nodes along the river send water level and ground vibration over LoRa.",
    components: [
      { name: "Sensor nodes A, B, …", detail: "Water level + ground vibration · ESP32-S3 · solar-powered", provenance: "planned" },
      { name: "LoRa radio", detail: "2–15 km line of sight · no cell tower needed", provenance: "planned" },
      { name: "LoRa gateway", detail: "Raspberry Pi 5 + receiver · republishes each reading as MQTT", provenance: "planned" },
      { name: "Heartbeat", detail: "Every node reports every 60 s. A node going silent is a warning sign.", provenance: "simulated" },
    ],
  },
  {
    id: "edge",
    label: "Edge · Camp network",
    verb: "Decide",
    summary: "Alerts are decided locally, without the internet.",
    components: [
      { name: "MQTT broker", detail: "Mosquitto · TLS on port 8883 · servers VLAN", provenance: "planned" },
      {
        name: "GANGA fusion engine",
        detail: "Anomaly detection · sensor-death logic · arrival time · alert state",
        provenance: "built",
        note: "Runs in this prototype (TypeScript, in the browser and API). Target: a Python service on the edge VM.",
      },
      { name: "Command Center", detail: "Live map, evidence feed, lead times and CAP alert feed — this website", provenance: "built" },
      { name: "DNS · BIND9", detail: "Primary + secondary + recursive resolver", provenance: "built", note: "Built and tested on the camp network." },
    ],
  },
  {
    id: "cloud",
    label: "Cloud",
    verb: "Learn",
    summary: "Archive, forecast and reports. Never on the alert path.",
    components: [
      { name: "AWS IoT Core → S3", detail: "Archive every reading", provenance: "planned" },
      { name: "EC2 · LSTM", detail: "Rainfall-to-flood forecast for rain-fed floods", provenance: "planned" },
      {
        name: "LLM post-event report",
        detail: "Plain-language summary of what the engine saw and did",
        provenance: "built",
        note: "Runs in this prototype via the OpenAI API, server-side only. CAP alerts are never written by the LLM.",
      },
      { name: "SMS / e-mail", detail: "AWS SNS for officials and the public", provenance: "simulated", note: "Delivery is modelled in the Command Center." },
    ],
  },
];

export const dataFlow = [
  { step: 1, name: "Sense", detail: "Level, rate and vibration sampled on solar ESP32 nodes.", where: "edge" },
  { step: 2, name: "Transmit", detail: "LoRa uplink: heartbeat every 60 s, plus bursts during events.", where: "edge" },
  { step: 3, name: "Ingest", detail: "Gateway publishes to Mosquitto over TLS.", where: "edge" },
  { step: 4, name: "Fuse", detail: "Engine correlates signals and node health.", where: "edge" },
  { step: 5, name: "Alert", detail: "Command Center, CAP feed, sirens, SMS and e-mail.", where: "edge" },
  { step: 6, name: "Learn", detail: "Archive, forecast and post-event report.", where: "cloud" },
] as const;

export const dataFlowNote = "Steps 1–5 run on the camp edge, so alerts work if the WAN drops. Step 6 is the cloud.";

export const fusionSteps = [
  {
    step: 1,
    name: "Anomaly detection",
    detail: "Scores level, rate and vibration together, so one noisy sensor can't raise the alarm.",
  },
  {
    step: 2,
    name: "Sensor-death logic",
    detail: "A node that goes silent while neighbours report rising water counts as flood evidence.",
    highlight: true,
  },
  {
    step: 3,
    name: "Arrival-time estimate",
    detail: "Node spacing and wave speed give the arrival time at each village.",
  },
  {
    step: 4,
    name: "Alert state machine",
    detail: "NORMAL → WATCH → WARNING → EMERGENCY. Drives the Command Center, CAP feed and messages.",
  },
] as const;

export const whyFusion = {
  columns: ["Method", "Lead time", "If the sensor is destroyed", "False alarms"],
  rows: [
    ["Level-threshold gauge", "Short — water already high", "Alarm is lost", "Low"],
    ["Rate-of-rise", "Medium", "Alarm is lost", "Medium (noisy)"],
    ["Geophone only", "Medium–long", "Alarm is lost", "High (quakes, traffic)"],
    ["ML forecast (LSTM)", "Long for rain; weak for GLOF", "N/A", "Depends on data"],
    ["GANGA fusion", "Long — upstream fires first", "Silence becomes evidence", "Low (needs corroboration)"],
  ],
  takeaway: "Fusion costs a little edge compute and keeps warning after a node is lost.",
} as const;

export const resilience = [
  { name: "Encrypted telemetry", detail: "MQTT over TLS from gateway to broker and on to the cloud." },
  { name: "Segmented network", detail: "Four VLANs with firewall ACLs; IoT reaches the broker and nothing else." },
  { name: "Edge-first decisions", detail: "The fusion engine runs locally, so alerts work if the WAN drops." },
  { name: "Silence is a signal", detail: "Heartbeats every 60 seconds make a destroyed node evidence." },
  { name: "Redundant naming", detail: "BIND9 primary and secondary keep the dashboard and broker reachable by name." },
  { name: "Off-grid by design", detail: "Solar-powered nodes. A local GSM modem sends SMS without the WAN." },
] as const;
