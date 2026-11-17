"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  BatteryFullIcon,
  ChevronLeftIcon,
  CircleCheckIcon,
  CloudIcon,
  CloudOffIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  SignalIcon,
  SparklesIcon,
  WifiIcon,
} from "lucide-react";
import { buildCap, buildMessage, capFields, deliveryStatusAt, getScenario, type AlertMessage, type CapState, type RunResult, type ScenarioId } from "@/lib/engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CapCard } from "@/components/cap/cap-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import { clock, smsParts, tplus } from "./format";
import { Caption } from "./bits";
import { Markdown } from "./markdown";
import { publicDeliveries } from "./derive";
import { highlightXml } from "./xml-highlight";
import { isWhatIfDefault } from "./what-if-model";
import { isTeamBroadcast } from "./broadcast-model";

export type CapBundle = Record<ScenarioId, Record<CapState, { xml: string; html: string } | null>>;

export function AlertOutput({ caps, className }: { caps: CapBundle; className?: string }) {
  const [state, setState] = React.useState<CapState>("WARNING");
  return (
    <Card className={cn("overflow-hidden", className)}>
      <Tabs defaultValue="cap" className="gap-0">
        <div className="flex flex-col gap-4 px-5 pt-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Alert output</CardTitle>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">CAP alert, resident messages and the post-event report.</p>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 scrollbar-none">
            <TabsList>
              <TabsTrigger value="cap">
                <FileTextIcon /> CAP 1.2
              </TabsTrigger>
              <TabsTrigger value="message">
                <MessageSquareTextIcon /> Public message
              </TabsTrigger>
              <TabsTrigger value="report">
                <SparklesIcon /> Post-event report
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="cap" className="px-5 pb-5 pt-4">
          <CapPanel caps={caps} state={state} onState={setState} />
        </TabsContent>
        <TabsContent value="message" className="px-5 pb-5 pt-4">
          <MessagePanel state={state} onState={setState} />
        </TabsContent>
        <TabsContent value="report" className="px-5 pb-5 pt-4">
          <ReportPanel />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function StateSwitch({ state, onState }: { state: CapState; onState: (s: CapState) => void }) {
  return (
    <Segmented<CapState>
      size="sm"
      aria-label="Alert level"
      value={state}
      onValueChange={onState}
      options={[
        { value: "WARNING", label: "Warning" },
        { value: "EMERGENCY", label: "Emergency" },
      ]}
    />
  );
}

function IssuedBadge({ run, msg }: { run: RunResult; msg: AlertMessage | null }) {
  const s = run.scenario;
  const issued = useSim((st) => msg !== null && st.t >= msg.issuedMin);
  if (!msg) return <Badge variant="neutral">Not issued in this run</Badge>;
  return issued ? (
    <Badge variant="normal" size="md" className="tabular">
      <CircleCheckIcon aria-hidden /> Issued {clock(s, msg.issuedMin)} · {tplus(msg.issuedMin)}
    </Badge>
  ) : (
    <Badge variant="outline" size="md" className="tabular">
      Issues at {clock(s, msg.issuedMin)} in this replay
    </Badge>
  );
}

/* ---------------------------------------------------------------- CAP */

function CapPanel({ caps, state, onState }: { caps: CapBundle; state: CapState; onState: (s: CapState) => void }) {
  const run = useRun();
  const s = run.scenario;
  // The server highlights the baseline CAP. A what-if run (e.g. a longer processing delay) issues a
  // different CAP: build it here from the same engine and highlight it with the same colours.
  const cap = React.useMemo(() => {
    const server = caps[s.id]?.[state] ?? null;
    const xml = buildCap(run, state);
    const fields = capFields(run, state);
    if (!xml || !fields) return null;
    if (server && server.xml === xml) return { xml, fields, html: server.html, whatIf: false };
    return { xml, fields, html: highlightXml(xml), whatIf: true };
  }, [caps, run, s.id, state]);
  const msg = React.useMemo(() => buildMessage(run, state), [run, state]);
  const issued = useSim((st) => msg !== null && st.t >= msg.issuedMin);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <StateSwitch state={state} onState={onState} />
        <IssuedBadge run={run} msg={msg} />
        <div className="ml-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <a href={`/api/cap?scenario=${s.id}&state=${state}`} target="_blank" rel="noreferrer">
                  Open /api/cap <ExternalLinkIcon className="size-3.5" />
                </a>
              </Button>
            </TooltipTrigger>
            {cap?.whatIf && <TooltipContent>API serves the baseline, without what-ifs</TooltipContent>}
          </Tooltip>
        </div>
      </div>
      {cap ? (
        <CapCard
          fields={cap.fields}
          xml={cap.xml}
          html={cap.html}
          dim={!issued}
          tag={
            <>
              {cap.whatIf && <Badge variant="solid" size="sm">What-if</Badge>}
              {!issued && <Badge variant="outline" size="sm" className="bg-surface/70">Not issued yet</Badge>}
            </>
          }
        />
      ) : (
        <p className="rounded-[16px] bg-surface-2 px-4 py-10 text-center text-[13px] text-muted">No {state} was issued in this run.</p>
      )}
      <p className="text-[12px] leading-relaxed text-subtle">OASIS CAP 1.2, English and Nepali. Not a real alert.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- public message */

function MessagePanel({ state, onState }: { state: CapState; onState: (s: CapState) => void }) {
  const run = useRun();
  const msg = React.useMemo(() => buildMessage(run, state), [run, state]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <StateSwitch state={state} onState={onState} />
        <IssuedBadge run={run} msg={msg} />
      </div>
      {!msg ? (
        <p className="rounded-[16px] bg-surface-2 px-4 py-10 text-center text-[13px] text-muted">No {state} in this run.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-8">
          <Phone run={run} msg={msg} />
          <MessageNotes run={run} msg={msg} />
        </div>
      )}
    </div>
  );
}

function Phone({ run, msg }: { run: RunResult; msg: AlertMessage }) {
  const time = msg.issuedClock;
  // The SMS channel that actually reaches residents in this run's broadcast settings.
  const sms = publicDeliveries(run)
    .map((d) => run.channels.find((c) => c.id === d.channel))
    .find((c) => c && c.id.startsWith("sms"));
  const bubble =
    "max-w-[86%] rounded-[19px] rounded-bl-[6px] bg-[#e9e9eb] px-3.5 py-2 text-[14px] leading-[1.38] text-black dark:bg-[#26252a] dark:text-white";
  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[48px] bg-[#0c0d28] p-[9px] shadow-float ring-1 ring-black/5 dark:bg-black dark:ring-white/10">
        <div className="relative overflow-hidden rounded-[40px] bg-white text-black dark:bg-black dark:text-white">
          {/* status bar */}
          <div className="flex items-center justify-between px-7 pb-1 pt-3.5 text-[13px] font-semibold tabular">
            <span>{time}</span>
            <span className="absolute left-1/2 top-2.5 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
            <span className="flex items-center gap-1" aria-hidden>
              <SignalIcon className="size-3.5" strokeWidth={2.5} />
              <WifiIcon className="size-3.5" strokeWidth={2.5} />
              <BatteryFullIcon className="size-4" strokeWidth={2} />
            </span>
          </div>
          {/* thread header */}
          <div className="flex flex-col items-center border-b border-black/[0.06] pb-2.5 pt-2 dark:border-white/10">
            <ChevronLeftIcon className="absolute left-3 top-[52px] size-6 text-[#0a84ff]" aria-hidden />
            <span className="flex size-11 items-center justify-center rounded-full bg-linear-to-b from-[#a5abb8] to-[#868c99] text-[17px] font-semibold text-white" aria-hidden>
              G
            </span>
            <span className="mt-1 text-[11.5px] font-medium">GANGA</span>
          </div>
          {/* messages */}
          <div className="flex min-h-[300px] flex-col gap-2 px-3.5 pb-4 pt-3">
            <p className="text-center text-[11px] text-[#8e8e93]">
              Text Message · SMS
              <br />
              Today {time}
            </p>
            <p className={bubble}>{msg.en.sms}</p>
            <p className={cn(bubble, "font-[family-name:var(--font-devanagari)] leading-[1.5]")} lang="ne">
              {msg.ne.sms}
            </p>
            <p className="pl-1 text-[10.5px] text-[#8e8e93]">
              {sms ? sms.name : "No SMS channel reaches residents"} · {run.scenario.region}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 pb-6">
            <span className="flex h-9 flex-1 items-center rounded-full border border-black/10 px-3.5 text-[13px] text-[#8e8e93] dark:border-white/15">
              Text Message · SMS
            </span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[12px] text-subtle">Nepali text: draft, to be checked by a native speaker.</p>
    </div>
  );
}

function MessageNotes({ run, msg }: { run: RunResult; msg: AlertMessage }) {
  const en = smsParts(msg.en.sms);
  const ne = smsParts(msg.ne.sms);
  const publicChannels = React.useMemo(() => publicDeliveries(run), [run]);
  const statusKey = useSim((st) => publicChannels.map((d) => deliveryStatusAt(d, st.t)).join("|"));
  const statuses = statusKey.split("|");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Caption>Full alert text</Caption>
        <p className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">{msg.en.headline}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">{msg.en.description}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed">{msg.en.instruction}</p>
        <p className="mt-3 font-[family-name:var(--font-devanagari)] text-[15px] font-semibold leading-relaxed" lang="ne">
          {msg.ne.headline}
        </p>
        <p className="mt-0.5 font-[family-name:var(--font-devanagari)] text-[14px] leading-relaxed text-muted" lang="ne">
          {msg.ne.instruction}
        </p>
      </div>

      <div>
        <Caption>How residents get it</Caption>
        {publicChannels.length === 0 && (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">No group in the broadcast settings reaches residents, so nobody receives this text.</p>
        )}
        <ul className={cn("mt-2.5 divide-y divide-border overflow-hidden rounded-[16px] bg-surface-2/60 hairline", publicChannels.length === 0 && "hidden")}>
          {publicChannels.map((d, i) => {
            const ch = run.channels.find((c) => c.id === d.channel)!;
            const status = statuses[i];
            return (
              <li key={d.id} className="flex items-start gap-3 px-4 py-3">
                <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px] hairline", ch.needsWan ? "bg-surface text-muted" : "bg-normal-soft text-normal")}>
                  {ch.needsWan ? <CloudIcon className="size-3.5" /> : <SignalIcon className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-[14px] font-medium">{ch.name}</span>
                    <span
                      className={cn(
                        "text-[12px] font-medium tabular",
                        status === "blocked" ? "text-emergency" : status === "delivered" ? "text-normal" : "text-subtle"
                      )}
                    >
                      {status === "blocked" ? "blocked · WAN down" : status === "delivered" ? `arrived ${clock(run.scenario, d.deliverMin)}` : status}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">
                    {ch.latencyS} s after sending · {ch.needsWan ? "needs the WAN uplink" : "works without the WAN"}
                    {ch.id === "siren" && " · sounds for everyone, phone or not"}
                    {ch.id === "cellbc" && " · reaches every phone in range"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-[14px] bg-surface-2/60 px-4 py-3 hairline">
          <p className="text-[12px] text-muted">English SMS</p>
          <p className="mt-0.5 text-[14px] font-medium tabular">
            {en.chars} characters · {en.encoding} · {en.parts} {en.parts === 1 ? "SMS" : "SMS parts"}
          </p>
        </div>
        <div className="rounded-[14px] bg-surface-2/60 px-4 py-3 hairline">
          <p className="text-[12px] text-muted">Nepali SMS</p>
          <p className="mt-0.5 text-[14px] font-medium tabular">
            {ne.chars} characters · {ne.encoding} · {ne.parts} {ne.parts === 1 ? "SMS" : "SMS parts"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- report */

type ReportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; markdown: string; model: string; generatedAt: string; cached: boolean }
  | { status: "error"; message: string; unconfigured: boolean };

function ReportPanel() {
  const run = useRun();
  const s = run.scenario;
  const wanCut = useSim((st) => st.wanDownFromMin !== null);
  const eocGsm = useSim((st) => st.eocGsm);
  const modified = useSim((st) => !isWhatIfDefault(st.whatIf, getScenario(st.scenarioId)) || !isTeamBroadcast(st.broadcast));
  // One report per combination the report depends on, so a changed toggle never shows an older report.
  const reportKey = `${s.id}:${wanCut ? "down" : "up"}:${eocGsm ? "gsm" : "base"}`;
  const [reports, setReports] = React.useState<Record<string, ReportState>>({});
  const report: ReportState = reports[reportKey] ?? { status: "idle" };

  const generate = async () => {
    const id = s.id;
    const key = reportKey;
    setReports((r) => ({ ...r, [key]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/report?scenario=${id}&wan=${wanCut ? "down" : "up"}&eocGsm=${eocGsm ? 1 : 0}`);
      const body = (await res.json().catch(() => ({}))) as { markdown?: string; model?: string; generatedAt?: string; cached?: boolean; error?: string };
      if (!res.ok || !body.markdown) {
        const unconfigured = res.status === 503;
        const message = unconfigured
          ? "Report service not set up here. Alerts do not depend on it."
          : body.error ?? `Report service returned ${res.status}.`;
        setReports((r) => ({ ...r, [key]: { status: "error", message, unconfigured } }));
        toast.error(unconfigured ? "Report service not configured" : "Report failed", { description: message });
        return;
      }
      setReports((r) => ({
        ...r,
        [key]: { status: "done", markdown: body.markdown!, model: body.model ?? "unknown model", generatedAt: body.generatedAt ?? "", cached: !!body.cached },
      }));
      toast.success("Report ready", { description: body.cached ? "From cache" : body.model });
    } catch {
      const message = "Report service unreachable. Try again.";
      setReports((r) => ({ ...r, [key]: { status: "error", message, unconfigured: false } }));
      toast.error("Report failed", { description: message });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge variant="simulated" size="md">
          <SparklesIcon aria-hidden /> LLM (OpenAI) · from engine evidence · not used for alerts
        </Badge>
        <div className="ml-auto">
          <Button size="sm" onClick={generate} disabled={wanCut || report.status === "loading"}>
            {report.status === "done" || report.status === "error" ? <RefreshCwIcon /> : <SparklesIcon />}
            {report.status === "done" ? "Regenerate" : report.status === "error" ? "Try again" : "Generate report"}
          </Button>
        </div>
      </div>

      {modified && !wanCut && (
        <p className="-mt-1 text-[12.5px] leading-relaxed text-muted">
          Report covers the baseline run. Your what-if and broadcast changes are not sent.
        </p>
      )}

      {wanCut ? (
        <div className="flex items-start gap-3 rounded-[16px] bg-surface-2 px-4 py-4 hairline">
          <CloudOffIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="text-[14px] leading-relaxed">
            Cloud unreachable. Alerts did not need it.
            <span className="block text-[13px] text-muted">Restore the WAN to write the report.</span>
          </p>
        </div>
      ) : report.status === "idle" ? (
        <p className="rounded-[16px] bg-surface-2/60 px-4 py-8 text-center text-[13.5px] leading-relaxed text-muted hairline">
          Post-event report from this run&apos;s evidence log.
        </p>
      ) : report.status === "loading" ? (
        <div className="flex flex-col gap-3 rounded-[16px] p-1" aria-busy="true" aria-label="Writing the report">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-3 h-5 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : report.status === "error" ? (
        <div className="flex items-start gap-3 rounded-[16px] bg-surface-2 px-4 py-4 hairline" role="status">
          <CloudOffIcon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <div className="text-[14px] leading-relaxed">
            <p className="font-medium">{report.unconfigured ? "The report is not available here." : "The report could not be written."}</p>
            <p className="text-[13px] text-muted">{report.message}</p>
          </div>
        </div>
      ) : (
        <article className="rounded-[18px] bg-surface-2/50 px-5 py-5 hairline sm:px-7">
          <Markdown source={report.markdown} />
          <p className="mt-5 border-t border-border pt-3 text-[11.5px] text-subtle">
            {report.model}
            {report.generatedAt && ` · ${new Date(report.generatedAt).toLocaleString()}`}
            {report.cached && " · cached"} · {s.kind} scenario
          </p>
        </article>
      )}
    </div>
  );
}
