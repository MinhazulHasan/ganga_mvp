"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ArrowUpRightIcon, InfoIcon, BookOpenIcon } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Provenance, type ProvenanceKind } from "@/components/brand/provenance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DetailRow = { label: string; value: string; mono?: boolean };
export type DetailLink = { href: string; label: string; external?: boolean };
export type DetailListItem = { lead?: string; text: string; sub?: string; tag?: string };

/** Serialisable description of a "thing" on the page. Server sections build these; the sheet renders them. */
export type Detail = {
  eyebrow?: string;
  title: string;
  description?: string;
  provenance?: ProvenanceKind;
  /** Extra plain badge next to the provenance, e.g. "Reported". */
  badge?: string;
  avatar?: { src: string; alt: string };
  rowsTitle?: string;
  rows?: DetailRow[];
  paragraphs?: string[];
  list?: { title?: string; items: DetailListItem[] };
  note?: string;
  source?: { label: string; url?: string; note?: string };
  links?: DetailLink[];
};

const KIND_LINE: Record<ProvenanceKind, string> = {
  built: "Built at APIE Camp #11 or running on this site.",
  simulated: "Real code. Flood, sensors and radio links are modelled.",
  planned: "Designed, not built yet.",
};

const DetailContext = React.createContext<(detail: Detail) => void>(() => {});

export function useDetailSheet() {
  return React.useContext(DetailContext);
}

export function DetailSheetProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [open, setOpen] = React.useState(false);
  const show = React.useCallback((d: Detail) => {
    setDetail(d);
    setOpen(true);
  }, []);

  return (
    <DetailContext.Provider value={show}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          {detail && <DetailView detail={detail} onNavigate={() => setOpen(false)} />}
        </SheetContent>
      </Sheet>
    </DetailContext.Provider>
  );
}

/** A button that opens the shared detail sheet. Use for any card, row or node that represents a thing. */
export function DetailTrigger({
  detail,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "onClick" | "type"> & { detail: Detail }) {
  const show = useDetailSheet();
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => show(detail)}
      className={cn(
        "cursor-pointer text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function DetailView({ detail, onNavigate }: { detail: Detail; onNavigate: () => void }) {
  return (
    <>
      <SheetHeader className="gap-0">
        {detail.avatar && (
          <Image
            src={detail.avatar.src}
            alt={detail.avatar.alt}
            width={72}
            height={72}
            className="mb-4 size-[72px] rounded-full object-cover object-[50%_28%] hairline"
          />
        )}
        {detail.eyebrow && (
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-subtle">{detail.eyebrow}</p>
        )}
        <SheetTitle className="text-[20px] leading-tight">{detail.title}</SheetTitle>
        {detail.description ? (
          <SheetDescription className="mt-2 text-[14.5px] leading-relaxed">{detail.description}</SheetDescription>
        ) : (
          <SheetDescription className="sr-only">Details for {detail.title}</SheetDescription>
        )}
        {(detail.provenance || detail.badge) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {detail.provenance && <Provenance kind={detail.provenance} size="md" />}
            {detail.badge && (
              <Badge variant="outline" size="md">
                {detail.badge}
              </Badge>
            )}
          </div>
        )}
      </SheetHeader>

      <SheetBody className="flex flex-col gap-6 pb-8">
        {detail.provenance && <p className="-mb-2 text-[13px] leading-relaxed text-muted">{KIND_LINE[detail.provenance]}</p>}

        {detail.paragraphs?.map((p, i) => (
          <p key={i} className="text-[14.5px] leading-relaxed text-foreground/90">
            {p}
          </p>
        ))}

        {detail.rows && detail.rows.length > 0 && (
          <div>
            {detail.rowsTitle && <SubTitle>{detail.rowsTitle}</SubTitle>}
            <dl className="overflow-hidden rounded-[16px] bg-surface-2">
              {detail.rows.map((r, i) => (
                <div
                  key={`${r.label}-${i}`}
                  className={cn("flex items-baseline justify-between gap-4 px-4 py-3", i > 0 && "border-t border-border")}
                >
                  <dt className="min-w-0 text-[13px] text-muted">{r.label}</dt>
                  <dd className={cn("max-w-[62%] shrink-0 text-right text-[13.5px] font-medium tabular", r.mono && "font-mono text-[12.5px]")}>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {detail.list && detail.list.items.length > 0 && (
          <div>
            {detail.list.title && <SubTitle>{detail.list.title}</SubTitle>}
            <ol className="relative flex flex-col">
              {detail.list.items.map((it, i, items) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  <span aria-hidden className="relative flex w-3 shrink-0 justify-center">
                    <span className="mt-1.5 size-2 rounded-full bg-foreground/70 ring-4 ring-surface" />
                    {i < items.length - 1 && (
                      <span className="absolute bottom-[-6px] top-4 w-px bg-border-strong" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      {it.lead && <span className="font-mono text-[12px] text-subtle tabular">{it.lead}</span>}
                      <span className="text-[14px] font-medium">{it.text}</span>
                      {it.tag && (
                        <span className="rounded-[6px] bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-muted">{it.tag}</span>
                      )}
                    </div>
                    {it.sub && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{it.sub}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {detail.note && (
          <div className="flex gap-3 rounded-[16px] bg-surface-2 px-4 py-3.5 text-[13px] leading-relaxed text-muted">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
            <p>{detail.note}</p>
          </div>
        )}

        {detail.source && (
          <div>
            <SubTitle>Source</SubTitle>
            <div className="rounded-[16px] border border-border px-4 py-3.5">
              <p className="flex gap-2.5 text-[13.5px] font-medium leading-snug">
                <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                {detail.source.label}
              </p>
              {detail.source.note && <p className="mt-1.5 pl-[26px] text-[12.5px] text-muted">{detail.source.note}</p>}
              {detail.source.url && (
                <a
                  href={detail.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 ml-[26px] inline-flex items-center gap-1 rounded-[6px] text-[13px] font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/60"
                >
                  Read the source <ArrowUpRightIcon className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </div>
        )}

        {detail.links && detail.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {detail.links.map((l, i) =>
              l.external ? (
                <Button key={l.href} asChild variant={i === 0 ? "default" : "outline"} size="sm">
                  <a href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label} <ArrowUpRightIcon />
                  </a>
                </Button>
              ) : (
                <Button key={l.href} asChild variant={i === 0 ? "default" : "outline"} size="sm">
                  <Link href={l.href} onClick={onNavigate}>
                    {l.label} <ArrowRightIcon />
                  </Link>
                </Button>
              )
            )}
          </div>
        )}
      </SheetBody>
    </>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-subtle">{children}</p>;
}
