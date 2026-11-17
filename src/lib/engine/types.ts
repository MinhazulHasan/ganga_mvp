import type { AlertState } from "@/lib/alert-state";

export type ScenarioId = "aug26" | "template";

export interface Village {
  id: string;
  name: string;
  km: number;
  note?: string;
}

export interface ArrivalAnchor {
  km: number;
  /** minutes after the trigger */
  min: number;
  label: string;
  source?: string;
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  shortName: string;
  river: string;
  region: string;
  /** Local clock time of the trigger, e.g. "08:37" */
  triggerClock: string;
  /** ISO date of the event (local), used for CAP timestamps */
  date: string;
  /** UTC offset of local time, e.g. "+05:45" */
  utcOffset: string;
  kind: "reconstructed" | "illustrative";
  description: string;
  /** RTU positions (km from the source), upstream first: lake, gorge, confluence. */
  nodesKm: number[];
  villages: Village[];
  gaugeKm: number;
  /** Piecewise-linear flood-front profile. First anchor must be km 0, min 0. */
  arrival: ArrivalAnchor[];
  heartbeatS: number;
  /** Nodes within this distance of the source feel the ground vibration of the collapse. */
  geophoneRangeKm: number;
  /** Seconds of rising water a node sees before the front reaches it. */
  rampS: number;
  /** Engine processing delay before an alert leaves the edge, seconds. */
  procDelayS: number;
  durationMin: number;
  /** Real-world comparison, if any (e.g. first SMS +38 min). */
  realFirstSmsMin?: number;
  assumptions: string[];
}

export type KnownChannelId = "siren" | "sms_gsm" | "cellbc" | "sms_sns" | "radio" | "email";
/** Known ids plus custom channels added in the broadcast editor. */
export type ChannelId = KnownChannelId | (string & {});

export interface Channel {
  id: ChannelId;
  name: string;
  short: string;
  latencyS: number;
  needsWan: boolean;
  enabled: boolean;
}

export type KnownGroupId = "residents" | "ward" | "eoc" | "hydro";
/** Known ids plus custom groups added in the broadcast editor. */
export type GroupId = KnownGroupId | (string & {});

export interface Group {
  id: GroupId;
  name: string;
  public: boolean;
  trigger: Exclude<AlertState, "NORMAL">;
  dispatchS: number;
  channels: ChannelId[];
  language: string;
  /** Message template. Placeholders: {state} {village} {eta} {river} */
  template?: string;
}

export interface RunOptions {
  /** Quiet-node reporting interval, seconds (what-if). */
  heartbeatS?: number;
  /** Engine processing delay before an alert leaves the edge, seconds (what-if). */
  procDelayS?: number;
  /**
   * Constant flood-front speed in m/s. Replaces the scenario's arrival anchors.
   * Use only for illustrative scenarios — the 26 Aug replay is anchored on published timings.
   */
  floodSpeedMs?: number | null;
  /** Custom broadcast configuration (broadcast editor). Defaults to the team model. */
  channels?: Channel[];
  groups?: Group[];
  /** Minute (after trigger) at which the WAN uplink goes down. null/undefined = WAN up. */
  wanDownFromMin?: number | null;
  /** Apply the fix: add local GSM SMS to the EOC and operator groups. */
  eocGsm?: boolean;
  geophoneRangeKm?: number;
}

export interface Reading {
  /** minutes after trigger */
  t: number;
  /** water level above normal, cm */
  level: number;
  /** rate of rise, cm/min */
  rate: number;
  /** ground vibration, mm/s */
  vib: number;
}

export type RtuRole = "lake" | "gorge" | "confluence";

export interface NodeTrack {
  /** "RTU1", "RTU2", … upstream first */
  id: string;
  label: string;
  role: RtuRole;
  /** e.g. "Lake RTU" */
  name: string;
  /** Needs a mountain signal booster to reach the valley station (no line of sight). */
  booster: boolean;
  km: number;
  /** minute the flood front reaches the node (node destroyed) */
  hitMin: number;
  risingFromMin: number;
  shakingFromMin: number | null;
  /** minute the engine concluded the node is silent */
  silenceDetectedMin: number | null;
  readings: Reading[];
}

export type EvidenceKind = "vibration" | "rise" | "silence" | "corroboration" | "state" | "speed" | "gateway" | "info";

export interface Evidence {
  id: string;
  t: number;
  kind: EvidenceKind;
  node?: string;
  rule: string;
  title: string;
  detail: string;
  values?: string[];
  state?: AlertState;
}

export interface SpeedEstimate {
  t: number;
  ms: number;
  basis: string;
}

export interface Delivery {
  id: string;
  group: GroupId;
  groupName: string;
  channel: ChannelId;
  channelName: string;
  trigger: Exclude<AlertState, "NORMAL">;
  sendMin: number;
  deliverMin: number;
  blocked: boolean;
  reason?: string;
}

export interface VillageResult extends Village {
  arrivalMin: number;
  /** first public message delivered (GANGA) */
  gangaWarnMin: number | null;
  /** first public message delivered if only the threshold gauge existed */
  gaugeWarnMin: number | null;
  leadGangaMin: number | null;
  leadGaugeMin: number | null;
  /** ETA the engine predicted when the first warning went out */
  predictedArrivalMin: number | null;
}

export interface GroupSummary {
  id: GroupId;
  name: string;
  firstDeliveryMin: number | null;
  blockedAll: boolean;
  channels: ChannelId[];
}

export interface RunResult {
  scenario: Scenario;
  options: Required<Pick<RunOptions, "heartbeatS" | "eocGsm" | "geophoneRangeKm" | "procDelayS">> & {
    wanDownFromMin: number | null;
    floodSpeedMs: number | null;
  };
  /** The groups actually used for this run (after the EOC fix is applied). */
  groupConfig: Group[];
  stateTimes: Partial<Record<Exclude<AlertState, "NORMAL">, number>>;
  nodes: NodeTrack[];
  evidence: Evidence[];
  speedEstimates: SpeedEstimate[];
  /** nodes the engine concluded were destroyed: km, last-heard minute, detection minute */
  deaths: { node: string; km: number; deathMin: number; detectedMin: number }[];
  villages: VillageResult[];
  gauge: { km: number; crossMin: number; warnMin: number | null };
  deliveries: Delivery[];
  groups: GroupSummary[];
  channels: Channel[];
  findings: string[];
  summary: {
    firstPublicWarningMin: number | null;
    firstGaugeWarningMin: number | null;
    villagesWithLead10Ganga: number;
    villagesWithLead10Gauge: number;
    villageCount: number;
    realFirstSmsMin: number | null;
  };
}
