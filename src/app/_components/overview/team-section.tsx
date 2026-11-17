import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { mentor, members } from "@/content/team";
import { site } from "@/content/site";
import { Section } from "@/components/layout/section";
import { Appear } from "./appear";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DetailTrigger, type Detail } from "./detail-sheet";

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const word = (n: number, lower = false) => {
  const w = WORDS[n] ?? String(n);
  return lower ? w.toLowerCase() : w;
};

export function TeamSection() {
  const countries = new Set(members.map((m) => m.country)).size;
  const people: { key: string; name: string; photo: string; line: string; badge?: string; detail: Detail }[] = [
    ...members.map((m) => ({
      key: m.id,
      name: m.name,
      photo: m.photo,
      line: `${m.universityShort} · ${m.country}`,
      detail: {
        eyebrow: `${site.team} · ${m.university}`,
        title: m.name,
        description: m.contribution,
        avatar: { src: m.photo, alt: `Portrait of ${m.name}` },
        rows: [
          { label: "Role", value: m.roleToConfirm ? `${m.role} (to confirm)` : m.role },
          { label: "University", value: m.university },
          { label: "Country", value: m.country },
          ...(m.displayName && !m.name.startsWith(m.displayName) ? [{ label: "Goes by", value: m.displayName }] : []),
        ],
        note: m.roleToConfirm ? "Role to be confirmed." : undefined,
        links: [{ href: "/team", label: "Open the team page" }],
      } satisfies Detail,
    })),
    {
      key: "mentor",
      name: mentor.name,
      photo: mentor.photo,
      line: mentor.role,
      badge: "Mentor",
      detail: {
        eyebrow: `${site.team} · Mentor`,
        title: mentor.name,
        description: mentor.note,
        avatar: { src: mentor.photo, alt: `Portrait of ${mentor.name}` },
        rows: [{ label: "Role", value: mentor.role }],
        links: [{ href: "/team", label: "Open the team page" }],
      },
    },
  ];

  return (
    <Section
      id="team"
      className="scroll-mt-14"
      eyebrow={site.team}
      title={`${word(members.length)} students from ${word(countries, true)} countries.`}
      description={`${site.teamMotto}.`}
      actions={
        <Button asChild variant="outline">
          <Link href="/team">
            Meet the team <ArrowRightIcon />
          </Link>
        </Button>
      }
    >
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {people.map((p, i) => (
          <Appear key={p.key} delay={i * 0.05} className={cn("h-full", i === people.length - 1 && "col-span-2 sm:col-span-1")}>
            <li className="h-full">
              <DetailTrigger
                detail={p.detail}
                className={cn(
                  "group flex h-full w-full flex-col items-center rounded-[22px] border bg-surface px-4 pb-5 pt-6 text-center shadow-soft transition-shadow duration-200 hover:shadow-card",
                  p.badge ? "border-dashed border-border-strong bg-surface-2/50" : "border-border"
                )}
              >
                <span className="relative">
                  <Image
                    src={p.photo}
                    alt={`Portrait of ${p.name}`}
                    width={176}
                    height={176}
                    sizes="88px"
                    loading="eager"
                    fetchPriority="low"
                    className="size-[88px] rounded-full object-cover object-[50%_28%] ring-1 ring-border transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {p.badge && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground">
                      {p.badge}
                    </span>
                  )}
                </span>
                <span className="mt-4 text-[15px] font-semibold leading-tight tracking-[-0.01em]">{p.name}</span>
                <span className="mt-1 text-[13px] leading-snug text-muted">{p.line}</span>
              </DetailTrigger>
            </li>
          </Appear>
        ))}
      </ul>
    </Section>
  );
}
