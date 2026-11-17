import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { Provenance, type ProvenanceKind } from "@/components/brand/provenance";
import { tiers } from "@/content/architecture";
import { Tiers } from "./_components/tiers";
import { DataFlow } from "./_components/data-flow";
import { FusionSteps, RulesAndThresholds, FusionCta } from "./_components/fusion";
import { WhyFusionTable } from "./_components/why-fusion";
import { ResilienceGrid } from "./_components/resilience";

export const metadata = {
  title: "Architecture",
  description: "GANGA senses in the field, decides at the edge, learns in the cloud.",
};

export default function Page() {
  const counts: Record<ProvenanceKind, number> = { built: 0, simulated: 0, planned: 0 };
  tiers.forEach((t) => t.components.forEach((c) => counts[c.provenance]++));
  const kinds: ProvenanceKind[] = ["built", "simulated", "planned"];

  return (
    <>
      <PageHeader
        eyebrow="Architecture"
        title={
          <>
            System <span className="font-serif text-[1.1em] italic font-normal">architecture</span>.
          </>
        }
        meta={
          <>
            <span className="mr-1 text-[13px] text-subtle">Components</span>
            {kinds.map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <Provenance kind={k} size="md" />
                <Badge variant="outline" size="md" className="tabular">{counts[k]}</Badge>
              </span>
            ))}
          </>
        }
      />

      <Section eyebrow="Three tiers" title="Where each part lives">
        <Tiers />
      </Section>

      <Section tone="muted" eyebrow="Data flow" title="From a sensor reading to an alert">
        <DataFlow />
      </Section>

      <Section eyebrow="The fusion engine" title="How the engine decides">
        <FusionSteps />
        <RulesAndThresholds />
        <FusionCta />
      </Section>

      <Section tone="muted" eyebrow="Why fusion" title="Why not one signal?">
        <WhyFusionTable />
      </Section>

      <Section eyebrow="Resilience" title="Resilience and security">
        <ResilienceGrid />
      </Section>
    </>
  );
}
