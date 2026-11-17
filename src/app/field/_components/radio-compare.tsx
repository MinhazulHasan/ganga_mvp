import { CheckIcon, RulerIcon, BatteryLowIcon, BanknoteIcon } from "lucide-react";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { radioOptions, radioTakeaway } from "@/content/field";

const ROWS = [
  { key: "range", label: "Range", icon: RulerIcon },
  { key: "power", label: "Power", icon: BatteryLowIcon },
  { key: "cost", label: "Cost", icon: BanknoteIcon },
] as const;

export function RadioCompare() {
  return (
    <Section
      tone="muted"
      eyebrow="Radio choice"
      title="Why LoRa"
          >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {radioOptions.map((o, i) => {
          const selected = "selected" in o && o.selected;
          return (
            <Reveal key={o.name} delay={i * 0.05}>
              <Card
                className={
                  "relative h-full p-5 " +
                  (selected ? "border-primary/40 shadow-float ring-2 ring-primary/70 dark:ring-primary/60" : "")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[19px] font-semibold tracking-[-0.025em]">{o.name}</h3>
                    <p className="mt-0.5 text-[13px] text-muted">{selected ? "Private radio network" : o.sub}</p>
                  </div>
                  {selected && (
                    <Badge variant="solid" size="md">
                      <CheckIcon aria-hidden /> Selected
                    </Badge>
                  )}
                </div>
                <dl className="mt-5 divide-y divide-border">
                  {ROWS.map((r) => (
                    <div key={r.key} className="flex gap-3 py-3">
                      <r.icon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle">{r.label}</dt>
                        <dd className="mt-0.5 text-[14.5px] leading-snug">{o[r.key]}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </Card>
            </Reveal>
          );
        })}
      </div>
      <Reveal className="mt-8 max-w-3xl">
        <p className="text-[17px] leading-relaxed text-muted">{radioTakeaway}</p>
      </Reveal>
    </Section>
  );
}
