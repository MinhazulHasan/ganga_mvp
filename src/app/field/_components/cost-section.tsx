"use client";

import * as React from "react";
import { toast } from "sonner";
import { Section } from "@/components/layout/section";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/brand/stat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet";
import { costItems, costTotals } from "@/content/field";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type Item = { part: string; detail: string; usd: number; source: string };

function CostTable({ title, sub, items, allIn, onPick }: { title: string; sub: string; items: readonly Item[]; allIn: number; onPick: (i: Item, group: string) => void }) {
  const sum = items.reduce((a, b) => a + b.usd, 0);
  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </div>
      <div className="mt-4 px-3 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.part} data-clickable="true">
                <TableCell className="min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => onPick(it, title)}
                    className="-mx-1 block rounded-md px-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
                  >
                    <span className="block font-medium">{it.part}</span>
                    <span className="block text-[13px] text-muted">{it.detail}</span>
                  </button>
                </TableCell>
                <TableCell className="hidden text-muted sm:table-cell">{it.source}</TableCell>
                <TableCell className="tabular text-right font-medium">{usd(it.usd)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-surface-2/60">
              <TableCell className="font-medium">Sum of itemised parts</TableCell>
              <TableCell className="hidden sm:table-cell" />
              <TableCell className="tabular text-right font-semibold">{usd(sum)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">All-in figure (team deck)</TableCell>
              <TableCell className="hidden sm:table-cell" />
              <TableCell className="tabular text-right font-semibold">{usd0(allIn)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="px-6 pb-5 pt-2 text-[13px] text-muted">
        Not itemised here: <span className="tabular font-medium text-foreground">{usd(allIn - sum)}</span> (all-in minus listed parts).
      </p>
    </Card>
  );
}

export function CostSection() {
  const [pick, setPick] = React.useState<{ item: Item; group: string } | null>(null);

  const select = (item: Item, group: string) => {
    setPick({ item, group });
    toast(item.part, { description: `${usd(item.usd)} · ${item.source}` });
  };

  return (
    <Section
      tone="muted"
      eyebrow="What it costs"
      title="Cost per unit"
    >
      <div className="grid gap-4 sm:grid-cols-3 lg:gap-5">
        {[
          { v: usd0(costTotals.nodeAllIn), l: "per prototype RTU", s: "All-in, low-cost kit" },
          { v: usd0(costTotals.siteAllIn), l: "per valley station", s: "All-in, from the team deck" },
          { v: usd0(costTotals.cloudPerMonth), l: "per month, cloud", s: "Forecast" },
        ].map((t, i) => (
          <Reveal key={t.l} delay={i * 0.05}>
            <Card className="h-full p-6 sm:p-7">
              <Stat value={t.v} label={t.l} sub={t.s} />
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <CostTable title="Prototype RTU kit" sub="Low-cost stand-ins. Select a part for detail." items={costItems.node} allIn={costTotals.nodeAllIn} onPick={select} />
        </Reveal>
        <Reveal delay={0.05}>
          <CostTable title="Valley station" sub="Switch, host, receiver, router." items={costItems.site} allIn={costTotals.siteAllIn} onPick={select} />
        </Reveal>
      </div>

      <Reveal className="mt-6">
        <p className="max-w-3xl text-[15px] leading-relaxed text-muted">{costTotals.note}</p>
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Cloud basis</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{costTotals.cloudBasis}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em]">SMS alerts</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{costTotals.sms}</p>
        </Card>
      </div>

      <p className="mt-6 text-xs text-subtle">USD list prices, Oct 2026 · excludes shipping, customs and 13% VAT.</p>

      <Sheet open={!!pick} onOpenChange={(o) => !o && setPick(null)}>
        <SheetContent>
          {pick && (
            <>
              <SheetHeader>
                <SheetTitle>{pick.item.part}</SheetTitle>
                <SheetDescription>{pick.group}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="tabular text-[44px] font-semibold leading-none tracking-[-0.04em]">{usd(pick.item.usd)}</div>
                <dl className="mt-6 divide-y divide-border rounded-[16px] bg-surface-2">
                  {[
                    ["Detail", pick.item.detail],
                    ["Source", pick.item.source],
                    ["Price basis", "USD list price, Oct 2026"],
                    ["Not included", "Shipping, customs, 13% VAT"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-3 text-[14.5px]">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Section>
  );
}
