import { renderTemplate } from "./broadcast";
import { clockAt, predictedArrivalAt } from "./run";
import type { Group, RunResult } from "./types";

const xe = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export type CapState = "WARNING" | "EMERGENCY";

export interface AlertMessage {
  state: CapState;
  issuedMin: number;
  issuedClock: string;
  village: string | null;
  etaMin: number | null;
  en: { headline: string; description: string; instruction: string; sms: string };
  ne: { headline: string; description: string; instruction: string; sms: string };
}

/** The public message the engine issues for a state, in English and Nepali (Nepali: draft, to be checked by a native speaker). */
export function buildMessage(run: RunResult, state: CapState = "WARNING"): AlertMessage | null {
  const t = run.stateTimes[state];
  if (t === undefined) return null;
  const s = run.scenario;
  const issued = t + run.options.procDelayS / 60;
  // nearest village the flood has not reached yet, per the engine's own estimate
  const target = run.villages
    .map((v) => ({ v, eta: predictedArrivalAt(run, v.km, issued) - issued }))
    .filter((x) => x.v.arrivalMin > issued && x.eta > 0)
    .sort((a, b) => a.v.km - b.v.km)[0];
  const village = target?.v.name ?? null;
  const eta = target ? Math.max(1, Math.round(target.eta)) : null;
  const clock = clockAt(s, issued, false);
  const isEm = state === "EMERGENCY";
  const en = {
    headline: isEm ? `Flood emergency: ${s.river} — evacuate now` : `Flash flood warning: ${s.river}`,
    description: village
      ? `GANGA detected a flood wave on the ${s.river} at ${clock}. It is expected to reach ${village} in about ${eta} minutes.`
      : `GANGA detected a flood wave on the ${s.river} at ${clock}.`,
    instruction: "Move to high ground now. Stay away from the river, bridges and riverbanks. Do not return until officials say it is safe.",
    sms: village
      ? `GANGA ${state}: flood wave on the ${s.river}. Expected at ${village} in ~${eta} min. Move to high ground now.`
      : `GANGA ${state}: flood wave on the ${s.river}. Move to high ground now.`,
  };
  const ne = {
    headline: isEm ? "बाढी आपतकाल: तुरुन्तै सुरक्षित स्थानमा जानुहोस्" : "आकस्मिक बाढी चेतावनी: भोटेकोशी / त्रिशूली नदी",
    description: village
      ? `गंगा प्रणालीले ${clock} मा नदीमा बाढीको लहर पत्ता लगाएको छ। ${village} मा करिब ${eta} मिनेटमा पुग्ने अनुमान छ।`
      : `गंगा प्रणालीले ${clock} मा नदीमा बाढीको लहर पत्ता लगाएको छ।`,
    instruction: "तुरुन्तै अग्लो ठाउँमा जानुहोस्। नदी, पुल र किनारबाट टाढा रहनुहोस्।",
    sms: village
      ? `${isEm ? "गंगा आपतकाल" : "गंगा चेतावनी"}: नदीमा बाढी। ${village} मा करिब ${eta} मिनेटमा। तुरुन्तै अग्लो ठाउँमा जानुहोस्।`
      : `${isEm ? "गंगा आपतकाल" : "गंगा चेतावनी"}: नदीमा बाढी। तुरुन्तै अग्लो ठाउँमा जानुहोस्।`,
  };
  return { state, issuedMin: issued, issuedClock: clock, village, etaMin: eta, en, ne };
}

export interface CapInfo {
  language: "en-US" | "ne";
  event: string;
  senderName: string;
  headline: string;
  description: string;
  instruction: string;
}

/** The fields of the CAP 1.2 alert as plain data (what the XML encodes), for display. */
export interface CapFields {
  state: CapState;
  identifier: string;
  sender: string;
  sent: string;
  issuedClock: string;
  date: string;
  utcOffset: string;
  status: "Exercise";
  msgType: "Alert";
  scope: "Public";
  note: string;
  categories: string[];
  responseType: "Evacuate";
  urgency: "Immediate";
  severity: "Extreme";
  certainty: "Observed" | "Likely";
  /** villages the flood has not reached yet when the alert is issued, upstream to downstream */
  areas: string[];
  areaDesc: string;
  village: string | null;
  etaMin: number | null;
  info: CapInfo[];
}

export function capFields(run: RunResult, state: CapState = "WARNING"): CapFields | null {
  const msg = buildMessage(run, state);
  if (!msg) return null;
  const s = run.scenario;
  const sent = `${s.date}T${clockAt(s, msg.issuedMin, true)}${s.utcOffset}`;
  const stamp = sent.slice(0, 19).replace(/[-:T]/g, "");
  const areas = run.villages.filter((v) => v.arrivalMin > msg.issuedMin).map((v) => v.name);
  return {
    state,
    identifier: `GANGA-${s.id.toUpperCase()}-${state}-${stamp}`,
    sender: "ganga@example.org",
    sent,
    issuedClock: msg.issuedClock,
    date: s.date,
    utcOffset: s.utcOffset,
    status: "Exercise",
    msgType: "Alert",
    scope: "Public",
    note: `GANGA prototype · Team PASS · APIE Camp #11 · ${s.kind} scenario, not a real alert`,
    categories: ["Geo", "Met"],
    responseType: "Evacuate",
    urgency: "Immediate",
    severity: "Extreme",
    certainty: state === "EMERGENCY" ? "Observed" : "Likely",
    areas,
    areaDesc: areas.join(", ") || s.region,
    village: msg.village,
    etaMin: msg.etaMin,
    info: [
      { language: "en-US", event: "Glacial flood / debris flow", senderName: "GANGA flood early warning (prototype)", ...pick(msg.en) },
      { language: "ne", event: "हिमताल / हिमनदी बाढी", senderName: "गंगा बाढी पूर्वसूचना (प्रोटोटाइप)", ...pick(msg.ne) },
    ],
  };
}

const pick = (m: AlertMessage["en"]) => ({ headline: m.headline, description: m.description, instruction: m.instruction });

/** CAP 1.2 (OASIS) alert for the given state. Deterministic: same run → same XML. */
export function buildCap(run: RunResult, state: CapState = "WARNING"): string | null {
  const f = capFields(run, state);
  if (!f) return null;
  const info = (i: CapInfo) => `  <info>
    <language>${i.language}</language>
${f.categories.map((c) => `    <category>${c}</category>`).join("\n")}
    <event>${xe(i.event)}</event>
    <responseType>${f.responseType}</responseType>
    <urgency>${f.urgency}</urgency>
    <severity>${f.severity}</severity>
    <certainty>${f.certainty}</certainty>
    <senderName>${xe(i.senderName)}</senderName>
    <headline>${xe(i.headline)}</headline>
    <description>${xe(i.description)}</description>
    <instruction>${xe(i.instruction)}</instruction>
    <parameter>
      <valueName>GANGA_STATE</valueName>
      <value>${f.state}</value>
    </parameter>
    <area>
      <areaDesc>${xe(f.areaDesc)}</areaDesc>
    </area>
  </info>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${f.identifier}</identifier>
  <sender>${f.sender}</sender>
  <sent>${f.sent}</sent>
  <status>${f.status}</status>
  <msgType>${f.msgType}</msgType>
  <scope>${f.scope}</scope>
  <note>${xe(f.note)}</note>
${f.info.map(info).join("\n")}
</alert>
`;
}

export interface GroupMessage {
  group: Group;
  /** minute the group's message leaves the edge (null if its trigger state was never reached) */
  sendMin: number | null;
  village: string | null;
  etaMin: number | null;
  text: string;
}

/** Each group's message, rendered from its template with what the engine knew at send time. */
export function groupMessages(run: RunResult): GroupMessage[] {
  const s = run.scenario;
  return run.groupConfig.map((g) => {
    const st = run.stateTimes[g.trigger];
    const sendMin = st === undefined ? null : st + run.options.procDelayS / 60 + g.dispatchS / 60;
    const at = sendMin ?? 0;
    const target = run.villages
      .map((v) => ({ v, eta: predictedArrivalAt(run, v.km, at) - at }))
      .filter((x) => x.v.arrivalMin > at && x.eta > 0)
      .sort((a, b) => a.v.km - b.v.km)[0];
    const eta = target ? Math.max(1, Math.round(target.eta)) : null;
    const text = renderTemplate(g.template ?? "{state}: flood alert on the {river}.", {
      state: g.trigger,
      village: target?.v.name ?? "your area",
      eta: eta ?? "—",
      river: s.river,
    });
    return { group: g, sendMin, village: target?.v.name ?? null, etaMin: eta, text };
  });
}
