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
  RotateCcwIcon,
  RouteIcon,
  SatelliteDishIcon,
  ScanIcon,
  SignalIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Switch } from "@/components/ui/switch";
import { Provenance } from "@/components/brand/provenance";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCommandStore } from "@/lib/stores/command-store";
import { awsServer, defaultRouteLine, noShutLines, pingLines, shutLines, uplinks, type Uplink } from "@/content/network";
import { Button } from "@/components/ui/button";
import { activeRoute, useMediaQuery, useMounted, useNetworkState, usePrefersReducedMotion, type UplinkDown } from "../network-state";
import { NetSheet, useNetSheet } from "../net-sheet";
import { parseIos, type IosLine } from "../net-utils";
import type { WanOutcome } from "../wan-outcome";
import { buildLayout, type LinkFlowEdge, type NetNode } from "./layout";
import { DeviceNode, TopologyActionsContext, ZoneNode } from "./nodes";
import { LinkEdge } from "./link-edge";
import { ConsolePanel, consoleReducer, initConsole, useConsoleTicker } from "./console";
import { WanCallout } from "./wan-callout";

const nodeTypes: NodeTypes = { device: DeviceNode, zone: ZoneNode };
const edgeTypes: EdgeTypes = { link: LinkEdge };
const FIT: FitViewOptions = { padding: { top: "24px", right: "28px", bottom: "60px", left: "28px" }, maxZoom: 1 };

/** "Local SMS" → "local SMS", "E-mail" → "e-mail", but keep acronyms like "SMS". */
const lc = (s: string) => (/^[A-Z][a-z-]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const SHOW_ROUTE: IosLine = { kind: "cmd", prompt: "GANGA-SW#", text: "show ip route ospf" };
const INTRO: IosLine[] = [
  { kind: "note", text: "! GANGA edge · Cisco Packet Tracer · GANGA-R1, GANGA-R2 and GANGA-SW" },
  { kind: "note", text: "! Both routers send a default route into OSPF. Cost 1 (cellular) beats cost 100 (satellite)." },
  SHOW_ROUTE,
  { kind: "log", text: defaultRouteLine("r1", "00:12:31") ?? "" },
  { kind: "note", text: "! Cut cellular, then satellite, to run the failover test." },
];

const routeNote = (from: Uplink | null, to: Uplink | null): string => {
  if (from === to) {
    return to ? `! Default route unchanged: traffic stays on ${uplinks[to].router} (${uplinks[to].medium}).` : "! Still no default route. The station stays offline.";
  }
  if (!to) return "! No default route left. The station runs offline: the engine, sirens and local SMS keep working.";
  if (to === "r2") return "! GANGA-R1 withdrew its default route. OSPF moved it to GANGA-R2: traffic now leaves by satellite.";
  return from === "r2"
    ? "! GANGA-R1 is back. Cost 1 beats 100, so traffic returns to cellular."
    : "! Default route via GANGA-R1. The station is back online over cellular.";
};

/** The broker (10.0.20.10) pings the AWS server, like in Swarnima's recording. */
function pingFromBroker(result: "ok" | "failover" | "offline"): IosLine[] {
  return [
    { kind: "note", text: "! Broker + Fusion server (10.0.20.10) pings the AWS server" },
    { kind: "cmd", prompt: "C:\\>", text: `ping ${awsServer}` },
    ...pingLines(result).map((text): IosLine => ({ kind: "log", text })),
  ];
}

/** IOS lines for one uplink change: the router command, what the switch now routes, then a ping to the cloud. */
function sequenceFor(id: Uplink, goingDown: boolean, before: UplinkDown, withPing = true): IosLine[] {
  const after = { ...before, [id]: goingDown };
  const from = activeRoute(before);
  const to = activeRoute(after);
  const host = uplinks[id].router;
  const lines: IosLine[] = parseIos(goingDown ? shutLines(host) : noShutLines(host));
  if (from !== to) {
    lines.push(SHOW_ROUTE);
    const route = defaultRouteLine(to);
    if (route) lines.push({ kind: "log", text: route });
  }
  lines.push({ kind: "note", text: routeNote(from, to) });
  if (withPing) lines.push(...pingFromBroker(!to ? "offline" : from !== to && from !== null && goingDown ? "failover" : "ok"));
  return lines;
}

const SWITCH_META: Record<Uplink, { label: string; short: string; icon: typeof SignalIcon }> = {
  r1: { label: "Cut cellular (R1)", short: "Cellular", icon: SignalIcon },
  r2: { label: "Cut satellite (R2)", short: "Satellite", icon: SatelliteDishIcon },
};

export function Topology({ outcome, configs }: { outcome: WanOutcome; configs: Record<string, string> }) {
  const { down, setUplink, route } = useNetworkState();
  const sheet = useNetSheet();
  const mounted = useMounted();
  const finePointer = useMediaQuery("(pointer: fine)", true);
  const reduce = usePrefersReducedMotion();
  const layout = React.useMemo(() => buildLayout(), []);

  const [con, dispatch] = React.useReducer(consoleReducer, undefined, () => initConsole(INTRO, "GANGA-SW#"));
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
    (id: Uplink, goingDown: boolean) => {
      if (down[id] === goingDown) return;
      const after = { ...down, [id]: goingDown };
      const to = activeRoute(after);
      setUplink(id, goingDown);
      dispatch({ type: "run", seq: sequenceFor(id, goingDown, down), now: Date.now(), instant: reduce });
      // On narrow screens the canvas scrolls sideways: bring the changed WAN link into view.
      const scroller = scrollerRef.current;
      const label = scroller?.querySelector<HTMLElement>(`[data-wan-label="${id}"]`);
      if (scroller && label && scroller.scrollWidth > scroller.clientWidth + 1) {
        const sr = scroller.getBoundingClientRect();
        const lr = label.getBoundingClientRect();
        const left = scroller.scrollLeft + (lr.left + lr.width / 2) - (sr.left + sr.width / 2);
        scroller.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
      }
      const u = uplinks[id];
      const medium = u.medium.charAt(0).toUpperCase() + u.medium.slice(1);
      if (goingDown) {
        toast(`${medium} cut · Gi0/1 shut on ${u.router}`, {
          description: to
            ? to === route
              ? `Backup lost. Traffic stays on ${uplinks[to].router} (${uplinks[to].medium}).`
              : `OSPF moved the default route to ${uplinks[to].router}. The cloud stays reachable over ${uplinks[to].medium}.`
            : `Both uplinks down. The ${listJoin(outcome.local.map((c) => lc(c.short)))} still work from the station.`,
          icon: to ? <RouteIcon className="size-4 text-watch" /> : <CloudOffIcon className="size-4 text-emergency" />,
        });
      } else {
        toast(`${medium} restored · Gi0/1 up on ${u.router}`, {
          description: to === route ? `Backup ready again. Traffic stays on ${uplinks[to!].router}.` : `Default route via ${uplinks[to!].router} (${uplinks[to!].medium}).`,
          icon: <CloudCheckIcon className="size-4 text-normal" />,
        });
      }
    },
    [down, route, setUplink, reduce, outcome.local]
  );

  const reset = React.useCallback(() => {
    if (!down.r1 && !down.r2) {
      toast("Both uplinks are already up", { description: "Default route via GANGA-R1 (cellular)." });
      return;
    }
    const seq: IosLine[] = [];
    let state = down;
    for (const id of ["r1", "r2"] as const) {
      if (!state[id]) continue;
      seq.push(...sequenceFor(id, false, state, false));
      state = { ...state, [id]: false };
    }
    setUplink("r1", false);
    setUplink("r2", false);
    seq.push(...pingFromBroker("ok"));
    dispatch({ type: "run", seq, now: Date.now(), instant: reduce });
    toast("Both uplinks back up", { description: "Default route via GANGA-R1 (cellular). Satellite on standby.", icon: <CloudCheckIcon className="size-4 text-normal" /> });
  }, [down, setUplink, reduce]);

  // ⌘K: run the failover test from anywhere on the page.
  const register = useCommandStore((s) => s.register);
  React.useEffect(
    () =>
      register(
        (["r1", "r2"] as const).map((id) => ({
          id: `network-wan-${id}`,
          group: "Network",
          label: down[id] ? `Restore ${uplinks[id].medium} (${uplinks[id].router})` : `Cut ${uplinks[id].medium} (${uplinks[id].router})`,
          keywords: ["wan", "failover", "shutdown", "gi0/1", "ospf", "packet tracer", uplinks[id].medium],
          icon: down[id] ? <CloudCheckIcon /> : <CloudOffIcon />,
          run: () => {
            setWan(id, !down[id]);
            document.getElementById("topology")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
          },
        }))
      ),
    [register, down, setWan, reduce]
  );

  const statusText = route
    ? `Default route via ${uplinks[route].router} over ${uplinks[route].medium}.${route === "r2" ? " Cellular is down." : down.r2 ? " Satellite backup is down." : ""}`
    : "Both uplinks are down. The station runs offline.";

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
            <RouteChip route={route} reduce={reduce} />
            {(["r1", "r2"] as const).map((id) => {
              const meta = SWITCH_META[id];
              const Icon = meta.icon;
              return (
                <div
                  key={id}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-[13px] py-1 pl-3 pr-1.5 transition-colors duration-300",
                    down[id] ? "bg-emergency-soft" : "bg-surface-2 hairline"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", down[id] ? "text-emergency" : "text-muted")} aria-hidden />
                  <label htmlFor={`wan-${id}`} className={cn("cursor-pointer select-none whitespace-nowrap text-[13px] font-medium", down[id] && "text-emergency")}>
                    {meta.label}
                  </label>
                  <Switch id={`wan-${id}`} tone="danger" checked={down[id]} onCheckedChange={(v) => setWan(id, v)} aria-describedby="wan-status" />
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={reset} className="h-10 rounded-[13px]">
              <RotateCcwIcon />
              Reset
            </Button>
            <p id="wan-status" className="sr-only" aria-live="polite">
              {statusText}
            </p>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative border-b border-border">
          <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin] lg:overflow-x-visible">
            <div
              className="ganga-flow relative h-[600px] min-w-[1180px] bg-background lg:h-[660px] lg:min-w-0"
              role="group"
              aria-label="GANGA edge topology: Internet and AWS, two carriers, GANGA-R1 on cellular and GANGA-R2 on satellite, Layer-3 switch GANGA-SW and four VLANs"
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
          <ConsolePanel state={con} title="Packet Tracer CLI" className="h-[320px] lg:h-auto lg:min-h-[320px]" />
          <WanCallout outcome={outcome} />
        </div>
      </div>

      <NetSheet api={sheet} configs={configs} />
    </TopologyActionsContext.Provider>
  );
}

/* ------------------------------------------------------------------ */

function RouteChip({ route, reduce }: { route: Uplink | null; reduce: boolean }) {
  const u = route ? uplinks[route] : null;
  const tone = !u ? "bg-emergency-soft text-emergency" : route === "r1" ? "bg-normal-soft text-normal" : "bg-watch-soft text-watch";
  const dot = !u ? "bg-emergency-fill" : route === "r1" ? "bg-normal-fill" : "bg-watch";
  return (
    <motion.span
      layout={!reduce}
      className={cn("inline-flex h-10 items-center gap-2 rounded-[13px] px-3.5 text-[12.5px] font-medium transition-colors duration-300", tone)}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <span className="relative flex size-2" aria-hidden>
        {u && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", dot)} />}
        <span className={cn("relative size-2 rounded-full", dot)} />
      </span>
      <span className="font-semibold">Default route</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={route ?? "none"}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          className="text-foreground/80 dark:text-foreground/85"
        >
          {u ? (
            <>
              via <span className="font-mono text-[12px]">{u.router}</span> · {u.medium}
            </>
          ) : (
            <span className="font-semibold text-emergency">none · offline</span>
          )}
        </motion.span>
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
