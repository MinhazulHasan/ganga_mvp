"use client";

import * as React from "react";
import { ChevronRightIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Provenance } from "@/components/brand/provenance";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vlanPlan } from "@/content/network";
import { NetSheet, RuleList, useNetSheet } from "./net-sheet";
import { sviFor } from "./net-utils";
import { VlanChip } from "./vlan-tone";

export function VlanPlan() {
  const sheet = useNetSheet();
  const openVlan = (vlan: number) => sheet.open({ kind: "vlan", vlan });

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">
            Addressing plan <span className="font-normal text-muted">· field deployment</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Provenance
              kind="simulated"
              label="VLANs + IPv4 in Packet Tracer"
              tip="The four VLANs, their IPv4 subnets and the SVI gateways run in the Packet Tracer model."
            />
            <Provenance kind="planned" label="IPv6 + firewall policy" tip="Part of the field design, not built yet." />
          </div>
        </div>
        {/* Desktop: a real table, every row opens the VLAN sheet */}
        <div className="hidden md:block">
          <Table className="text-[13.5px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 pl-6">VLAN</TableHead>
                <TableHead className="h-11">Zone</TableHead>
                <TableHead className="h-11">IPv4 subnet</TableHead>
                <TableHead className="h-11">Gateway</TableHead>
                <TableHead className="h-11">IPv6 /64</TableHead>
                <TableHead className="h-11">Allowed traffic</TableHead>
                <TableHead className="h-11 w-12 pr-6">
                  <span className="sr-only">Details</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vlanPlan.map((v) => {
                const svi = sviFor(v.vlan);
                return (
                  <TableRow
                    key={v.vlan}
                    data-clickable="true"
                    onClick={() => openVlan(v.vlan)}
                    className="group align-top focus-within:bg-surface-2/70"
                  >
                    <TableCell className="py-4 pl-6 align-top">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openVlan(v.vlan);
                        }}
                        aria-label={`Open VLAN ${v.vlan}, ${v.zone}`}
                        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
                      >
                        <VlanChip vlan={v.vlan} />
                      </button>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <span className="block pt-0.5 font-medium">{v.zone}</span>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <span className="block pt-0.5 font-mono text-[12.5px] tabular">{v.subnet}</span>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <span className="block pt-0.5 font-mono text-[12.5px] text-muted tabular">{svi ?? "—"}</span>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <span className="block whitespace-nowrap pt-0.5 font-mono text-[12.5px] tabular">{v.ipv6}</span>
                    </TableCell>
                    <TableCell className="py-4 align-top">
                      <RuleList allowed={v.allowed} size="sm" className="max-w-[380px]" />
                    </TableCell>
                    <TableCell className="py-4 pr-6 align-top">
                      <ChevronRightIcon className="mt-1 size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: grouped cards */}
        <ul className="divide-y divide-border md:hidden">
          {vlanPlan.map((v) => {
            const svi = sviFor(v.vlan);
            return (
              <li key={v.vlan}>
                <button
                  type="button"
                  onClick={() => openVlan(v.vlan)}
                  className="group flex w-full flex-col gap-3 px-5 py-4 text-left outline-none transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2/70 focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                >
                  <span className="flex items-center gap-2.5">
                    <VlanChip vlan={v.vlan} />
                    <span className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">{v.zone}</span>
                    <ChevronRightIcon className="size-4 text-subtle" aria-hidden />
                  </span>
                  <span className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[12.5px] tabular">
                    <span className="font-sans text-[12.5px] text-muted">IPv4</span>
                    <span>{v.subnet}</span>
                    {svi && (
                      <>
                        <span className="font-sans text-[12.5px] text-muted">Gateway</span>
                        <span>{svi}</span>
                      </>
                    )}
                    <span className="font-sans text-[12.5px] text-muted">IPv6</span>
                    <span className="break-all">{v.ipv6}</span>
                  </span>
                  <RuleList allowed={v.allowed} size="sm" inline />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      <NetSheet api={sheet} />
    </>
  );
}
