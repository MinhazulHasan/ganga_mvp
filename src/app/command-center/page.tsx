import type { Metadata } from "next";
import { buildCap, runScenario, scenarioList, type CapState } from "@/lib/engine";
import { highlight } from "@/lib/highlight";
import { CommandCenter } from "./_components/command-center";
import type { CapBundle } from "./_components/alert-output";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Replay the 26 August 2026 Bhote Koshi flash flood through the GANGA edge engine.",
};

const CAP_STATES: CapState[] = ["WARNING", "EMERGENCY"];

/** CAP 1.2 for each scenario × state, highlighted on the server (the CAP does not depend on WAN or the SMS fix). */
async function buildCaps(): Promise<CapBundle> {
  const entries = await Promise.all(
    scenarioList.map(async (s) => {
      const run = runScenario(s);
      const byState = await Promise.all(
        CAP_STATES.map(async (state) => {
          const xml = buildCap(run, state);
          return [state, xml ? { xml, html: await highlight(xml, "xml") } : null] as const;
        })
      );
      return [s.id, Object.fromEntries(byState)] as const;
    })
  );
  return Object.fromEntries(entries) as CapBundle;
}

export default async function Page() {
  const caps = await buildCaps();
  return <CommandCenter caps={caps} />;
}
