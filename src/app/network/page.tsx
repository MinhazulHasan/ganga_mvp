import type { Metadata } from "next";
import { ArrowDownIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { networkCss } from "./_components/network-css";
import { NetworkStateProvider } from "./_components/network-state";
import { Rise } from "./_components/rise";
import { Topology } from "./_components/topology/topology";
import { VlanPlan } from "./_components/vlan-plan";
import { TrustZones } from "./_components/trust-zones";
import { AsBuilt } from "./_components/as-built";
import { AddressRuleCard, HeaderChips, Ipv6Section, ResilienceGrid, RoutingCard } from "./_components/sections";
import { computeWanOutcome } from "./_components/wan-outcome";

export const metadata: Metadata = {
  title: "Network",
  description:
    "GANGA edge network: four VLANs, OSPF area 0, WAN failover test, IPv6 plan and the APIE Camp #11 build.",
};

export default function NetworkPage() {
  const outcome = computeWanOutcome();

  return (
    <NetworkStateProvider>
      <style href="ganga-network-page" precedence="default">
        {networkCss}
      </style>

      <PageHeader
        eyebrow="Network"
        title={
          <>
            The edge <span className="font-serif text-[1.08em] font-normal italic tracking-[-0.01em]">network.</span>
          </>
        }
        actions={
          <>
            <Button asChild size="lg">
              <a href="#topology">
                Run the WAN test
                <ArrowDownIcon />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#as-built">What we built</a>
            </Button>
          </>
        }
        meta={<HeaderChips />}
      />

      <Section
        id="topology"
        eyebrow="Edge topology"
        title="WAN cut test"
      >
        <Rise>
          <Topology outcome={outcome} />
        </Rise>
      </Section>

      <Section
        id="addressing"
        tone="muted"
        eyebrow="VLANs & addressing"
        title="VLAN plan"
      >
        <Rise>
          <VlanPlan />
        </Rise>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <Rise className="scroll-mt-24">
            <div id="trust-zones" className="h-full scroll-mt-24 [&>*]:h-full">
              <TrustZones />
            </div>
          </Rise>
          <div className="flex flex-col gap-6">
            <Rise delay={0.05}>
              <RoutingCard />
            </Rise>
            <Rise delay={0.1}>
              <AddressRuleCard />
            </Rise>
          </div>
        </div>
      </Section>

      <Section
        id="ipv6"
        eyebrow="IPv6"
        title="IPv6"
      >
        <Ipv6Section />
      </Section>

      <Section
        id="as-built"
        tone="muted"
        eyebrow="Built at APIE Camp #11"
        title="What we built at camp"
      >
        <Rise>
          <AsBuilt />
        </Rise>
      </Section>

      <Section
        id="resilience"
        eyebrow="Resilience & security"
        title="Resilience"
      >
        <ResilienceGrid />
      </Section>
    </NetworkStateProvider>
  );
}
