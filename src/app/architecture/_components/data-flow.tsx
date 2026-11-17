import { ActivityIcon, RadioTowerIcon, DatabaseIcon, GitMergeIcon, BellRingIcon, CloudIcon, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { dataFlow, dataFlowNote } from "@/content/architecture";

const ICONS: LucideIcon[] = [ActivityIcon, RadioTowerIcon, DatabaseIcon, GitMergeIcon, BellRingIcon, CloudIcon];

function Group({ label, offline, steps, cols }: { label: string; offline?: boolean; steps: (typeof dataFlow)[number][]; cols: string }) {
  return (
    <div className="rounded-[22px] border border-border bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-6 flex items-center gap-2">
        <span className={`size-2 rounded-full ${offline ? "bg-built" : "bg-simulated"}`} aria-hidden />
        <p className="text-[13px] font-semibold tracking-[-0.01em]">{label}</p>
      </div>
      <ol className={`grid gap-8 lg:gap-4 ${cols}`}>
        {steps.map((s, i) => {
          const Icon = ICONS[s.step - 1];
          const last = i === steps.length - 1;
          return (
            <li key={s.step} className="relative flex gap-4 lg:flex-col lg:gap-4">
              {!last && (
                <>
                  <span className="absolute left-[21px] top-12 -bottom-8 w-px bg-border-strong lg:hidden" aria-hidden />
                  <span className="absolute left-14 right-[-4px] top-[21px] hidden h-px bg-border-strong lg:block" aria-hidden />
                </>
              )}
              <span className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-surface-2 text-foreground hairline">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="tabular text-[12px] font-medium text-subtle">Step {s.step}</p>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{s.name}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function DataFlow() {
  const edge = dataFlow.filter((s) => s.where === "edge");
  const cloud = dataFlow.filter((s) => s.where === "cloud");
  return (
    <Reveal>
      <div className="grid gap-5 lg:grid-cols-[5fr_1fr] lg:gap-6">
        <Group label="Edge (works offline)" offline steps={[...edge]} cols="lg:grid-cols-5" />
        <Group label="Cloud" steps={[...cloud]} cols="lg:grid-cols-1" />
      </div>
      <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted">{dataFlowNote}</p>
    </Reveal>
  );
}
