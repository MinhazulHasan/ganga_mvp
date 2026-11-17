import { clockAt, fmtT, type Scenario } from "@/lib/engine";

/** "08:38:26" */
export const clock = (s: Scenario, min: number) => clockAt(s, min, true);

/** "T+1:26" — always with seconds, same style as the engine's evidence strings. */
export const tplus = (min: number) => fmtT(min, true);

/** Time remaining in plain words: "40 s", "24 min", "1 h 26 min". */
export function fmtDuration(min: number): string {
  const secs = Math.max(0, Math.round(min * 60));
  if (secs < 60) return `${secs} s`;
  const mins = Math.round(min);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Compact countdown for tight labels: "40 s", "21 min", "1 h 05". */
export function fmtDurationShort(min: number): string {
  const secs = Math.max(0, Math.round(min * 60));
  if (secs < 60) return `${secs} s`;
  const mins = Math.round(min);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")}`;
}

/** Lead time, one decimal, as in the team's numbers: "25.6 min". */
export function fmtLead(min: number | null | undefined): string {
  return min == null ? "none" : `${min.toFixed(1)} min`;
}

/** "Rasuwagadhi / Gyirong Port" → "Rasuwagadhi" for tight labels. */
export function shortName(name: string): string {
  return name.split(" / ")[0];
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Square-root time scale for the scrubber: the first minutes (where the decisions happen) get room. */
export const toPos = (t: number, duration: number) => Math.sqrt(clamp(t / duration, 0, 1));
export const fromPos = (p: number, duration: number) => clamp(p, 0, 1) ** 2 * duration;

/** Parse "5", "5.5", "5:02" or "1:05:30" (minutes after the trigger). */
export function parseTimeParam(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes(":")) {
    const parts = v.split(":").map(Number);
    if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
    if (parts.length === 2) return parts[0] + parts[1] / 60;
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€\f";

/** SMS segment count with the standard GSM-7 (160/153 septets) and UCS-2 (70/67 units) limits. */
export function smsParts(text: string): { chars: number; encoding: "GSM-7" | "UCS-2"; parts: number } {
  const chars = [...text].length;
  let septets = 0;
  for (const ch of text) {
    if (GSM7_BASIC.includes(ch)) septets += 1;
    else if (GSM7_EXT.includes(ch)) septets += 2;
    else {
      const units = text.length; // UTF-16 code units
      return { chars, encoding: "UCS-2", parts: units <= 70 ? 1 : Math.ceil(units / 67) };
    }
  }
  return { chars, encoding: "GSM-7", parts: septets <= 160 ? 1 : Math.ceil(septets / 153) };
}
