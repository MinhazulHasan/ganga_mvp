export const site = {
  name: "GANGA",
  expansion: "Glacial-flood Anomaly-detection Network with Geophysical Alerting",
  tagline: "An edge-first early-warning system for sudden floods and glacial lake outburst floods (GLOFs) in Nepal.",
  team: "Team PASS",
  teamMotto: "One for All & All for One",
  program: "APIE Camp #11",
  programFull: "Asia Pacific Internet Engineering (APIE) Camp #11",
  organizer: "SOI Asia (School on Internet Asia)",
  host: "Institute of Engineering, Pulchowk Campus, Tribhuvan University",
  dates: "26–30 October 2026",
  location: "Kathmandu, Nepal",
  disclaimer:
    "Student project from APIE Camp #11. Not an official SOI Asia, APIE or Tribhuvan University site. Flood data is simulated or reconstructed. Not for operational use.",
  photoCredit: "Group photo: APIE Camp #11",
} as const;

export type NavItem = { href: string; label: string; description: string };

export const nav: NavItem[] = [
  { href: "/", label: "Overview", description: "Problem and proof." },
  { href: "/command-center", label: "Command Center", description: "Simulate the Rasuwa flood." },
  { href: "/architecture", label: "Architecture", description: "Edge and cloud design." },
  { href: "/network", label: "Network", description: "Camp network design." },
  { href: "/field", label: "Field & Cost", description: "Sensors, power and cost." },
  { href: "/team", label: "Team", description: "Team PASS and our mentor." },
  { href: "/developers", label: "Developers", description: "Engine API and CAP 1.2 feed." },
];
