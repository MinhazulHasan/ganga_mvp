import { LockKeyholeIcon, NetworkIcon, CpuIcon, HeartPulseIcon, GlobeIcon, SunIcon, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { resilience } from "@/content/architecture";

const ICONS: LucideIcon[] = [LockKeyholeIcon, NetworkIcon, CpuIcon, HeartPulseIcon, GlobeIcon, SunIcon];

export function ResilienceGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {resilience.map((r, i) => {
        const Icon = ICONS[i];
        return (
          <Reveal key={r.name} delay={(i % 3) * 0.05} className="h-full">
            <Card className="h-full p-6 transition-shadow hover:shadow-float">
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-surface-2 hairline">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{r.name}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{r.detail}</p>
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}
