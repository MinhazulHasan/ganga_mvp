"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, DatabaseIcon, DatabaseZapIcon, HardDriveDownloadIcon, InboxIcon, TriangleAlertIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { StatePill } from "@/components/brand/state-pill";
import { Provenance } from "@/components/brand/provenance";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { clockAt, stateAt } from "@/lib/engine";
import type { AlertState } from "@/lib/alert-state";
import { currentRun, useSim } from "./sim-store";
import { PanelHeader } from "./bits";

/* ------------------------------------------------------------------
   Cloud database — the valley station writes every RTU reading it
   hears to MongoDB Atlas. Readings are synthetic (the simulator);
   the writes and the read-back are real. If the WAN is cut, the
   station keeps the readings and forwards them when it is back.
------------------------------------------------------------------- */

type OutDoc = { rtu: string; role: string; t: number; clock: string; level: number; rate: number; vib: number; state: AlertState; buffered?: boolean };
type AtlasDoc = OutDoc & { id: string; runId: string; scenario: string; synthetic: boolean; source: string; receivedAt: string | null; expireAt: string | null };
type Snapshot = { db: string; collection: string; total: number; runTotal: number; latest: AtlasDoc[] };
type Phase = "off" | "waiting" | "writing" | "buffering" | "error";

const BATCH = 50;
const newRunId = (scenario: string) => `${scenario}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const PHASE: Record<Phase, { label: string; cls: string; dot: string }> = {
  off: { label: "Off", cls: "bg-surface-2 text-muted hairline", dot: "bg-subtle" },
  waiting: { label: "Waiting for readings", cls: "bg-surface-2 text-foreground hairline", dot: "bg-normal-fill" },
  writing: { label: "Writing to Atlas", cls: "bg-normal-soft text-normal", dot: "bg-normal-fill" },
  buffering: { label: "Buffering at the station", cls: "bg-warning-soft text-warning", dot: "bg-warning-fill" },
  error: { label: "Atlas error", cls: "bg-emergency-soft text-emergency", dot: "bg-emergency-fill" },
};

export function AtlasPanel({ className }: { className?: string }) {
  const [on, setOn] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("off");
  const [snap, setSnap] = React.useState<Snapshot | null>(null);
  const [written, setWritten] = React.useState(0);
  const [buffered, setBuffered] = React.useState(0);
  const [doc, setDoc] = React.useState<AtlasDoc | null>(null);

  const runId = React.useRef<string | null>(null);
  const cursor = React.useRef(-1);
  const queue = React.useRef<OutDoc[]>([]);
  const buffer = React.useRef<OutDoc[]>([]);
  const inflight = React.useRef(false);
  const backoff = React.useRef(0);
  const confirmed = React.useRef(false);
  const scenarioRef = React.useRef<string | null>(null);

  // Counts on load, so the panel shows what is already in Atlas.
  React.useEffect(() => {
    let alive = true;
    fetch("/api/readings")
      .then((r) => r.json())
      .then((j) => alive && j?.configured && typeof j.total === "number" && setSnap({ ...j, latest: [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const startRun = React.useCallback((scenario: string, t: number) => {
    runId.current = newRunId(scenario);
    scenarioRef.current = scenario;
    cursor.current = t <= 0 ? -1 : t;
    queue.current = [];
    buffer.current = [];
    confirmed.current = false;
    setWritten(0);
    setBuffered(0);
  }, []);

  const send = React.useCallback(async (docs: OutDoc[]) => {
    inflight.current = true;
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId: runId.current, scenario: scenarioRef.current, docs }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || typeof j.inserted !== "number") throw new Error(j?.error || `HTTP ${res.status}`);
      setWritten((w) => w + j.inserted);
      setSnap({ db: j.db, collection: j.collection, total: j.total, runTotal: j.runTotal, latest: j.latest });
      setPhase("writing");
      if (!confirmed.current) {
        confirmed.current = true;
        toast.success("Atlas confirmed the first write", { description: `${j.inserted} reading${j.inserted === 1 ? "" : "s"} stored in ${j.db}.${j.collection}.`, id: "atlas" });
      }
    } catch (e) {
      queue.current = [...docs, ...queue.current];
      backoff.current = 3;
      setPhase("error");
      toast.error("Couldn't write to MongoDB Atlas", { description: e instanceof Error ? e.message : "Network error", id: "atlas-err" });
    } finally {
      inflight.current = false;
    }
  }, []);

  // The writer: follows the replay clock, once a second.
  React.useEffect(() => {
    if (!on) return;
    const tick = () => {
      const st = useSim.getState();
      const run = currentRun();
      const s = run.scenario;
      // A new scenario, or the replay reset to the start, is a new run.
      if (scenarioRef.current !== s.id || (st.t <= 0.001 && cursor.current > 0.001)) startRun(s.id, st.t);

      if (st.t > cursor.current) {
        const fresh: OutDoc[] = [];
        for (const n of run.nodes) {
          for (const r of n.readings) {
            if (r.t > cursor.current && r.t <= st.t) {
              fresh.push({ rtu: n.id, role: n.role, t: r.t, clock: clockAt(s, r.t), level: r.level, rate: r.rate, vib: r.vib, state: stateAt(run, r.t) });
            }
          }
        }
        fresh.sort((a, b) => a.t - b.t);
        queue.current.push(...fresh);
        cursor.current = st.t;
      }

      const wanDown = st.wanDownFromMin !== null && st.t >= st.wanDownFromMin;
      if (wanDown) {
        if (queue.current.length) buffer.current.push(...queue.current.splice(0).map((d) => ({ ...d, buffered: true })));
        setBuffered(buffer.current.length);
        setPhase("buffering");
        return;
      }
      setPhase((p) => (p === "buffering" ? (confirmed.current ? "writing" : "waiting") : p));
      if (buffer.current.length) {
        const n = buffer.current.length;
        queue.current = [...buffer.current.splice(0), ...queue.current];
        setBuffered(0);
        toast("Uplink back: forwarding the station's buffer", { description: `${n} reading${n === 1 ? "" : "s"} kept during the outage are going to Atlas now.`, icon: <HardDriveDownloadIcon className="size-4" />, id: "atlas-flush" });
      }
      if (backoff.current > 0) {
        backoff.current -= 1;
        return;
      }
      if (!inflight.current && queue.current.length) void send(queue.current.splice(0, BATCH));
      else if (!inflight.current) setPhase((p) => (p === "error" ? p : confirmed.current ? "writing" : "waiting"));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [on, send, startRun]);

  const toggle = (v: boolean) => {
    setOn(v);
    if (v) {
      const st = useSim.getState();
      startRun(st.scenarioId, st.t);
      setPhase("waiting");
      toast("Storing readings in MongoDB Atlas", {
        description: st.playing ? "Every reading the station hears is written to the cloud." : "Press Play: each reading the station hears is written to the cloud.",
        icon: <DatabaseZapIcon className="size-4" />,
      });
    } else {
      setPhase("off");
      const pending = queue.current.length + buffer.current.length;
      queue.current = [];
      buffer.current = [];
      setBuffered(0);
      toast("Stopped writing to Atlas", { description: `${written} document${written === 1 ? "" : "s"} written in this run.${pending ? ` ${pending} unsent dropped.` : ""}` });
    }
  };

  const meta = PHASE[phase];
  const latest = on ? (snap?.latest ?? []) : [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <PanelHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Cloud database
            <Provenance kind="built" label="Live · MongoDB Atlas" tip="Real writes to MongoDB Atlas (AWS us-east-1). The readings themselves are synthetic, from the simulator." />
          </span>
        }
        description={
          <>
            The valley station writes every RTU reading to <span className="font-mono text-[12px]">{snap ? `${snap.db}.${snap.collection}` : "ganga.readings"}</span>. Synthetic readings, real writes.
          </>
        }
        right={
          <>
            <span className={cn("inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12.5px] font-medium transition-colors", meta.cls)} aria-live="polite">
              <span className="relative flex size-2" aria-hidden>
                {(phase === "writing" || phase === "buffering") && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", meta.dot)} />}
                <span className={cn("relative size-2 rounded-full", meta.dot)} />
              </span>
              {meta.label}
            </span>
            <div className={cn("flex h-8 items-center gap-2.5 rounded-[10px] py-1 pl-3 pr-1 transition-colors", on ? "bg-normal-soft" : "bg-surface-2 hairline")}>
              <label htmlFor="atlas-switch" className="cursor-pointer select-none whitespace-nowrap text-[13px] font-medium">
                Store readings
              </label>
              <Switch id="atlas-switch" checked={on} onCheckedChange={toggle} />
            </div>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 px-5 pb-5 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)]">
        {/* Counters */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-1">
            <Stat label="Written this run" value={written} tone={written ? "normal" : undefined} />
            <Stat
              label="Waiting at the station"
              value={buffered}
              tone={buffered ? "warning" : undefined}
              sub={buffered ? "Uplink down. Sent when it is back." : "Nothing held back"}
            />
            <Stat label="Documents in Atlas" value={snap?.total ?? null} sub="Each one expires after 24 h" />
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Cut the WAN while it runs: the station keeps the readings and forwards them when the uplink is back. Alerts never wait for Atlas.
          </p>
        </div>

        {/* Latest documents */}
        <div className="min-w-0">
          <p className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
            <span>Latest documents · read back from Atlas</span>
            {on && snap?.runTotal ? <span className="font-mono normal-case tracking-normal text-muted">{snap.runTotal} in this run</span> : null}
          </p>
          <div className="overflow-x-auto rounded-[14px] border border-border">
            <table className="w-full min-w-[620px] text-left text-[12.5px]">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-[0.08em] text-subtle">
                <tr>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">RTU</th>
                  <th className="px-3 py-2 text-right font-semibold">Level cm</th>
                  <th className="px-3 py-2 text-right font-semibold">Rise cm/min</th>
                  <th className="px-3 py-2 text-right font-semibold">Vib mm/s</th>
                  <th className="px-3 py-2 font-semibold">State</th>
                  <th className="px-3 py-2 font-semibold">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latest.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-muted">
                      <InboxIcon className="mx-auto mb-2 size-5 text-subtle" aria-hidden />
                      {on ? "Press Play. Readings appear here once Atlas confirms them." : "Turn on “Store readings”, then press Play."}
                    </td>
                  </tr>
                ) : (
                  latest.map((d) => (
                    <tr
                      key={d.id}
                      tabIndex={0}
                      onClick={() => setDoc(d)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setDoc(d))}
                      className="cursor-pointer outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                    >
                      <td className="px-3 py-2 font-mono tabular">{d.clock}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{d.rtu}</span> <span className="text-muted">{d.role}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular">{d.level.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular">{d.rate.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular">{d.vib.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <StatePill state={d.state} size="sm" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
                          …{d.id.slice(-6)}
                          {d.buffered && <span className="rounded-full bg-warning-soft px-1.5 py-px font-sans text-[10.5px] font-semibold text-warning">forwarded</span>}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DocDialog doc={doc} onClose={() => setDoc(null)} />
    </Card>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number | null; sub?: string; tone?: "normal" | "warning" }) {
  return (
    <div className={cn("rounded-[14px] p-3.5", tone === "warning" ? "bg-warning-soft" : "bg-surface-2")}>
      <p className="text-[11.5px] font-medium text-muted">{label}</p>
      <p className={cn("mt-1 font-mono text-[22px] font-semibold tabular leading-none", tone === "normal" && "text-normal", tone === "warning" && "text-warning")}>
        {value ?? "—"}
      </p>
      {sub && <p className="mt-1.5 hidden text-[11.5px] leading-snug text-muted sm:block">{sub}</p>}
    </div>
  );
}

function DocDialog({ doc, onClose }: { doc: AtlasDoc | null; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const json = doc
    ? JSON.stringify(
        {
          _id: { $oid: doc.id },
          runId: doc.runId,
          scenario: doc.scenario,
          rtu: doc.rtu,
          role: doc.role,
          t: doc.t,
          clock: doc.clock,
          level: doc.level,
          rate: doc.rate,
          vib: doc.vib,
          state: doc.state,
          buffered: doc.buffered,
          synthetic: doc.synthetic,
          source: doc.source,
          receivedAt: doc.receivedAt,
          expireAt: doc.expireAt,
        },
        null,
        2
      )
    : "";
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(640px,calc(100vw-24px))]">
        <DialogTitle className="flex items-center gap-2 pr-10">
          <DatabaseIcon className="size-4 text-muted" aria-hidden />
          Document from MongoDB Atlas
        </DialogTitle>
        <DialogDescription>
          {doc ? `${doc.rtu} at ${doc.clock}. Read back from the cluster, as stored.` : ""}
          {doc?.buffered && " Held at the station during the outage, then forwarded."}
        </DialogDescription>
        <div className="mt-4 overflow-hidden rounded-[14px] bg-[var(--term-bg,#0c0d28)] text-[#f8f8f2]">
          <div className="flex h-9 items-center justify-between border-b border-white/[0.07] pl-3.5 pr-1.5">
            <span className="font-mono text-[11.5px] text-white/60">ganga.readings</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                  toast.success("Document copied");
                } catch {
                  toast("Couldn't copy", { description: "Your browser blocked clipboard access." });
                }
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2 text-[11.5px] font-medium text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {copied ? <CheckIcon className="size-3.5 text-[#50fa7b]" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-[50vh] overflow-auto px-3.5 py-3 font-mono text-[12px] leading-[1.6]">{json}</pre>
        </div>
        {doc?.synthetic && (
          <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Synthetic reading from the GANGA simulator. The write and this read-back are real.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
