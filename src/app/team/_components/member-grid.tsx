"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpRightIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Reveal } from "@/components/motion/reveal";
import { members, universities, type Member } from "@/content/team";
import { UniLogo } from "./uni-logo";

const logoFor = (short: string) => universities.find((u) => u.short === short)?.logo ?? "";

export function MemberGrid() {
  const [active, setActive] = React.useState<Member | null>(null);

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((m, i) => (
          <li key={m.id}>
            <Reveal delay={i * 0.05} className="h-full">
              <button
                type="button"
                onClick={() => setActive(m)}
                aria-label={`${m.displayName}: open details`}
                className="group block h-full w-full rounded-[22px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <Card className="flex h-full flex-col overflow-hidden p-2 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-float">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-surface-2">
                    <Image
                      src={m.photo}
                      alt={`Portrait of ${m.name}`}
                      fill
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
                      className="object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.035]"
                    />
                    <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-white/85 text-[#0c0d28] opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ArrowUpRightIcon className="size-4" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col px-3.5 pb-4 pt-4">
                    <h3 className="text-[26px] font-semibold leading-none tracking-[-0.03em]">
                      {/* first letters spell the team name: P-A-S-S */}
                      <span className="text-[34px] font-bold leading-none text-brand">{m.displayName.charAt(0)}</span>
                      {m.displayName.slice(1)}
                    </h3>
                    {m.name !== m.displayName && <p className="mt-1.5 text-[13px] text-subtle">{m.name}</p>}
                    <div className="mt-4 flex items-center gap-2.5">
                      <UniLogo src={logoFor(m.universityShort)} name={m.university} size={28} />
                      <p className="text-[13px] leading-tight text-muted">
                        <span className="font-medium text-foreground">{m.universityShort}</span> · {m.country}
                      </p>
                    </div>
                    <p className="mt-4 text-[15px] font-medium leading-snug tracking-[-0.01em]">{m.role}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{m.contribution}</p>
                  </div>
                </Card>
              </button>
            </Reveal>
          </li>
        ))}
      </ul>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent>
          {active && (
            <>
              <SheetHeader>
                <SheetTitle>{active.name}</SheetTitle>
                <SheetDescription>{active.role}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] bg-surface-2">
                  <Image src={active.photo} alt={`Portrait of ${active.name}`} fill sizes="440px" className="object-cover object-top" />
                </div>
                <dl className="mt-5 divide-y divide-border rounded-[16px] bg-surface-2 text-sm">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <dt className="w-24 shrink-0 text-muted">University</dt>
                    <dd className="flex items-center gap-2 font-medium">
                      <UniLogo src={logoFor(active.universityShort)} name={active.university} size={24} />
                      <span>{active.university}</span>
                    </dd>
                  </div>
                  <div className="flex gap-3 px-4 py-3">
                    <dt className="w-24 shrink-0 text-muted">Country</dt>
                    <dd className="font-medium">{active.country}</dd>
                  </div>
                  <div className="flex gap-3 px-4 py-3">
                    <dt className="w-24 shrink-0 text-muted">Role</dt>
                    <dd className="font-medium">{active.role}</dd>
                  </div>
                </dl>
                <p className="mt-5 text-[15px] leading-relaxed text-muted">{active.contribution}</p>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
