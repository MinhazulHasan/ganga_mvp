export const signalChain = [
  {
    id: "sensors",
    title: "Wired sensors",
    device: "Radar level (SDI-12) · pressure (4–20 mA) · geophone (RS-485)",
    points: ["Radar: water level from above, ice can't touch it", "Pressure: depth; 0 mA means the cable is cut", "Geophone: ground vibration from an avalanche"],
    link: "Armored cable to the RTU on bedrock",
    hop: "Armored cable",
  },
  {
    id: "node",
    title: "RTU",
    device: "Solar controller on bedrock · cold-rated battery",
    points: ["Reads the sensors and filters false alarms", "Reports every 60\u00a0s, every 5\u00a0s in an event"],
    link: "LoRa · VHF if no ACK · mountain booster where a peak blocks the path",
    hop: "LoRa · VHF",
  },
  {
    id: "gateway",
    title: "Station receiver",
    device: "LoRa + VHF receiver at the valley station",
    points: ["Sends the ACK back to the RTU", "Republishes each reading as MQTT"],
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
    points: ["Decides the alert state and fires the siren", "No internet needed"],
    link: "",
    hop: "",
  },
] as const;

export const radioOptions = [
  { name: "LoRa", sub: "Every reading", badge: "Primary", range: "2–15 km line of sight", power: "Very low · solar-friendly", cost: "No airtime fees", selected: true },
  { name: "Digital VHF", sub: "If LoRa gets no ACK", badge: "Fallback", range: "Long · bends over ridges", power: "High while sending · zero on standby", cost: "Licence + radios", selected: true },
  { name: "Cellular", sub: "GSM / NB-IoT", range: "Nearest tower only", power: "Moderate", cost: "SIM + data fees" },
  { name: "Satellite", sub: "Iridium SBD", range: "Global", power: "High per message", cost: "Costly hardware + messages" },
] as const;

export const radioTakeaway =
  "LoRa carries every reading on milliwatts. Digital VHF wakes only when LoRa gets no ACK. The station's link to the server is separate (4G).";

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
    { part: "Raspberry Pi 5", detail: "4 GB · station receiver host", usd: 85, source: "Tom's Hardware" },
    { part: "MikroTik hEX", detail: "Edge router / firewall", usd: 59.95, source: "Multilink" },
  ],
};

export const costTotals = {
  nodeAllIn: 211,
  siteAllIn: 2342,
  cloudPerMonth: 33,
  note: "All-in figures include items not itemised here (enclosure, battery, cabling). The RTU column is the low-cost prototype kit; field-grade parts (radar, pressure sensor, RS-485 geophone, digital VHF radio) are not priced yet.",
  cloudBasis: "3 RTUs × 1 reading per 30 s ≈ 259,200 messages/month. EC2 t3.medium (Mumbai) at $0.0448/h is ~98% of the cost.",
  sms: "International SMS: $0.10–0.30 per message. NTC bulk SMS: about NPR 0.50.",
};

/** Power-budget model of the low-power prototype RTU (from the team simulator). */
export const powerModel = {
  sensingMw: 8,
  joulesPerHeartbeat: 0.2,
  batteryWh: 11.1, // 3.7 V × 3000 mAh
  usableFraction: 0.8,
  panelEfficiency: 0.6,
  defaults: { panelW: 1, sunHours: 3, heartbeatS: 60 },
  assumptions: "Prototype RTU model: 3.7 V / 3000 mAh battery (80% usable), 60% panel efficiency, 0.2 J per heartbeat, 8 mW sensing and MCU. The VHF radio is gated off and adds nothing on a normal day.",
};
