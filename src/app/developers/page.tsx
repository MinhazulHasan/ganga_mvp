import type { Metadata } from "next";
import { FlaskConicalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { endpoints } from "@/content/developers";
import { aug26, buildCap, capFields, RULES, RULE_TEXT, runScenario, type CapFields, type CapState } from "@/lib/engine";
import { highlight } from "@/lib/highlight";
import { CapShowcase } from "@/components/cap/cap-card";
import { EndpointCard } from "./_components/endpoint-card";

export const metadata: Metadata = {
  title: "Developers",
  description: "The GANGA engine API and CAP 1.2 alert feed.",
};

const THRESHOLDS: { key: keyof typeof RULES; unit: string; meaning: string }[] = [
  { key: "vibMmS", unit: "mm/s", meaning: "Anomalous ground vibration" },
  { key: "riseCmMin", unit: "cm/min", meaning: "Anomalous water rise rate" },
  { key: "burstS", unit: "s", meaning: "Report interval in event mode" },
  { key: "missedBursts", unit: "bursts", meaning: "Missed bursts before an RTU is silent" },
  { key: "missedHeartbeats", unit: "heartbeats", meaning: "Missed heartbeats before an RTU is silent" },
  { key: "gatewayWindowS", unit: "s", meaning: "RTUs silent within this window mean a receiver fault" },
  { key: "priorSpeedMs", unit: "m/s", meaning: "Worst-case flood speed until two RTUs die" },
  { key: "minSpeedMs", unit: "m/s", meaning: "Minimum flood speed estimate" },
  { key: "maxSpeedMs", unit: "m/s", meaning: "Maximum flood speed estimate" },
];

export default async function DevelopersPage() {
  const run = runScenario(aug26);
  const capVariants: Partial<Record<CapState, { fields: CapFields; xml: string; html: string }>> = {};
  for (const st of ["WARNING", "EMERGENCY"] as const) {
    const fields = capFields(run, st);
    const xml = buildCap(run, st);
    if (fields && xml) capVariants[st] = { fields, xml, html: await highlight(xml, "xml") };
  }

  return (
    <>
      <PageHeader
        eyebrow="Developers"
        title="Engine API & CAP 1.2 feed"
        meta={
          <>
            {[
              ["#endpoints", "Endpoints"],
              ["#cap", "CAP 1.2"],
              ["#rules", "Rules"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="inline-flex h-8 items-center rounded-full bg-surface px-3.5 text-[13px] font-medium text-muted outline-none transition-colors hairline hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
              >
                {label}
              </a>
            ))}
          </>
        }
      />

      <Section
        id="endpoints"
        eyebrow="Endpoints"
        title="Three GET endpoints"
        description="Unknown values fall back to defaults."
        className="scroll-mt-16"
      >
        <div className="flex flex-col gap-6">
          {endpoints.map((e, i) => (
            <Reveal key={e.path} delay={i * 0.05}>
              <EndpointCard endpoint={e} />
            </Reveal>
          ))}
        </div>
      </Section>

      <Section
        id="cap"
        tone="muted"
        eyebrow="CAP 1.2"
        title="The alert the engine issues"
        description="Rasuwa flood scenario. Raw XML under View XML."
        actions={<Badge variant="simulated" size="lg"><FlaskConicalIcon aria-hidden />Exercise message</Badge>}
        className="scroll-mt-16"
      >
        <Reveal>
          <CapShowcase variants={capVariants} />
        </Reveal>
      </Section>

      <Section
        id="rules"
        eyebrow="Rules & thresholds"
        title="Seven rules decide the state"
        description="Fixed order. No model involved."
        className="scroll-mt-16"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full p-2">
              <ul className="flex flex-col">
                {Object.entries(RULE_TEXT).map(([id, text], i) => {
                  const label = text.split(" · ").slice(1).join(" · ");
                  return (
                    <li key={id} className={`flex items-start gap-3.5 px-4 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}>
                      <Badge variant="neutral" size="md" className="mt-0.5 w-8 justify-center font-mono">{id}</Badge>
                      <span className="text-[15px] leading-relaxed">{label}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </Reveal>
          <Reveal delay={0.05}>
            <Card className="h-full p-2">
              <div className="px-3">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Threshold</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Meaning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {THRESHOLDS.map((t) => (
                      <TableRow key={t.key}>
                        <TableCell className="align-top font-mono text-xs font-medium">{t.key}</TableCell>
                        <TableCell className="whitespace-nowrap text-right align-top font-mono text-xs tabular">
                          {RULES[t.key]} <span className="text-subtle">{t.unit}</span>
                        </TableCell>
                        <TableCell className="min-w-[180px] align-top text-[13px] leading-relaxed text-muted">{t.meaning}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="px-4 pb-3 pt-1 text-[13px] text-muted">Placeholders until a pilot season calibrates them.</p>
            </Card>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
