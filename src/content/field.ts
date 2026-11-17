export const signalChain = [
  {
    id: "sensors",
    title: "Sensors",
    device: "DFRobot A02YYUW ultrasonic + SM-24 geophone",
    points: ["Ultrasonic → UART pins: water level", "Geophone → amplifier → ADC pin: ground vibration"],
    link: "Wired to the board · UART + ADC",
    hop: "UART + ADC",
  },
  {
    id: "node",
    title: "Sensor node",
    device: "Heltec WiFi LoRa 32 V3 (ESP32-S3 + SX1262) · solar + Li-ion",
    points: ["Reports every 60\u00a0s: level, rate, vibration, id", "Sends it over LoRa (no Wi-Fi, no cable)"],
    link: "LoRa radio · 2–15 km · no cell tower",
    hop: "LoRa · 2–15 km",
  },
  {
    id: "gateway",
    title: "Gateway",
    device: "Raspberry Pi 5 + LoRa receiver",
    points: ["Receives LoRa, republishes as MQTT"],
    link: "Ethernet · RJ45",
    hop: "Ethernet",
  },
  {
    id: "switch",
    title: "Switch port",
    device: "Cisco Catalyst 9200L · VLAN 30 (IoT)",
    points: ["10.0.30.x by DHCP, IPv6 by SLAAC", "ACL: VLAN 30 reaches only the broker on 8883"],
    link: "MQTT over TLS · port 8883",
    hop: "MQTT · TLS 8883",
  },
  {
    id: "broker",
    title: "Fusion engine",
    device: "Mosquitto + engine on Proxmox · VLAN 20",
    points: ["Decides the alert state", "No internet, no other VLAN"],
    link: "",
    hop: "",
  },
] as const;

export const radioOptions = [
  { name: "LoRa", sub: "Selected", range: "2–15 km line of sight", power: "Very low · solar-friendly", cost: "No airtime fees", selected: true },
  { name: "Cellular", sub: "GSM / NB-IoT", range: "Nearest tower only", power: "Moderate", cost: "SIM + data fees" },
  { name: "Satellite", sub: "Iridium SBD", range: "Global", power: "High per message", cost: "Costly hardware + messages" },
  { name: "VHF / UHF", sub: "Licensed radio", range: "Long, terrain-dependent", power: "High transmit power", cost: "Licence + repeaters" },
] as const;

export const radioTakeaway =
  "LoRa: long range, milliwatt power, no airtime fees. The camp WAN uplink is separate (cellular or satellite).";

/** Itemised list prices from the team deck (USD, Oct 2026; excludes shipping, customs and 13% VAT). */
export const costItems = {
  node: [
    { part: "Heltec WiFi LoRa 32 V3", detail: "ESP32-S3 + SX1262", usd: 19.9, source: "Heltec" },
    { part: "Solar kit", detail: "Panel + charge board", usd: 45.2, source: "Heltec" },
    { part: "DFRobot A02YYUW", detail: "Ultrasonic level sensor", usd: 15.9, source: "DFRobot" },
    { part: "SM-24 geophone", detail: "Ground vibration", usd: 69.95, source: "SparkFun" },
  ],
  site: [
    { part: "Cisco Catalyst 9200L", detail: "C9200L-24T-4G-E · L3 switch (licensing extra)", usd: 1759.99, source: "CDW" },
    { part: "Intel N100 mini PC", detail: "Proxmox host, 16 GB", usd: 237, source: "CNX Software" },
    { part: "Raspberry Pi 5", detail: "4 GB · LoRa gateway host", usd: 85, source: "Tom's Hardware" },
    { part: "MikroTik hEX", detail: "Edge router / firewall", usd: 59.95, source: "Multilink" },
  ],
};

export const costTotals = {
  nodeAllIn: 211,
  siteAllIn: 2342,
  cloudPerMonth: 33,
  note: "All-in figures include items not itemised here (enclosure, battery, cabling).",
  cloudBasis: "3 nodes × 1 reading per 30 s ≈ 259,200 messages/month. EC2 t3.medium (Mumbai) at $0.0448/h is ~98% of the cost.",
  sms: "International SMS: $0.10–0.30 per message. NTC bulk SMS: about NPR 0.50.",
};

/** Power-budget model (from the team simulator). */
export const powerModel = {
  sensingMw: 8,
  joulesPerHeartbeat: 0.2,
  batteryWh: 11.1, // 3.7 V × 3000 mAh
  usableFraction: 0.8,
  panelEfficiency: 0.6,
  defaults: { panelW: 1, sunHours: 3, heartbeatS: 60 },
  assumptions: "Model: 3.7 V / 3000 mAh battery (80% usable), 60% panel efficiency, 0.2 J per heartbeat, 8 mW sensing and MCU.",
};
