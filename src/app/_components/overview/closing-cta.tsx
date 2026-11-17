import Link from "next/link";
import { BracesIcon, LayoutDashboardIcon } from "lucide-react";
import { Container } from "@/components/layout/container";
import { GangaMark } from "@/components/brand/ganga-mark";
import { Button } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section className="pb-20 pt-4 sm:pb-28" aria-labelledby="closing-title">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0c0d28] px-6 py-14 text-white shadow-float sm:px-12 sm:py-16 lg:px-16 dark:bg-surface dark:text-foreground dark:ring-1 dark:ring-border">
          {/* texture + one light */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              backgroundImage: "radial-gradient(rgb(255 255 255 / 0.09) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              maskImage: "radial-gradient(ellipse 70% 90% at 85% 40%, black, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 90% at 85% 40%, black, transparent 75%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-24 -top-32 -z-10 size-[560px] rounded-full dark:opacity-70"
            style={{ background: "radial-gradient(closest-side, rgb(190 0 8 / 0.35), transparent)" }}
          />
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="max-w-2xl">
              <GangaMark className="size-10" />
              <h2 id="closing-title" className="mt-7 text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
                See the engine decide.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-white/70 dark:text-muted">
                Replay the Rasuwa flood minute by minute, or call the engine from the API.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 font-mono text-[12px]">
                <code className="rounded-[8px] bg-white/8 px-2.5 py-1 text-white/80 ring-1 ring-white/10 dark:bg-surface-2 dark:text-muted dark:ring-border">
                  GET /api/run?scenario=aug26
                </code>
                <code className="rounded-[8px] bg-white/8 px-2.5 py-1 text-white/80 ring-1 ring-white/10 dark:bg-surface-2 dark:text-muted dark:ring-border">
                  GET /api/cap?state=WARNING
                </code>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild variant="brand" size="lg" className="h-12 rounded-[14px] px-6 text-[15px]">
                <Link href="/command-center">
                  <LayoutDashboardIcon /> Open Command Center
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="h-12 rounded-[14px] border border-white/20 bg-white/8 px-6 text-[15px] text-white shadow-none hover:bg-white/14 dark:border-border-strong dark:bg-surface-2 dark:text-foreground dark:hover:bg-surface-3"
              >
                <Link href="/developers">
                  <BracesIcon /> Read the engine API
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
