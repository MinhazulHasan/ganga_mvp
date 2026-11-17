import type { Channel, Group } from "./types";

/** Templates from the Team PASS simulator. Placeholders: {state} {village} {eta} {river} */
export const DEFAULT_TEMPLATES = {
  residents: "{state}: glacial flood detected on the {river}. Expected at {village} in about {eta} min. Move to high ground now.",
  ward: "{state}: abnormal rise and ground vibration on the {river}. Prepare to activate local response.",
  eoc: "{state}: GANGA fusion alert on the {river}. First arrival at {village} in about {eta} min.",
  hydro: "{state}: flood wave moving down the {river}. Halt work in the channel and evacuate.",
} as const;

/** Broadcast model from the Team PASS simulator (Andrrew). Latency = send → arrival on the device or siren. */
export function defaultChannels(): Channel[] {
  return [
    { id: "siren", name: "Village siren (LoRa trigger)", short: "Siren", latencyS: 5, needsWan: false, enabled: true },
    { id: "sms_gsm", name: "SMS via local GSM modem", short: "Local SMS", latencyS: 45, needsWan: false, enabled: true },
    { id: "cellbc", name: "Cell broadcast (operator)", short: "Cell broadcast", latencyS: 30, needsWan: true, enabled: true },
    { id: "sms_sns", name: "SMS via cloud (AWS SNS)", short: "Cloud SMS", latencyS: 60, needsWan: true, enabled: true },
    { id: "radio", name: "FM radio interrupt", short: "FM radio", latencyS: 120, needsWan: true, enabled: false },
    { id: "email", name: "E-mail", short: "E-mail", latencyS: 90, needsWan: true, enabled: true },
  ];
}

export function defaultGroups(eocGsm = false): Group[] {
  return [
    { id: "residents", name: "Residents downstream", public: true, trigger: "WARNING", dispatchS: 0, channels: ["siren", "cellbc", "sms_gsm"], language: "Nepali + English", template: DEFAULT_TEMPLATES.residents },
    { id: "ward", name: "Ward and municipal officers", public: false, trigger: "WATCH", dispatchS: 0, channels: ["sms_gsm", "sms_sns", "email"], language: "English", template: DEFAULT_TEMPLATES.ward },
    {
      id: "eoc",
      name: "District emergency operations centre",
      public: false,
      trigger: "WATCH",
      dispatchS: 0,
      channels: eocGsm ? ["sms_gsm", "sms_sns", "email"] : ["sms_sns", "email"],
      language: "English",
      template: DEFAULT_TEMPLATES.eoc,
    },
    {
      id: "hydro",
      name: "Hydropower and road operators",
      public: false,
      trigger: "WARNING",
      dispatchS: 30,
      channels: eocGsm ? ["sms_gsm", "sms_sns", "email"] : ["sms_sns", "email"],
      language: "English",
      template: DEFAULT_TEMPLATES.hydro,
    },
  ];
}

/** The fix found in the replay: give the district EOC and operators the local GSM SMS path (no WAN needed). */
export function applyEocGsm(groups: Group[]): Group[] {
  return groups.map((g) =>
    (g.id === "eoc" || g.id === "hydro") && !g.channels.includes("sms_gsm") ? { ...g, channels: ["sms_gsm", ...g.channels] } : g
  );
}

/** Fill a message template. Unknown placeholders are left as they are. */
export function renderTemplate(template: string, vars: { state: string; village: string; eta: string | number; river: string }): string {
  return template
    .replace(/\{state\}/g, vars.state)
    .replace(/\{village\}/g, vars.village)
    .replace(/\{eta\}/g, String(vars.eta))
    .replace(/\{river\}/g, vars.river);
}
