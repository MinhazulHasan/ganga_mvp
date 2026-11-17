import { aug26, fmtT, runScenario } from "@/lib/engine";

export type WanChannel = { id: string; name: string; short: string; latencyS: number };
export type WanOutcome = {
  scenario: string;
  /** first public warning with the WAN down from T+0, e.g. "T+1:26" */
  firstPublic: string;
  /** true when the WAN-down run warns the public exactly as early as the WAN-up run */
  sameAsUp: boolean;
  local: WanChannel[];
  cloud: WanChannel[];
  reached: { name: string; first: string }[];
  cutOff: string[];
};

/** Runs the GANGA engine twice (WAN up / WAN down from T+0) on the 26 Aug replay. Pure, ~10 ms. */
export function computeWanOutcome(): WanOutcome {
  const up = runScenario(aug26, {});
  const down = runScenario(aug26, { wanDownFromMin: 0 });
  const pick = (c: (typeof down.channels)[number]): WanChannel => ({ id: c.id, name: c.name, short: c.short, latencyS: c.latencyS });
  return {
    scenario: aug26.shortName,
    firstPublic: fmtT(down.summary.firstPublicWarningMin, true),
    sameAsUp: up.summary.firstPublicWarningMin === down.summary.firstPublicWarningMin,
    local: down.channels.filter((c) => c.enabled && !c.needsWan).map(pick),
    cloud: down.channels.filter((c) => c.enabled && c.needsWan).map(pick),
    reached: down.groups.filter((g) => g.firstDeliveryMin != null).map((g) => ({ name: g.name, first: fmtT(g.firstDeliveryMin, true) })),
    cutOff: down.groups.filter((g) => g.blockedAll).map((g) => g.name),
  };
}
