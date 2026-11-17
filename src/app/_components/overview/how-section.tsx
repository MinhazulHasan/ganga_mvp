import { ChevronRightIcon } from "lucide-react";
import { architectureLine, fusionSteps, tiers, type TierComponent } from "@/content/architecture";
import { iosLog } from "@/content/network";
import { Section } from "@/components/layout/section";
import { Appear } from "./appear";
import { Provenance } from "@/components/brand/provenance";
import { DetailTrigger, type Detail } from "./detail-sheet";
import { DataFlow, type FlowDetails } from "./data-flow";
import type { OverviewFacts } from "./facts";

function find(tierId: "field" | "edge" | "cloud", startsWith: string): TierComponent | undefined {
  return tiers.find((t) => t.id === tierId)?.components.find((c) => c.name.startsWith(startsWith));
}

function componentDetail(tierId: "field" | "edge" | "cloud", c: TierComponent): Detail {
  const tier = tiers.find((t) => t.id === tierId);
  return {
    eyebrow: tier ? `${tier.verb} · ${tier.label}` : undefined,
    title: c.name,
    description: c.detail,
    provenance: c.provenance,
    note: c.note,
  };
}

export function HowSection({ facts }: { facts: OverviewFacts }) {
  const lead = architectureLine.split(" — ")[0].replace(/\.$/, "");
  const ch = (id: string) => facts.channels.find((c) => c.id === id);
  const wanChannels = facts.channels.filter((c) => c.needsWan).map((c) => c.name);

  const channelDetail = (id: string, extra: Partial<Detail> = {}): Detail & { provenance: "simulated" | "built" | "planned" } => {
    const c = ch(id);
    return {
      eyebrow: c?.needsWan ? "Cloud path · alert channel" : "Local path · alert channel",
      title: c?.name ?? id,
      provenance: "simulated",
      rows: c
        ? [
            { label: "Send to arrival", value: `${c.latencyS} s` },
            { label: "Needs the internet", value: c.needsWan ? "Yes, blocked if WAN is down" : "No, works with WAN down" },
          ]
        : undefined,
      note: "Modelled (Team PASS broadcast model). Latencies are planning values.",
      ...extra,
    };
  };

  const pick = (tierId: "field" | "edge" | "cloud", name: string, fallback: Detail["provenance"] = "planned") => {
    const c = find(tierId, name);
    return c ? { ...componentDetail(tierId, c), provenance: c.provenance } : { title: name, provenance: fallback ?? "planned" };
  };

  const sensors = pick("field", "Sensor nodes");
  const heartbeat = find("field", "Heartbeat");
  const fusion = pick("edge", "GANGA fusion engine", "built");
  const llm = pick("cloud", "LLM", "built");
  const smsMail = find("cloud", "SMS / e-mail");

  const details: FlowDetails = {
    sensors: {
      ...sensors,
      rowsTitle: "In the Rasuwa flood replay",
      rows: [
        { label: "Nodes on the river", value: facts.scenario.nodesKm.map((k) => `${k} km`).join(" · ") },
        { label: "Heartbeat", value: `every ${facts.scenario.heartbeatS} s` },
        { label: "During an event", value: `a reading every ${facts.rules.burstS} s` },
      ],
      paragraphs: heartbeat ? [heartbeat.detail] : undefined,
    },
    lora: pick("field", "LoRa radio"),
    gateway: pick("field", "LoRa gateway"),
    broker: pick("edge", "MQTT broker"),
    fusion: {
      ...fusion,
      list: {
        title: "Four steps on the edge",
        items: fusionSteps.map((s) => ({ lead: `0${s.step}`, text: s.name, sub: s.detail })),
      },
      links: [{ href: "#fusion-engine", label: "How it decides" }],
    },
    wan: {
      eyebrow: "Edge → cloud link",
      title: "WAN uplink",
      description: "Camp network link to the internet. The alert decision does not depend on it.",
      provenance: "simulated",
      rows: [{ label: "Channels that need it", value: wanChannels.join(" · ") }],
      list: {
        title: "WAN cut in Cisco Packet Tracer",
        items: iosLog.cut.map((line) => ({ text: line })),
      },
      note: iosLog.ospfNote,
    },
    siren: channelDetail("siren"),
    gsm: channelDetail("sms_gsm"),
    sns: channelDetail("sms_sns", smsMail ? { description: smsMail.detail } : {}),
    email: channelDetail("email"),
    llm: { ...llm, eyebrow: "Learn · Cloud" },
  };

  return (
    <Section
      id="how-it-works"
      className="scroll-mt-14"
      eyebrow="How GANGA works"
      title={`${lead}.`}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <Appear key={tier.id} delay={i * 0.05} className="h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-surface shadow-card">
              <div className="px-6 pb-5 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[12px] text-subtle">0{i + 1}</span>
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{tier.label}</span>
                </div>
                <h3 className="mt-5 text-[30px] font-semibold leading-none tracking-[-0.035em]">{tier.verb}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{tier.summary}</p>
              </div>
              <ul className="mt-auto border-t border-border">
                {tier.components.map((c, j) => (
                  <li key={c.name} className={j > 0 ? "border-t border-border" : undefined}>
                    <DetailTrigger
                      detail={componentDetail(tier.id, c)}
                      className="group flex w-full items-center gap-3 px-6 py-3.5 transition-colors duration-200 hover:bg-surface-2/60 focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium leading-snug">{c.name}</span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-muted">{c.detail}</span>
                      </span>
                      <Provenance kind={c.provenance} />
                      <ChevronRightIcon className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </DetailTrigger>
                  </li>
                ))}
              </ul>
            </article>
          </Appear>
        ))}
      </div>

      <Appear className="mt-6">
        <DataFlow facts={facts} details={details} />
      </Appear>
    </Section>
  );
}
