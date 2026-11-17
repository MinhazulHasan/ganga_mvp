import { gaugeReplay } from "@/content/event";
import { Section } from "@/components/layout/section";
import { Appear } from "./appear";
import { ProofChart } from "./proof-chart";
import { fmtDuration, minutesAfterTrigger, type OverviewFacts } from "./facts";

export function ChartSection({ facts }: { facts: OverviewFacts }) {
  const points = gaugeReplay.points.map((p) => ({ clock: p.time, min: minutesAfterTrigger(p.time), level: p.levelM }));
  const crossingPoint = points.find((p) => p.clock === gaugeReplay.firstCrossing) ?? null;
  const domainEnd = points[points.length - 1]?.min ?? 0;
  const firstHour = Number(facts.scenario.triggerClock.split(":")[0]) + 1;
  const lastHour = Number(gaugeReplay.points[gaugeReplay.points.length - 1].time.split(":")[0]);
  const ticks = [{ min: 0, label: facts.scenario.triggerClock }];
  for (let h = firstHour; h <= lastHour; h++) {
    const label = `${String(h).padStart(2, "0")}:00`;
    ticks.push({ min: minutesAfterTrigger(label), label });
  }
  const watch = facts.states.find((s) => s.state === "WATCH");
  const fp = facts.firstPublic;

  return (
    <Section
      id="proof-chart"
      className="scroll-mt-14"
      eyebrow="Proof"
      title={
        watch ? (
          <>
            The gauge saw the flood at {gaugeReplay.firstCrossing}.
            <br className="hidden sm:block" /> GANGA saw it at {watch.clock.slice(0, 5)}.
          </>
        ) : (
          `The gauge saw the flood at ${gaugeReplay.firstCrossing}.`
        )
      }
      description="Reconstructed gauge level on 26 August, with the simulated GANGA states."
    >
      <Appear>
        <ProofChart
          points={points}
          threshold={gaugeReplay.amberThresholdM}
          gaugeKm={gaugeReplay.gaugeKm}
          crossing={crossingPoint ? { clock: crossingPoint.clock, min: crossingPoint.min, level: crossingPoint.level } : null}
          states={facts.states.map((s) => ({ state: s.state, min: s.min, clock: s.clock, rule: s.rule }))}
          warn={fp ? { min: fp.min, clock: fp.clockShort } : null}
          gaugeAlarm={facts.gauge.warnMin !== null ? { min: facts.gauge.warnMin, clock: facts.gauge.crossClock } : null}
          earlierBy={facts.earlierByMin !== null ? fmtDuration(facts.earlierByMin) : null}
          domainEnd={domainEnd}
          ticks={ticks}
          note={gaugeReplay.note}
        />
      </Appear>
    </Section>
  );
}
