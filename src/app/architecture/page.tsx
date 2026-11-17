import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Badge } from "@/components/ui/badge";
import { Provenance, type ProvenanceKind } from "@/components/brand/provenance";
import { DetailSheetProvider } from "@/app/_components/overview/detail-sheet";
import { archNav, archParts } from "@/content/rtu";
import { RtuBrain } from "./_components/rtu-brain";
import { Coverage } from "./_components/coverage";
import { Failover } from "./_components/failover";
import { PowerPath } from "./_components/power";
import { Valley } from "./_components/valley";
import { FusionSteps, RulesAndThresholds, FusionCta } from "./_components/fusion";

export const metadata = {
  title: "Architecture",
  description: "RTUs with wired sensors, LoRa with VHF fallback, and a valley station that warns without the internet.",
};

const KINDS: ProvenanceKind[] = ["built", "simulated", "planned"];

export default function Page() {
  const counts: Record<ProvenanceKind, number> = { built: 0, simulated: 0, planned: 0 };
  archParts.forEach((p) => counts[p.provenance]++);

  return (
    <DetailSheetProvider>
      <PageHeader
        eyebrow="Architecture"
        title={
          <>
            RTU and telemetry <span className="font-serif text-[1.1em] font-normal italic">architecture</span>.
          </>
        }
        description="From a wired sensor at the lake to a siren in the valley."
        meta={
          <div className="flex w-full flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[13px] text-subtle">Parts</span>
              {KINDS.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <Provenance kind={k} size="md" />
                  <Badge variant="outline" size="md" className="tabular">
                    {counts[k]}
                  </Badge>
                </span>
              ))}
            </div>
            <nav aria-label="On this page" className="flex flex-wrap gap-2">
              {archNav.map((n) => (
                <a
                  key={n.id}
                  href={`#${n.id}`}
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium shadow-soft outline-none transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/60"
                >
                  <span className="tabular text-[11.5px] font-semibold text-subtle">{n.n}</span>
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        }
      />

      <Section id="rtu" className="scroll-mt-16" eyebrow="01 · Local brain" title="RTU and field sensors">
        <RtuBrain />
      </Section>

      <Section id="coverage" className="scroll-mt-16" tone="muted" eyebrow="02 · Coverage" title="How many RTUs?">
        <Coverage />
      </Section>

      <Section id="radio" className="scroll-mt-16" eyebrow="03 · Radio" title="Wireless link and failover">
        <Failover />
      </Section>

      <Section id="power" className="scroll-mt-16" tone="muted" eyebrow="04 · Power" title="Power and battery survival">
        <PowerPath />
      </Section>

      <Section id="valley" className="scroll-mt-16" eyebrow="05 · Backhaul" title="Reaching the valley and the server">
        <Valley />
      </Section>

      <Section id="engine" className="scroll-mt-16" tone="muted" eyebrow="06 · Inside the valley station" title="How the engine decides">
        <FusionSteps />
        <RulesAndThresholds />
        <FusionCta />
      </Section>
    </DetailSheetProvider>
  );
}
