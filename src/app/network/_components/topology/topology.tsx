"use client";

import "@xyflow/react/dist/style.css";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useNodesStore,
  useReactFlow,
  useViewportStore,
  type EdgeTypes,
  type FitViewOptions,
  type NodeTypes,
} from "@xyflow/react";
import { toast } from "sonner";
import {
  CloudCheckIcon,
  CloudOffIcon,
  MousePointerClickIcon,
  MoveHorizontalIcon,
  NetworkIcon,
  ScanIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { Provenance } from "@/components/brand/provenance";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCommandStore } from "@/lib/stores/command-store";
import { iosLog, ptDevices } from "@/content/network";
import { members } from "@/content/team";
import { useMediaQuery, useMounted, useNetworkState, usePrefersReducedMotion } from "../network-state";
import { NetSheet, useNetSheet } from "../net-sheet";
import { ospfFacts, parseIos, type IosLine } from "../net-utils";
import type { WanOutcome } from "../wan-outcome";
import { buildLayout, type LinkFlowEdge, type NetNode } from "./layout";
import { DeviceNode, TopologyActionsContext, ZoneNode } from "./nodes";
import { LinkEdge } from "./link-edge";
import { ConsolePanel, consoleReducer, initConsole, useConsoleTicker } from "./console";
import { WanCallout } from "./wan-callout";

const nodeTypes: NodeTypes = { device: DeviceNode, zone: ZoneNode };
const edgeTypes: EdgeTypes = { link: LinkEdge };
const FIT: FitViewOptions = { padding: { top: "24px", right: "28px", bottom: "60px", left: "28px" }, maxZoom: 1 };

const router = ptDevices.find((d) => d.kind === "router");
const routerName = router?.label ?? "GANGA-R1";
/** "Local SMS" → "local SMS", "E-mail" → "e-mail", but keep acronyms like "SMS". */
const lc = (s: string) => (/^[A-Z][a-z-]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const CUT: IosLine[] = [...parseIos(iosLog.cut), { kind: "note", text: `! ${iosLog.ospfNote}` }];
const RESTORE: IosLine[] = parseIos(iosLog.restore);
const INTRO: IosLine[] = [
  { kind: "note", text: `! ${routerName} · ${router?.model ?? "Cisco 2911"} · Cisco Packet Tracer` },
  { kind: "note", text: `! ${router?.addressing ?? ""}` },
  { kind: "note", text: "! Flip “Shut down Gi0/1 (WAN)” to run the failover test." },
];
const firstCmd = CUT.find((l): l is Extract<IosLine, { kind: "cmd" }> => l.kind === "cmd");
const FIRST_PROMPT = firstCmd?.prompt ?? `${routerName}(config)#`;

export function Topology({ outcome }: { outcome: WanOutcome }) {
  const { wanDown, setWanDown } = useNetworkState();
  const sheet = useNetSheet();
  const mounted = useMounted();
  const finePointer = useMediaQuery("(pointer: fine)", true);
  const reduce = usePrefersReducedMotion();
  const layout = React.useMemo(() => buildLayout(), []);
  const ospf = ospfFacts();

  const [con, dispatch] = React.useReducer(consoleReducer, undefined, () => initConsole(INTRO, FIRST_PROMPT));
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  useConsoleTicker(con, dispatch);

  const { open } = sheet;
  const actions = React.useMemo(
    () => ({
      openDevice: (id: string) => open({ kind: "device", id }),
      openVlan: (vlan: number) => open({ kind: "vlan", vlan }),
    }),
    [open]
  );

  const setWan = React.useCallback(
    (down: boolean) => {
      setWanDown(down);
      dispatch({ type: "run", seq: down ? CUT : RESTORE, now: Date.now(), instant: reduce });
      // On narrow screens the canvas scrolls sideways: bring the WAN link into view.
      const scroller = scrollerRef.current;
      const label = scroller?.querySelector<HTMLElement>("[data-wan-label]");
      if (scroller && label && scroller.scrollWidth > scroller.clientWidth + 1) {
        const sr = scroller.getBoundingClientRect();
        const lr = label.getBoundingClientRect();
        const left = scroller.scrollLeft + (lr.left + lr.width / 2) - (sr.left + sr.width / 2);
        scroller.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
      }
      if (down) {
        toast(`Gi0/1 shut down on ${routerName}`, {
          description: `WAN is down. OSPF neighbour ${ospf.neighbour} stays ${ospf.state}; the ${listJoin(outcome.local.map((c) => lc(c.short)))} still work from the edge.`,
          icon: <CloudOffIcon className="size-4 text-emergency" />,
        });
      } else {
        toast(`Gi0/1 back up on ${routerName}`, {
          description: `WAN restored. ${listJoin(outcome.cloud.map((c, i) => (i === 0 ? c.short : lc(c.short))))} can deliver again.`,
          icon: <CloudCheckIcon className="size-4 text-normal" />,
        });
      }
    },
    [setWanDown, reduce, ospf.neighbour, ospf.state, outcome.local, outcome.cloud]
  );

  // ⌘K: run the failover test from anywhere on the page.
  const register = useCommandStore((s) => s.register);
  React.useEffect(
    () =>
      register([
        {
          id: "network-wan",
          group: "Network",
          label: wanDown ? "Bring Gi0/1 (WAN) back up" : "Shut down Gi0/1 (WAN)",
          keywords: ["wan", "failover", "shutdown", "gi0/1", "ospf", "packet tracer"],
          icon: wanDown ? <CloudCheckIcon /> : <CloudOffIcon />,
          run: () => {
            setWan(!wanDown);
            document.getElementById("topology")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
          },
        },
      ]),
    [register, wanDown, setWan, reduce]
  );

  return (
    <TopologyActionsContext.Provider value={actions}>
      <div className="overflow-hidden rounded-[24px] border border-border bg-surface shadow-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/[0.07] text-primary dark:bg-primary/15">
              <NetworkIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-0.015em]">
                GANGA edge network
                <Provenance kind="simulated" label="Packet Tracer" tip="Designed and run in Cisco Packet Tracer, not on field hardware." />
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">Simulated in Cisco Packet Tracer</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <OspfChip neighbour={ospf.neighbour} iface={ospf.iface} state={ospf.state} wanDown={wanDown} reduce={reduce} />
            <div
              className={cn(
                "flex h-10 items-center gap-3 rounded-[13px] py-1 pl-3.5 pr-1.5 transition-colors duration-300",
                wanDown ? "bg-emergency-soft" : "bg-surface-2 hairline"
              )}
            >
              <label htmlFor="wan-switch" className={cn("cursor-pointer select-none text-[13px] font-medium", wanDown && "text-emergency")}>
                Shut down Gi0/1 (WAN)
              </label>
              <Switch id="wan-switch" tone="danger" checked={wanDown} onCheckedChange={setWan} aria-describedby="wan-status" />
            </div>
            <p id="wan-status" className="sr-only" aria-live="polite">
              {wanDown
                ? `Gi0/1 is administratively down. OSPF neighbour ${ospf.neighbour} on ${ospf.iface} stays ${ospf.state}. The internet is unreachable from the camp.`
                : "Gi0/1 is up. The WAN link to the internet is working."}
            </p>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative border-b border-border">
          <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] lg:overflow-x-visible">
            <div
              className="ganga-flow relative h-[540px] min-w-[1140px] bg-background lg:h-[560px] lg:min-w-0"
              role="group"
              aria-label="GANGA edge topology: AWS / Internet, edge router GANGA-R1, Layer-3 switch GANGA_SW and four VLANs"
            >
              {mounted ? (
                <ReactFlow<NetNode, LinkFlowEdge>
                  nodes={layout.nodes}
                  edges={layout.edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={FIT}
                  minZoom={0.35}
                  maxZoom={1.75}
                  translateExtent={[
                    [-240, -200],
                    [layout.width + 240, layout.height + 200],
                  ]}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  nodesFocusable={false}
                  edgesFocusable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={finePointer}
                  zoomOnDoubleClick={false}
                  panOnScroll={false}
                  panOnDrag={finePointer}
                  preventScrolling={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background id="ganga-topology" variant={BackgroundVariant.Dots} gap={20} size={1.1} color="var(--border-strong)" />
                  <AutoFit />
                  <Panel position="bottom-left" className="m-3! sm:m-4!">
                    <span className="glass hidden h-8 items-center gap-1.5 rounded-full px-3 text-[12px] text-muted shadow-soft hairline lg:inline-flex">
                      <MousePointerClickIcon className="size-3.5" aria-hidden />
                      Click a device or a VLAN for details
                    </span>
                  </Panel>
                  <Panel position="bottom-right" className="m-3! sm:m-4!">
                    <ZoomControls reduce={reduce} />
                  </Panel>
                </ReactFlow>
              ) : (
                <div className="dot-grid absolute inset-0" aria-hidden />
              )}
            </div>
          </div>
          <p className="flex items-center gap-1.5 border-t border-border px-5 py-2.5 text-[12px] text-muted lg:hidden">
            <MoveHorizontalIcon className="size-3.5" aria-hidden />
            Scroll sideways to see the whole network. Tap a device or a VLAN for details.
          </p>
        </div>

        {/* Console + what still works */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
          <ConsolePanel state={con} title={routerName} className="h-[300px] lg:h-auto lg:min-h-[300px]" />
          <WanCallout outcome={outcome} />
        </div>
      </div>

      <NetSheet api={sheet} />
    </TopologyActionsContext.Provider>
  );
}

/* ------------------------------------------------------------------ */

function OspfChip({ neighbour, iface, state, wanDown, reduce }: { neighbour: string; iface: string; state: string; wanDown: boolean; reduce: boolean }) {
  return (
    <motion.span
      layout={!reduce}
      className="inline-flex h-10 items-center gap-2 rounded-[13px] bg-normal-soft px-3.5 text-[12.5px] font-medium text-normal"
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-normal-fill animate-pulse-ring" />
        <span className="relative size-2 rounded-full bg-normal-fill" />
      </span>
      <span className="font-semibold">OSPF</span>
      <span className="text-foreground/80 dark:text-foreground/85">
        Neighbour <span className="font-mono text-[12px]">{neighbour}</span> on <span className="font-mono text-[12px]">{iface}</span> ·{" "}
        <span className="font-semibold text-normal">{state}</span>
      </span>
      <AnimatePresence initial={false}>
        {wanDown && (
          <motion.span
            key="unchanged"
            initial={reduce ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.85 }}
            className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-normal ring-1 ring-normal/25"
          >
            unchanged
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

function AutoFit() {
  const { fitView } = useReactFlow();
  const width = useViewportStore((s) => s.width);
  const height = useViewportStore((s) => s.height);
  const ready = useNodesStore((s) => s.nodesInitialized);
  React.useEffect(() => {
    if (!ready || !width || !height) return;
    void fitView(FIT);
  }, [ready, width, height, fitView]);
  return null;
}

function ZoomControls({ reduce }: { reduce: boolean }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const duration = reduce ? 0 : 220;
  const items = [
    { label: "Zoom in", icon: ZoomInIcon, run: () => zoomIn({ duration }) },
    { label: "Zoom out", icon: ZoomOutIcon, run: () => zoomOut({ duration }) },
    { label: "Fit to view", icon: ScanIcon, run: () => fitView({ ...FIT, duration }) },
  ];
  return (
    <div className="glass hidden items-center gap-0.5 rounded-[12px] p-1 shadow-soft hairline lg:flex pointer-coarse:hidden">
      {items.map(({ label, icon: Icon, run }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void run()}
              aria-label={label}
              className="inline-flex size-8 items-center justify-center rounded-[9px] text-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-95"
            >
              <Icon className="size-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
