import Image from "next/image";
import { CalendarIcon, GlobeIcon, MapPinIcon } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/motion/reveal";
import { ApieLogo } from "@/components/brand/apie-logo";
import { SoiLockup } from "@/components/brand/supporters";
import { site } from "@/content/site";
import { mentor, teamPhotos, universities } from "@/content/team";
import { MemberGrid } from "./_components/member-grid";
import { UniLogo } from "./_components/uni-logo";

export const metadata = {
  title: "Team",
  description: "Team PASS: four students, three universities, built GANGA at APIE Camp #11.",
};

const facts = [
  { icon: MapPinIcon, text: "Pulchowk Campus, Tribhuvan University" },
  { icon: CalendarIcon, text: site.dates },
  { icon: GlobeIcon, text: "Nepal · Malaysia · Bangladesh" },
];

const tu = universities.find((u) => u.short === "TU")!;

const thanks = [
  "The instructors of APIE Camp #11",
  "The NOC team and teaching assistants of APIE Camp #11",
];

export default function Page() {
  const { banner, lab } = teamPhotos;
  return (
    <>
      {/* 1. Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="dot-grid pointer-events-none absolute inset-0 mask-fade-b opacity-70" aria-hidden />
        <Container className="relative pb-14 pt-14 sm:pb-20 sm:pt-20">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-brand">Team PASS</p>
          <h1 className="max-w-4xl text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[64px]">
            Team PASS
          </h1>
          <p className="mt-6 font-serif text-[28px] italic leading-tight text-muted sm:text-[36px]">{site.teamMotto}</p>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-[13.5px] text-muted hairline">
                <Icon className="size-4 text-subtle" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
          <Reveal className="mt-12">
            <figure>
              <div className="relative aspect-[3/2] overflow-hidden rounded-[28px] bg-surface-2 shadow-float">
                <Image src={banner.src} alt={banner.alt} fill priority quality={90} sizes="(min-width: 1240px) 1176px, 100vw" className="object-cover" />
              </div>
              <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 px-2 text-[13px] text-subtle">
                <span>Team PASS with mentor Nitesh Baniya at APIE Camp #11.</span>
                <span>{banner.credit}</span>
              </figcaption>
            </figure>
          </Reveal>
        </Container>
      </header>

      {/* 2. Members */}
      <Section eyebrow="The team" title={<span aria-label="PASS: Pradip, Andrrew, Swarnima and Sohan">PASS</span>}>
        <MemberGrid />
      </Section>

      {/* 3. Mentor */}
      <Section tone="muted" className="py-16 sm:py-20">
        <Reveal>
          <Card className="mx-auto grid max-w-4xl items-center gap-6 overflow-hidden p-2 sm:grid-cols-[240px_1fr] sm:gap-10">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-surface-2">
              <Image src={mentor.photo} alt={`Portrait of ${mentor.name}`} fill sizes="(min-width: 640px) 240px, 90vw" className="object-cover object-top" />
            </div>
            <div className="px-4 pb-6 sm:py-6 sm:pr-10">
              <p className="mb-3 font-serif text-[24px] italic leading-none text-brand">With thanks</p>
              <h2 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[40px]">{mentor.name}</h2>
              <p className="mt-2 text-[15px] font-medium text-muted">{mentor.role}</p>
              <p className="mt-5 text-[17px] leading-relaxed">{mentor.note}</p>
            </div>
          </Card>
        </Reveal>
      </Section>

      {/* 4. Universities */}
      <Section eyebrow="Where we study" title="Three universities.">
        <ul className="grid gap-5 md:grid-cols-3">
          {universities.map((u, i) => (
            <li key={u.short}>
              <Reveal delay={i * 0.05} className="h-full">
                <Card className="flex h-full items-center gap-4 p-5">
                  <UniLogo src={u.logo} name={u.name} size={64} className="rounded-[16px] p-1.5" />
                  <div>
                    <p className="text-[17px] font-semibold leading-snug tracking-[-0.02em]">{u.name}</p>
                    <p className="mt-1 text-[13px] text-muted">{u.short} · {u.country}</p>
                  </div>
                </Card>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* 5. At the lab */}
      <Section tone="muted" eyebrow="At the lab" title="In the lab">
        <Reveal>
          <figure>
            <div className="relative aspect-video overflow-hidden rounded-[28px] bg-surface-2 shadow-float">
              <Image src={lab.src} alt={lab.alt} fill quality={90} sizes="(min-width: 1240px) 1176px, 100vw" className="object-cover" />
            </div>
            <figcaption className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 px-2 text-[13px] text-subtle">
              <span>Team PASS at the lab bench during APIE Camp #11.</span>
              <span>{lab.credit}</span>
            </figcaption>
          </figure>
        </Reveal>
      </Section>

      {/* 6. Acknowledgements */}
      <Section eyebrow="Acknowledgements" title="Thank you.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full">
            <Card className="flex h-full flex-col justify-between gap-8 p-7">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
                <SoiLockup size={52} />
                <span aria-hidden className="hidden h-10 w-px bg-border sm:block" />
                <ApieLogo height={32} />
                <span aria-hidden className="hidden h-10 w-px bg-border sm:block" />
                <span className="inline-flex items-center gap-2.5">
                  <span className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
                    <Image src={tu.logo} alt={tu.name} width={44} height={44} className="size-full object-contain" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[15px] font-semibold">{tu.short}</span>
                    <span className="text-[12.5px] text-muted">Host</span>
                  </span>
                </span>
              </div>
              <p className="text-[17px] leading-relaxed">
                Thank you to SOI Asia and the APIE Program, and to Tribhuvan University for hosting us at IOE Pulchowk Campus.
              </p>
            </Card>
          </Reveal>
          <Reveal delay={0.05} className="h-full">
            <Card className="h-full p-7">
              <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-subtle">Also with thanks to</p>
              <ul className="mt-4 divide-y divide-border">
                {thanks.map((t) => (
                  <li key={t} className="py-3.5 text-[16px] leading-snug first:pt-0 last:pb-0">{t}</li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
