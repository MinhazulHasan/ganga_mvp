import Link from "next/link";
import { MapPinIcon, PlayIcon, LayoutDashboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { SupportersLockup, UniversityRow } from "@/components/brand/supporters";
import { site } from "@/content/site";
import { ReplayCard } from "./replay-card";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border" aria-labelledby="hero-title" data-backdrop="clear">
      {/* background: dot grid fading out, one soft brand-tinted light */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="dot-grid absolute inset-0"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 70% 35%, black 25%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 70% 35%, black 25%, transparent 75%)",
          }}
        />
        <div
          className="absolute -right-40 -top-56 size-[900px] rounded-full dark:hidden"
          style={{ background: "radial-gradient(closest-side, rgb(190 0 8 / 0.07), transparent)" }}
        />
        <div
          className="absolute -right-40 -top-56 hidden size-[900px] rounded-full dark:block"
          style={{ background: "radial-gradient(closest-side, rgb(189 147 249 / 0.10), transparent)" }}
        />
      </div>

      <Container className="grid grid-cols-1 items-center gap-14 pb-16 pt-12 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-10 lg:pb-20 lg:pt-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)] xl:gap-16 xl:pb-24 xl:pt-20">
        <div className="max-w-[640px]">
          <SupportersLockup size="lg" className="mb-10 sm:mb-12" />
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">
            {site.program} · {site.team}
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.042em] [text-wrap:initial] sm:text-[60px] lg:text-[46px] xl:text-[62px]"
          >
            <span className="sm:block">
              Warn the valley{" "}
              <em className="font-serif text-[1.12em] font-normal italic leading-none tracking-[-0.01em]">before</em>
            </span>{" "}
            <span className="sm:block">the water arrives.</span>
          </h1>
          <p className="mt-6 max-w-[580px] text-[17px] leading-relaxed text-muted sm:text-[18px]">
            <span className="font-semibold text-foreground">{site.name}</span> ({site.expansion}) is {lowerFirst(site.tagline)}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg" className="h-12 rounded-[14px] px-6 text-[15px]">
              <Link href="/command-center">
                <LayoutDashboardIcon /> Open Command Center
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-[14px] px-6 text-[15px]">
              <Link href="/command-center?autoplay=1">
                <PlayIcon /> Simulate a real flood
              </Link>
            </Button>
          </div>

          <div className="mt-12 border-t border-border pt-7">
            <UniversityRow size="lg" />
            <p className="mt-5 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPinIcon className="size-3.5 text-subtle" aria-hidden />
              Built at Pulchowk Campus, Tribhuvan University · {site.dates}
            </p>
          </div>
        </div>

        <div className="w-full max-w-[600px] lg:max-w-none">
          <ReplayCard />
        </div>
      </Container>
    </section>
  );
}
