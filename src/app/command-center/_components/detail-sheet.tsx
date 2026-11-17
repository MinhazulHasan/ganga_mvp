"use client";

import { useRef, type ReactNode } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { closeSheet } from "./sim-actions";
import { CC_VARS } from "./bits";
import { NodeSheet } from "./sheet-node";
import { VillageSheet } from "./sheet-village";
import { AssumptionsSheet, DeliverySheet, DeviceSheet, EvidenceSheet } from "./sheet-misc";

/** One side sheet for every "open details" on the page; content follows the selection. */
export function DetailSheet() {
  const contentRef = useRef<HTMLDivElement>(null);
  const run = useRun();
  const open = useSim((s) => s.sheetOpen);
  const sel = useSim((s) => s.selection);

  let body: ReactNode = null;
  if (sel?.kind === "node") {
    const node = run.nodes.find((n) => n.id === sel.id);
    if (node) body = <NodeSheet key={node.id} run={run} node={node} />;
  } else if (sel?.kind === "village") {
    const v = run.villages.find((x) => x.id === sel.id);
    if (v) body = <VillageSheet key={v.id} run={run} village={v} />;
  } else if (sel?.kind === "evidence") {
    const e = run.evidence.find((x) => x.id === sel.id);
    if (e) body = <EvidenceSheet key={e.id} run={run} e={e} />;
  } else if (sel?.kind === "delivery") {
    const d = run.deliveries.find((x) => x.id === sel.id);
    if (d) body = <DeliverySheet key={d.id} run={run} d={d} />;
  } else if (sel?.kind === "device") {
    body = <DeviceSheet key={sel.id} id={sel.id} run={run} />;
  } else if (sel?.kind === "assumptions") {
    body = <AssumptionsSheet run={run} />;
  }

  return (
    <Sheet open={open && body !== null} onOpenChange={(v) => !v && closeSheet()}>
      <SheetContent
        ref={contentRef}
        className={cn(CC_VARS, "w-[min(460px,calc(100vw-16px))]")}
        // Focus the sheet itself, not the first chart inside it (charts are focusable for keyboard tooltips).
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
      >
        {body}
      </SheetContent>
    </Sheet>
  );
}
