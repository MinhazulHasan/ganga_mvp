import Link from "next/link";
import { nav, site } from "@/content/site";
import { GangaWordmark } from "@/components/brand/ganga-mark";
import { SupportersLockup, UniversityRow } from "@/components/brand/supporters";
import { Container } from "./container";
import { FooterScene } from "./footer-scene";

export function SiteFooter() {
  return (
    <footer className="site-footer relative isolate overflow-hidden">
      {/* the landscape is the footer's background; the details sit on top of it */}
      <FooterScene />
      <div className="relative">
        <Container className="py-14">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="max-w-md">
              <GangaWordmark />
              <p className="mt-5 text-sm leading-relaxed text-muted">{site.tagline}</p>
              <SupportersLockup size="md" className="mt-8" />
              <UniversityRow size="md" className="mt-7" label="Team PASS universities" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Explore</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                {nav.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="text-muted transition-colors hover:text-foreground">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">Built at</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {site.programFull}
                <br />
                {site.organizer}
                <br />
                {site.host}
                <br />
                {site.location} · {site.dates}
              </p>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs leading-relaxed text-subtle md:flex-row md:items-center md:justify-between">
            <p className="max-w-3xl">{site.disclaimer}</p>
            <p className="shrink-0">© 2026 {site.team} · {site.photoCredit}</p>
          </div>
        </Container>
      </div>
    </footer>
  );
}
