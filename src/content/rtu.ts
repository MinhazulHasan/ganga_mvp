import type { ProvenanceKind } from "@/components/brand/provenance";
import { aug26 } from "@/lib/engine/scenarios";

/**
 * Team PASS field design: RTUs, wired sensors, LoRa with VHF fallback, valley station.
 * Text for the Architecture page. Hardware is designed, not built (provenance "planned").
 */

export const archNav = [
  { id: "rtu", n: "01", label: "RTU & sensors" },
  { id: "coverage", n: "02", label: "How many RTUs" },
  { id: "radio", n: "03", label: "Radio failover" },
  { id: "power", n: "04", label: "Power" },
  { id: "valley", n: "05", label: "Valley & server" },
  { id: "engine", n: "06", label: "Fusion engine" },
] as const;

/** Every part on the page, for the Built / Simulated / Planned counts in the header. */
export const archParts: { name: string; provenance: ProvenanceKind }[] = [
  { name: "RTU", provenance: "planned" },
  { name: "Radar level sensor", provenance: "planned" },
  { name: "Pressure sensor", provenance: "planned" },
  { name: "Geophone", provenance: "planned" },
  { name: "LoRa link", provenance: "planned" },
  { name: "VHF fallback", provenance: "planned" },
  { name: "Mountain booster", provenance: "planned" },
  { name: "Solar + cold-rated battery", provenance: "planned" },
  { name: "4G / MQTT uplink", provenance: "planned" },
  { name: "Three RTU checkpoints", provenance: "simulated" },
  { name: "Village siren", provenance: "simulated" },
  { name: "Mass SMS", provenance: "simulated" },
  { name: "Valley station network", provenance: "built" },
  { name: "Fusion engine", provenance: "built" },
  { name: "Dashboard (Command Center)", provenance: "built" },
  { name: "Post-event report", provenance: "built" },
];

/* ---------------------------------------------------------------- 01 */

export const rtuIntro = {
  rtu: {
    title: "Remote Terminal Unit (RTU)",
    body: "A rugged, solar-powered controller bolted to bedrock above the flood zone. It reads the sensors, filters false alarms and sends the alerts.",
  },
  wired: {
    title: "Why wired at the source?",
    body: "Short armored cables. Snow, ice and wind can't block a wire, and the water's edge is where radio links are weakest.",
  },
};

export type ProtocolId = "sdi12" | "ma" | "rs485";

export const protocols: { id: ProtocolId; tag: string; sensor: string; body: string; feeds: string; why: string }[] = [
  {
    id: "sdi12",
    tag: "SDI-12",
    sensor: "Radar level sensor",
    body: "Measures water height from above, so floating ice never touches it.",
    feeds: "Water level and rate of rise",
    why: "SDI-12 is the standard digital bus for hydrology sensors. Low power, several sensors on one cable.",
  },
  {
    id: "ma",
    tag: "4–20 mA",
    sensor: "Submerged pressure sensor",
    body: "Tracks depth reliably. If the current drops to zero, the cable is cut, and the RTU knows at once.",
    feeds: "Water depth, and a cut-cable flag",
    why: "A current loop ignores long-cable noise. 4 mA means zero depth, so 0 mA can only mean a broken loop.",
  },
  {
    id: "rs485",
    tag: "RS-485",
    sensor: "Seismic geophone",
    body: "Feels ice or rock avalanches shaking the ground before the flood wave arrives.",
    feeds: "Ground vibration",
    why: "RS-485 is a noise-resistant serial bus that carries digital readings over long cable runs.",
  },
];

/* ---------------------------------------------------------------- 02 */

export const coverage = {
  callout: {
    title: "Why one station is not enough",
    body: "An avalanche can sweep the lake RTU away, and side rivers add water downstream. One point of failure means a blind valley.",
  },
  checkpoints: [
    { n: 1, name: "Lake RTU", km: aug26.nodesKm[0], short: "Detects the breach first", body: "At the lake outlet. Sees the breach first and cross-checks its sensors." },
    { n: 2, name: "Gorge RTU", km: aug26.nodesKm[1], short: "Takes over if 1 goes silent", body: "In the narrow gorge downstream. If the lake RTU is destroyed, it catches the surge." },
    { n: 3, name: "Confluence RTU", km: aug26.nodesKm[2], short: "Combined volume and speed", body: "Where the tributary joins. Measures the combined flow and how fast the wave travels." },
  ],
};

/* ---------------------------------------------------------------- 03 */

export const radio = {
  primary: {
    title: "LoRa",
    sub: "Chirp spread spectrum",
    points: [
      "Long range on very little battery.",
      "When the link weakens, the RTU raises the spreading factor: slower, but it reaches further.",
    ],
  },
  fallback: {
    title: "Digital VHF radio",
    sub: "Automatic switchover",
    points: [
      "No acknowledgement (ACK) back from the station, so the RTU switches on its VHF radio.",
      "LoRa needs a clear path. A landslide, heavy snow on the antenna or a downed booster can cut it. VHF's longer waves bend over ridges and carry further.",
    ],
  },
  steps: [
    { id: "send", label: "Send via LoRa" },
    { id: "sf", label: "Weak link: raise SF" },
    { id: "noack", label: "No ACK" },
    { id: "vhf", label: "VHF on" },
  ],
} as const;

/* ---------------------------------------------------------------- 04 */

export const power = {
  challenge: {
    title: "The Himalayan power problem",
    body: "Sub-zero nights, no grid power, and days of snow on the solar panel.",
  },
  tiers: [
    { n: "01", title: "Deep-sleep duty cycling", body: "The RTU and sensors sleep at very low power and wake briefly to measure." },
    { n: "02", title: "Low-power LoRa listening", body: "Routine check-ins run on milliwatts. Receivers wake in short bursts to listen." },
    { n: "03", title: "Zero-standby VHF", body: "A hardware switch keeps the VHF radio fully off until LoRa fails or a flood starts." },
  ],
};

/* ---------------------------------------------------------------- 05 */

export const valley = {
  columns: [
    { title: "Direct RTU-to-station links", body: "Each RTU sends straight to its nearest valley station, not through a long relay chain." },
    { title: "Mountain boosters", body: "Where a peak blocks line of sight, a solar repeater on the ridge relays the signal down." },
    {
      title: "Two actions at the station",
      body: "Offline: fire the village siren at once, no internet. Online: push readings over 4G with MQTT to the server for the dashboard and mass SMS.",
    },
  ],
  mapping: [
    { label: "Valley station", value: "Our camp network and the fusion engine", provenance: "built" as ProvenanceKind, href: "/network" },
    { label: "Remote server", value: "Command Center dashboard and post-event report", provenance: "built" as ProvenanceKind, href: "/command-center" },
    { label: "Siren and mass SMS", value: "Delivery modelled in the replay", provenance: "simulated" as ProvenanceKind, href: "/command-center" },
  ],
};
