import { describe, expect, it } from "vitest";
import { aug26, template, runScenario, buildCap, buildMessage, arrivalMinAtKm, frontKmAt, stateAt } from "./index";

describe("flood-front model", () => {
  it("hits the published anchors", () => {
    expect(arrivalMinAtKm(aug26, 22)).toBeCloseTo(7, 5); // Rasuwagadhi 08:44
    expect(arrivalMinAtKm(aug26, 100)).toBeCloseTo(163, 5); // gauge 11:20
    expect(frontKmAt(aug26, 163)).toBeCloseTo(100, 5);
  });
});

describe("fusion engine · 26 Aug", () => {
  const run = runScenario(aug26);

  it("escalates in order and never skips a level", () => {
    const { WATCH, WARNING, EMERGENCY } = run.stateTimes;
    expect(WATCH).toBeDefined();
    expect(WARNING).toBeDefined();
    expect(EMERGENCY).toBeDefined();
    expect(WATCH!).toBeLessThanOrEqual(WARNING!);
    expect(WARNING!).toBeLessThanOrEqual(EMERGENCY!);
    expect(stateAt(run, 0)).toBe("NORMAL");
    expect(stateAt(run, EMERGENCY! + 1)).toBe("EMERGENCY");
  });

  it("warns the public long before the threshold gauge", () => {
    expect(run.summary.firstPublicWarningMin!).toBeLessThan(run.gauge.warnMin!);
    expect(run.summary.villagesWithLead10Ganga).toBeGreaterThan(run.summary.villagesWithLead10Gauge);
  });

  it("uses silence as evidence (R4) and measures wave speed", () => {
    expect(run.evidence.some((e) => e.rule === "R4")).toBe(true);
    expect(run.speedEstimates.length).toBeGreaterThan(0);
  });

  it("vibration alone does not warn the public", () => {
    const watchEv = run.evidence.find((e) => e.kind === "state" && e.state === "WATCH");
    expect(watchEv?.rule).toBe("R1");
  });
});

describe("WAN outage", () => {
  const up = runScenario(aug26);
  const down = runScenario(aug26, { wanDownFromMin: 0 });
  const fixed = runScenario(aug26, { wanDownFromMin: 0, eocGsm: true });

  it("residents are still warned (siren + local GSM need no WAN)", () => {
    expect(down.groups.find((g) => g.id === "residents")?.firstDeliveryMin).not.toBeNull();
    expect(down.summary.firstPublicWarningMin).toBe(up.summary.firstPublicWarningMin);
  });

  it("district EOC and operators get nothing until GSM is added", () => {
    expect(down.groups.find((g) => g.id === "eoc")?.blockedAll).toBe(true);
    expect(down.groups.find((g) => g.id === "hydro")?.blockedAll).toBe(true);
    expect(fixed.groups.find((g) => g.id === "eoc")?.blockedAll).toBe(false);
    expect(fixed.groups.find((g) => g.id === "hydro")?.blockedAll).toBe(false);
  });

  it("blocks only cloud channels", () => {
    for (const d of down.deliveries) {
      const ch = down.channels.find((c) => c.id === d.channel)!;
      expect(d.blocked).toBe(ch.needsWan);
    }
  });
});

describe("gateway fault guard", () => {
  it("does not raise a public alarm when every node goes quiet at once without an anomaly", () => {
    const run = runScenario(template, { gatewayFailAtMin: 0.05, geophoneRangeKm: 0 });
    expect(run.evidence.some((e) => e.rule === "R6")).toBe(true);
    expect(run.stateTimes.WARNING).toBeUndefined();
  });
});

describe("CAP 1.2", () => {
  const run = runScenario(aug26);
  const cap = buildCap(run, "WARNING")!;
  it("has the required elements", () => {
    for (const tag of ["identifier", "sender", "sent", "status", "msgType", "scope", "info", "category", "event", "urgency", "severity", "certainty", "areaDesc"]) {
      expect(cap).toContain(`<${tag}>`);
    }
    expect(cap).toContain('xmlns="urn:oasis:names:tc:emergency:cap:1.2"');
    expect(cap).toContain("<status>Exercise</status>");
    expect(cap).toMatch(/<sent>2026-08-26T\d\d:\d\d:\d\d\+05:45<\/sent>/);
    expect(cap).toContain("<language>ne</language>");
  });
  it("is deterministic", () => {
    expect(buildCap(runScenario(aug26), "WARNING")).toBe(cap);
  });
  it("names a village that has not flooded yet", () => {
    const m = buildMessage(run, "WARNING")!;
    expect(m.village).not.toBeNull();
    expect(m.etaMin!).toBeGreaterThan(0);
  });
});

import { defaultChannels, defaultGroups, groupMessages, renderTemplate } from "./index";

describe("what-if options", () => {
  it("processing delay shifts every delivery", () => {
    const a = runScenario(aug26);
    const b = runScenario(aug26, { procDelayS: 70 });
    expect(b.summary.firstPublicWarningMin! - a.summary.firstPublicWarningMin!).toBeCloseTo(1, 5);
  });
  it("without geophones, WATCH comes from the water, later", () => {
    const a = runScenario(aug26);
    const b = runScenario(aug26, { geophoneRangeKm: 0 });
    expect(b.stateTimes.WATCH!).toBeGreaterThan(a.stateTimes.WATCH!);
  });
  it("a slower heartbeat delays the gateway-fault verdict", () => {
    const fast = runScenario(template, { gatewayFailAtMin: 0.05, geophoneRangeKm: 0, heartbeatS: 30 });
    const slow = runScenario(template, { gatewayFailAtMin: 0.05, geophoneRangeKm: 0, heartbeatS: 240 });
    const t = (r: typeof fast) => r.evidence.find((e) => e.rule === "R6")!.t;
    expect(t(slow)).toBeGreaterThan(t(fast));
  });
  it("flood speed override applies to illustrative scenarios", () => {
    const a = runScenario(template, { floodSpeedMs: 4 });
    const b = runScenario(template, { floodSpeedMs: 16 });
    expect(a.villages[0].arrivalMin).toBeGreaterThan(b.villages[0].arrivalMin);
    expect(a.scenario.durationMin).toBeGreaterThan(b.scenario.durationMin);
  });
});

describe("broadcast editor", () => {
  it("custom latency changes delivery time", () => {
    const channels = defaultChannels().map((c) => (c.id === "siren" ? { ...c, latencyS: 125 } : c));
    const a = runScenario(aug26);
    const b = runScenario(aug26, { channels });
    const d = (r: typeof a) => r.deliveries.find((x) => x.id === "residents-siren")!.deliverMin;
    expect(d(b) - d(a)).toBeCloseTo(2, 5);
  });
  it("a custom group that only uses cloud channels is blocked with the WAN down", () => {
    const groups = [...defaultGroups(), { id: "school", name: "Schools", public: false, trigger: "WARNING" as const, dispatchS: 0, channels: ["email"], language: "English" }];
    const r = runScenario(aug26, { groups, wanDownFromMin: 0 });
    expect(r.groups.find((g) => g.id === "school")?.blockedAll).toBe(true);
  });
  it("renders templates with engine values", () => {
    expect(renderTemplate("{state} at {village} in {eta} min on the {river}", { state: "WARNING", village: "Timure", eta: 20, river: "Trishuli" })).toBe("WARNING at Timure in 20 min on the Trishuli");
    const msgs = groupMessages(runScenario(aug26));
    const res = msgs.find((m) => m.group.id === "residents")!;
    expect(res.text).toContain("WARNING");
    expect(res.village).not.toBeNull();
  });
});
