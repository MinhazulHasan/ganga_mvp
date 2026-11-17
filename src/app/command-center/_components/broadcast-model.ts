import { defaultChannels, defaultGroups, type Channel, type ChannelId, type Group, type GroupId } from "@/lib/engine";

/*
 * Broadcast configuration edited in the broadcast editor: channels and recipient groups.
 * The team model (Andrrew's simulator) is the default; the local-SMS fix is applied on top by the engine.
 */

export interface BroadcastConfig {
  channels: Channel[];
  groups: Group[];
}

/** The team defaults. Shared and never mutated: edits always build new arrays. */
export const TEAM_BROADCAST: BroadcastConfig = Object.freeze({ channels: defaultChannels(), groups: defaultGroups(false) });

const TEAM_CHANNEL: Record<string, Channel> = Object.fromEntries(TEAM_BROADCAST.channels.map((c) => [c.id, c]));
const TEAM_GROUP: Record<string, Group> = Object.fromEntries(TEAM_BROADCAST.groups.map((g) => [g.id, g]));

export const isTeamChannel = (id: ChannelId) => id in TEAM_CHANNEL;
export const isTeamGroup = (id: GroupId) => id in TEAM_GROUP;

/** Groups the local-SMS fix switch adds GSM SMS to (see applyEocGsm). */
export const FIX_GROUPS: readonly GroupId[] = ["eoc", "hydro"];

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

function sameChannel(a: Channel, b: Channel) {
  return a.id === b.id && a.name === b.name && a.short === b.short && a.latencyS === b.latencyS && a.needsWan === b.needsWan && a.enabled === b.enabled;
}

function sameGroup(a: Group, b: Group) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.public === b.public &&
    a.trigger === b.trigger &&
    a.dispatchS === b.dispatchS &&
    a.language === b.language &&
    (a.template ?? "") === (b.template ?? "") &&
    sameSet(a.channels, b.channels)
  );
}

export function isTeamBroadcast(b: BroadcastConfig): boolean {
  if (b === TEAM_BROADCAST) return true;
  const t = TEAM_BROADCAST;
  return (
    b.channels.length === t.channels.length &&
    b.groups.length === t.groups.length &&
    b.channels.every((c, i) => sameChannel(c, t.channels[i])) &&
    b.groups.every((g, i) => sameGroup(g, t.groups[i]))
  );
}

/** Short label used on the Gantt rows: the team's short name while a team channel keeps its name. */
export function shortFor(id: ChannelId, name: string): string {
  const team = TEAM_CHANNEL[id];
  return team && team.name === name ? team.short : name;
}

/** Short label inside a sentence: team labels in lower case ("siren first"), custom names as typed. */
export function inlineShort(c: Channel): string {
  return TEAM_CHANNEL[c.id]?.short === c.short ? c.short.toLowerCase() : c.short;
}

/** Next free id like custom_3. */
export function nextId(prefix: string, taken: readonly string[]): string {
  let n = 1;
  while (taken.includes(`${prefix}_${n}`)) n++;
  return `${prefix}_${n}`;
}

export function nextName(base: string, taken: readonly string[]): string {
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/** Keep a group's channels in a stable order: the team order for team groups, then the channel list order. */
export function orderChannels(groupId: GroupId, ids: ChannelId[], channels: Channel[]): ChannelId[] {
  const pref = TEAM_GROUP[groupId]?.channels ?? [];
  const rank = (id: ChannelId) => {
    const p = pref.indexOf(id);
    if (p >= 0) return p;
    const i = channels.findIndex((c) => c.id === id);
    return 100 + (i >= 0 ? i : 99);
  };
  return [...new Set(ids)].sort((a, b) => rank(a) - rank(b));
}

export const PLACEHOLDERS = ["{state}", "{village}", "{eta}", "{river}"] as const;

/** Placeholders in a template that the engine does not fill (they are sent as typed). */
export function unknownPlaceholders(template: string): string[] {
  const found = template.match(/\{[^{}\s]*\}/g) ?? [];
  return [...new Set(found.filter((p) => !(PLACEHOLDERS as readonly string[]).includes(p)))];
}

/** The engine's own fallback template — used for new groups, so nothing here is invented. */
export const NEW_GROUP_TEMPLATE = "{state}: flood alert on the {river}.";

export const MAX_SECONDS = 3600;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseName(raw: string): Parsed<string> {
  const v = raw.trim();
  if (!v) return { ok: false, error: "Name can't be empty." };
  if (v.length > 60) return { ok: false, error: "Keep it under 60 characters." };
  return { ok: true, value: v };
}

export function parseSeconds(raw: string): Parsed<number> {
  const v = raw.trim();
  if (!v) return { ok: false, error: "Enter a number of seconds." };
  const n = Number(v);
  if (!Number.isFinite(n)) return { ok: false, error: "Enter a number of seconds." };
  if (n < 0) return { ok: false, error: "Must be 0 s or more." };
  if (n > MAX_SECONDS) return { ok: false, error: `Up to ${MAX_SECONDS} s.` };
  return { ok: true, value: Math.round(n * 10) / 10 };
}

export function parseTemplate(raw: string): Parsed<string> {
  if (!raw.trim()) return { ok: false, error: "The message can't be empty." };
  if (raw.length > 480) return { ok: false, error: "Keep it under 480 characters." };
  return { ok: true, value: raw };
}
