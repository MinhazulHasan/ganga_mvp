import type { Metadata } from "next";
import { event, sources } from "@/content/event";
import { site } from "@/content/site";
import { Container } from "@/components/layout/container";
import { Appear } from "./_components/overview/appear";
import { DetailSheetProvider } from "./_components/overview/detail-sheet";
import { getOverviewFacts } from "./_components/overview/facts";
import { Hero } from "./_components/overview/hero";
import { ProofBand } from "./_components/overview/proof-band";
import { EventSection } from "./_components/overview/event-section";
import { HowSection } from "./_components/overview/how-section";
import { FusionSection } from "./_components/overview/fusion-section";
import { ChartSection } from "./_components/overview/chart-section";
import { CampSection } from "./_components/overview/camp-section";
import { TeamSection } from "./_components/overview/team-section";
import { ClosingCta } from "./_components/overview/closing-cta";
import { OverviewCommands } from "./_components/overview/overview-commands";

const facts = getOverviewFacts();

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Warn the valley before the water arrives · ${site.team}, ${site.program}` },
  description: `${site.name} is an edge-first early-warning prototype for floods and GLOFs in Nepal, built by ${site.team} at ${site.program}.${
    facts.firstPublic ? ` In a simulation of the 26 August 2026 Rasuwa flood, residents are warned at ${facts.firstPublic.t}.` : ""
  }`,
};

export default function Page() {
  const lives = event.facts.find((f) => f.label === "Lives lost");
  const livesSource = lives ? sources[lives.source] : undefined;
  const smsFact = event.facts.find((f) => f.label === "First SMS");
  const smsSource = smsFact ? sources[smsFact.source] : sources.deck;

  return (
    <DetailSheetProvider>
      <OverviewCommands />
      <Hero />

      <section id="proof" className="scroll-mt-14 pb-16 pt-14 sm:pb-24 sm:pt-16" aria-labelledby="proof-title">
        <Container>
          <Appear className="mb-8 flex flex-col gap-3 sm:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">The proof</p>
              <h2 id="proof-title" className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[36px]">
                The Rasuwa flood replay.
              </h2>
            </div>
            <p className="text-[13.5px] text-muted">Select a number for the working.</p>
          </Appear>
          <Appear>
            <ProofBand
              facts={facts}
              lives={{
                raw: lives?.value ?? "—",
                detail: lives?.detail ?? "",
                sourceLabel: livesSource?.label ?? "",
                sourceNote: livesSource?.note,
              }}
              smsSource={{ label: smsSource?.label ?? "", note: smsSource?.note }}
            />
          </Appear>
        </Container>
      </section>

      <EventSection facts={facts} />
      <HowSection facts={facts} />
      <FusionSection facts={facts} />
      <ChartSection facts={facts} />
      <CampSection />
      <TeamSection />
      <ClosingCta />
    </DetailSheetProvider>
  );
}
