"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CheckIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CloudIcon,
  MegaphoneIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UnplugIcon,
  type LucideIcon,
} from "lucide-react";
import { groupMessages, renderTemplate, type Channel, type Group, type GroupMessage, type RunResult } from "@/lib/engine";
import { STATE_META } from "@/lib/alert-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRun, useSim } from "./sim-store";
import {
  addChannel,
  addGroup,
  cutWan,
  openBroadcast,
  removeChannel,
  removeGroup,
  resetBroadcast,
  restoreWan,
  setBroadcastOpen,
  toggleGroupChannel,
  updateChannel,
  updateGroup,
} from "./sim-actions";
import { CC_VARS } from "./bits";
import { clock, smsParts, tplus } from "./format";
import { publicDeliveries } from "./derive";
import {
  FIX_GROUPS,
  isTeamBroadcast,
  isTeamChannel,
  parseName,
  parseSeconds,
  parseTemplate,
  PLACEHOLDERS,
  unknownPlaceholders,
  type Parsed,
} from "./broadcast-model";

const TRIGGERS = ["WATCH", "WARNING", "EMERGENCY"] as const;

/* ---------------------------------------------------------------- sheet */

/** Broadcast settings: Andrrew's "Broadcast control", modernised. Every valid edit re-runs the engine. */
export function BroadcastEditor() {
  const open = useSim((s) => s.broadcastOpen);
  const contentRef = React.useRef<HTMLDivElement>(null);
  return (
    <Sheet open={open} onOpenChange={setBroadcastOpen}>
      <SheetContent
        ref={contentRef}
        className={cn(CC_VARS, "w-[min(780px,calc(100vw-16px))]")}
        // Focus the sheet itself: jumping into the first field would pop the keyboard on phones.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          contentRef.current?.focus({ preventScroll: true });
        }}
      >
        <EditorBody />
      </SheetContent>
    </Sheet>
  );
}

function EditorBody() {
  const run = useRun();
  const broadcast = useSim((s) => s.broadcast);
  const rev = useSim((s) => s.broadcastRev);
  const eocGsm = useSim((s) => s.eocGsm);
  const custom = !isTeamBroadcast(broadcast);
  const messages = React.useMemo(() => groupMessages(run), [run]);
  // The item just added gets focus (and its name selected) once it mounts.
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const noPublic = !broadcast.groups.some((g) => g.public);

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2.5">
          <SheetTitle>Broadcast settings</SheetTitle>
          {custom ? (
            <Badge variant="solid" size="sm">
              Custom
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Team defaults
            </Badge>
          )}
        </div>
        <SheetDescription>Who gets each alert, and how fast. Changes re-run the replay.</SheetDescription>
        <p className="text-[12px] text-subtle">Broadcast model from Andrrew&apos;s GANGA simulator (USM).</p>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-8 pb-8">
        <LiveSummary run={run} />

        <section aria-labelledby="bc-channels">
          <SectionHead
            id="bc-channels"
            title="Channels"
            description="Latency = send to arrival."
            action={
              <Button variant="outline" size="sm" onClick={() => setFocusId(addChannel())}>
                <PlusIcon /> Add channel
              </Button>
            }
          />
          <div className="mt-3 overflow-hidden rounded-[16px] bg-surface-2/60 hairline">
            <div className="hidden grid-cols-[44px_minmax(0,1fr)_104px_84px_32px] items-center gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle sm:grid">
              <span>On</span>
              <span>Channel</span>
              <span>Latency</span>
              <span>Needs WAN</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {broadcast.channels.map((c) => (
                <ChannelRow
                  key={`${c.id}:${rev}`}
                  c={c}
                  groups={broadcast.groups}
                  autoFocus={focusId === c.id}
                  onFocused={() => setFocusId(null)}
                />
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="bc-groups">
          <SectionHead
            id="bc-groups"
            title="Recipient groups"
            description="Each group is messaged at its trigger state."
            action={
              <Button variant="outline" size="sm" onClick={() => setFocusId(addGroup())}>
                <PlusIcon /> Add group
              </Button>
            }
          />
          {noPublic && (
            <Notice className="mt-3" tone="warning">
              No group reaches residents. No village gets lead time.
            </Notice>
          )}
          {broadcast.groups.length === 0 ? (
            <p className="mt-3 rounded-[16px] bg-surface-2/60 px-4 py-8 text-center text-[13.5px] text-muted hairline">
              No groups. Add one or reset to team defaults.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {broadcast.groups.map((g) => (
                <GroupCard
                  key={`${g.id}:${rev}`}
                  g={g}
                  run={run}
                  channels={broadcast.channels}
                  message={messages.find((m) => m.group.id === g.id)}
                  eocGsm={eocGsm}
                  autoFocus={focusId === g.id}
                  onFocused={() => setFocusId(null)}
                />
              ))}
            </div>
          )}
        </section>
      </SheetBody>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <Button variant="ghost" size="sm" disabled={!custom} onClick={() => resetBroadcast()} className="text-muted hover:text-foreground">
          <RotateCcwIcon /> Reset to team defaults
        </Button>
        <SheetClose asChild>
          <Button size="sm">Done</Button>
        </SheetClose>
      </div>
    </>
  );
}

function SectionHead({ id, title, description, action }: { id: string; title: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2.5">
      <div className="min-w-0">
        <h3 id={id} className="text-[16px] font-semibold tracking-[-0.02em]">
          {title}
        </h3>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[12px] font-medium text-muted">{children}</p>;
}

function Notice({ tone, children, className }: { tone: "warning" | "emergency"; children: React.ReactNode; className?: string }) {
  const Icon = tone === "warning" ? TriangleAlertIcon : UnplugIcon;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-[12px] px-3 py-2 text-[12.5px] leading-snug",
        tone === "warning" ? "bg-warning-soft text-warning" : "bg-emergency-soft text-emergency",
        className
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/* ---------------------------------------------------------------- live summary */

function LiveSummary({ run }: { run: RunResult }) {
  const s = run.scenario;
  const pub = run.summary.firstPublicWarningMin;
  const first = publicDeliveries(run).find((d) => !d.blocked);
  const firstCh = first ? run.channels.find((c) => c.id === first.channel) : undefined;
  const wanAt = useSim((st) => st.wanDownFromMin);
  const blocked = run.groups.filter((g) => g.blockedAll).length;
  const id = React.useId();
  const tile = "rounded-[16px] bg-surface-2 px-3.5 py-3 hairline";
  return (
    <section aria-label="Effect on this run" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className={cn(tile, "flex flex-col")}>
        <p className="text-[12px] leading-snug text-muted">First public warning</p>
        <div className="mt-auto pt-1">
          <p className="text-[19px] font-semibold leading-none tracking-[-0.02em] tabular">{pub !== null ? clock(s, pub) : "None"}</p>
          <p className="mt-1.5 truncate text-[11.5px] text-subtle">
            {pub !== null ? `${tplus(pub)}${firstCh ? ` · ${firstCh.short}` : ""}` : "No public channel gets through"}
          </p>
        </div>
      </div>
      <div className={cn(tile, "flex flex-col")}>
        <p className="text-[12px] leading-snug text-muted">Villages with 10+ min lead</p>
        <div className="mt-auto pt-1">
          <p className="text-[19px] font-semibold leading-none tracking-[-0.02em] tabular">
            {run.summary.villagesWithLead10Ganga}
            <span className="text-[0.7em] font-medium text-subtle"> / {run.summary.villageCount}</span>
          </p>
          <p className="mt-1.5 text-[11.5px] text-subtle">
            Gauge alone: {run.summary.villagesWithLead10Gauge} / {run.summary.villageCount}
          </p>
        </div>
      </div>
      <div className={cn(tile, "col-span-2 flex items-start justify-between gap-3 sm:col-span-1")}>
        <div className="min-w-0">
          <label htmlFor={id} className="block cursor-pointer text-[12px] text-muted">
            WAN down from the start
          </label>
          <p className={cn("mt-1 text-[15px] font-semibold leading-tight", blocked ? "text-emergency" : "text-foreground")}>
            {wanAt === null ? "WAN up" : blocked ? `${blocked} of ${run.groups.length} groups get nothing` : "Every group gets through"}
          </p>
          <p className="mt-1 text-[11.5px] text-subtle">{wanAt === null ? "Test the outage here" : `Cut at ${clock(s, wanAt)}`}</p>
        </div>
        <Switch id={id} tone="danger" checked={wanAt !== null} onCheckedChange={(v) => (v ? cutWan({ at: 0 }) : restoreWan())} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- fields */

const INPUT =
  "h-9 w-full min-w-0 rounded-[10px] bg-surface px-3 text-[14px] text-foreground outline-none hairline transition-shadow placeholder:text-subtle focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--warning-fill)]";

/** Commit edits this long after typing pauses (each commit re-runs the engine and the whole page). */
const COMMIT_AFTER_MS = 250;

/**
 * Draft text for a field: shows what the user types and commits only valid values (the run never
 * sees an empty name or a negative latency). Commits once typing pauses, on blur and on close.
 */
function useDraft<T>(committed: T, show: (v: T) => string, parse: (raw: string) => Parsed<T>, commit: (v: T) => void) {
  const [text, setText] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = React.useRef<{ value: T } | null>(null);
  const commitRef = React.useRef(commit);
  React.useEffect(() => {
    commitRef.current = commit;
  });
  const flush = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (p) commitRef.current(p.value);
  }, []);
  React.useEffect(() => flush, [flush]);

  const value = text ?? show(committed);
  const parsed = text === null ? null : parse(text);
  return {
    value,
    error: parsed && !parsed.ok ? parsed.error : null,
    onChange(next: string) {
      setText(next);
      const p = parse(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current = p.ok ? { value: p.value } : null;
      if (p.ok) timer.current = setTimeout(flush, COMMIT_AFTER_MS);
    },
    onBlur() {
      flush();
      if (text !== null && parse(text).ok) setText(null);
    },
  };
}

function FieldError({ id, error }: { id: string; error: string | null }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-warning">
      <TriangleAlertIcon className="size-3 shrink-0" aria-hidden />
      {error}
    </p>
  );
}

function TextInput({
  label,
  committed,
  parse,
  commit,
  autoFocus,
  onFocused,
  className,
  hint,
}: {
  label: string;
  committed: string;
  parse: (raw: string) => Parsed<string>;
  commit: (v: string) => void;
  autoFocus?: boolean;
  onFocused?: () => void;
  className?: string;
  hint?: React.ReactNode;
}) {
  const d = useDraft(committed, (v) => v, parse, commit);
  const errId = React.useId();
  return (
    <div className="min-w-0">
      <input
        type="text"
        aria-label={label}
        value={d.value}
        onChange={(e) => d.onChange(e.target.value)}
        onBlur={d.onBlur}
        aria-invalid={!!d.error}
        aria-describedby={d.error ? errId : undefined}
        autoFocus={autoFocus}
        onFocus={(e) => {
          if (autoFocus) {
            e.currentTarget.select();
            onFocused?.();
          }
        }}
        className={cn(INPUT, className)}
      />
      {d.error ? <FieldError id={errId} error={d.error} /> : hint}
    </div>
  );
}

function SecondsInput({ label, committed, commit, className }: { label: string; committed: number; commit: (v: number) => void; className?: string }) {
  const d = useDraft(committed, (v) => String(v), parseSeconds, commit);
  const errId = React.useId();
  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={d.value}
          onChange={(e) => d.onChange(e.target.value)}
          onBlur={d.onBlur}
          aria-invalid={!!d.error}
          aria-describedby={d.error ? errId : undefined}
          className={cn(INPUT, "pr-7 tabular")}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-subtle" aria-hidden>
          s
        </span>
      </div>
      <FieldError id={errId} error={d.error} />
    </div>
  );
}

/* ---------------------------------------------------------------- channels */

function ChannelRow({ c, groups, autoFocus, onFocused }: { c: Channel; groups: Group[]; autoFocus: boolean; onFocused: () => void }) {
  const users = groups.filter((g) => g.channels.includes(c.id)).map((g) => g.name);
  const wanId = React.useId();
  const custom = !isTeamChannel(c.id);
  return (
    <li
      className={cn(
        "grid items-start gap-x-3 gap-y-2 px-4 py-3",
        "grid-cols-[44px_minmax(0,1fr)_auto] [grid-template-areas:'on_name_del'_'._meta_meta']",
        "sm:grid-cols-[44px_minmax(0,1fr)_104px_84px_32px] sm:[grid-template-areas:'on_name_lat_wan_del']"
      )}
    >
      <div className="flex h-9 items-center [grid-area:on]">
        <Switch checked={c.enabled} onCheckedChange={(v) => updateChannel(c.id, { enabled: v })} aria-label={`Use ${c.name}`} />
      </div>
      <div className={cn("min-w-0 [grid-area:name]", !c.enabled && "opacity-60")}>
        <TextInput
          label="Channel name"
          committed={c.name}
          parse={parseName}
          commit={(v) => updateChannel(c.id, { name: v })}
          autoFocus={autoFocus}
          onFocused={onFocused}
          hint={
            <p className="mt-1 truncate text-[11.5px] text-subtle">
              {!c.enabled ? "Off · nothing is sent on it" : users.length ? `Used by ${users.join(", ")}` : "Not used by any group yet"}
            </p>
          }
        />
      </div>
      <div className="flex items-start gap-3 [grid-area:meta] sm:contents">
        <SecondsInput
          label={`${c.name} latency in seconds`}
          committed={c.latencyS}
          commit={(v) => updateChannel(c.id, { latencyS: v })}
          className="w-[92px] [grid-area:lat] sm:w-[104px]"
        />
        <div className="flex h-9 items-center gap-2 [grid-area:wan]">
          <Switch id={wanId} checked={c.needsWan} onCheckedChange={(v) => updateChannel(c.id, { needsWan: v })} />
          <label htmlFor={wanId} className="flex cursor-pointer items-center gap-1 text-[12.5px] text-muted">
            <CloudIcon className="hidden size-3.5 sm:block" aria-hidden />
            <span className="whitespace-nowrap sm:sr-only">Needs WAN</span>
            <span className="sr-only"> for {c.name}</span>
          </label>
        </div>
      </div>
      <div className="flex h-9 items-center justify-end [grid-area:del]">
        {custom && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="subtle" size="icon-sm" aria-label={`Remove ${c.name}`} onClick={() => removeChannel(c.id)}>
                <Trash2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove channel</TooltipContent>
          </Tooltip>
        )}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- groups */

function GroupCard({
  g,
  run,
  channels,
  message,
  eocGsm,
  autoFocus,
  onFocused,
}: {
  g: Group;
  run: RunResult;
  channels: Channel[];
  message: GroupMessage | undefined;
  eocGsm: boolean;
  autoFocus: boolean;
  onFocused: () => void;
}) {
  const publicId = React.useId();
  const fixAdds = eocGsm && FIX_GROUPS.includes(g.id) && !g.channels.includes("sms_gsm") && channels.some((c) => c.id === "sms_gsm");
  const chosen = channels.filter((c) => g.channels.includes(c.id) || (fixAdds && c.id === "sms_gsm"));
  return (
    <article className="rounded-[18px] bg-surface-2/60 p-4 hairline sm:p-5" aria-label={g.name}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            label="Group name"
            committed={g.name}
            parse={parseName}
            commit={(v) => updateGroup(g.id, { name: v })}
            autoFocus={autoFocus}
            onFocused={onFocused}
            className="h-10 text-[15px] font-semibold tracking-[-0.01em]"
            hint={<GroupStatus run={run} g={g} />}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="subtle" size="icon-sm" className="mt-1" aria-label={`Remove ${g.name}`} onClick={() => removeGroup(g.id)}>
              <Trash2Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove group</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <div className="min-w-0">
          <FieldLabel>Sent when the engine reaches</FieldLabel>
          <Segmented
            size="sm"
            aria-label={`Trigger state for ${g.name}`}
            value={g.trigger}
            onValueChange={(v) => updateGroup(g.id, { trigger: v })}
            className="w-full"
            options={TRIGGERS.map((st) => {
              const Icon = STATE_META[st].icon;
              return { value: st, label: st, icon: <Icon className={cn("hidden sm:block", g.trigger === st && STATE_META[st].text)} aria-hidden /> };
            })}
          />
        </div>
        <div>
          <FieldLabel>Extra dispatch delay</FieldLabel>
          <SecondsInput label={`Extra dispatch delay for ${g.name}, seconds`} committed={g.dispatchS} commit={(v) => updateGroup(g.id, { dispatchS: v })} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 rounded-[14px] bg-surface px-3.5 py-2.5 hairline">
        <label htmlFor={publicId} className="min-w-0 cursor-pointer">
          <span className="block text-[13.5px] font-medium">Reaches residents</span>
          <span className="block text-[12px] leading-snug text-muted">Counts as a public warning and sets the villages&apos; lead time.</span>
        </label>
        <Switch id={publicId} checked={g.public} onCheckedChange={(v) => updateGroup(g.id, { public: v })} />
      </div>

      <div className="mt-4">
        <FieldLabel>Channels</FieldLabel>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Channels for ${g.name}`}>
          {channels.map((c) => {
            const locked = fixAdds && c.id === "sms_gsm";
            const on = locked || g.channels.includes(c.id);
            return (
              <ChannelChip key={c.id} c={c} on={on} locked={locked} onToggle={() => toggleGroupChannel(g.id, c.id)} />
            );
          })}
        </div>
        {chosen.length === 0 ? (
          <Notice className="mt-2" tone="warning">
            Pick at least one channel.
          </Notice>
        ) : chosen.every((c) => !c.enabled) ? (
          <Notice className="mt-2" tone="warning">
            All its channels are off.
          </Notice>
        ) : null}
      </div>

      <TemplateField g={g} run={run} message={message} />
    </article>
  );
}

function ChannelChip({ c, on, locked, onToggle }: { c: Channel; on: boolean; locked: boolean; onToggle: () => void }) {
  const chip = (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={locked || undefined}
      onClick={() => !locked && onToggle()}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full pl-2.5 pr-3 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/60 [&_svg]:size-3.5 [&_svg]:shrink-0",
        on ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-surface text-muted hairline hover:text-foreground",
        !c.enabled && "opacity-55",
        locked && "cursor-default hover:bg-primary"
      )}
    >
      {on ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
      {c.short}
      {c.needsWan && <CloudIcon className="opacity-70" aria-label="needs the WAN" />}
      {!c.enabled && <span className="text-[11px] font-normal opacity-80">off</span>}
      {locked && <span className="text-[11px] font-normal opacity-80">fix</span>}
    </button>
  );
  if (!locked) return chip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>Added by the local SMS fix</TooltipContent>
    </Tooltip>
  );
}

function GroupStatus({ run, g }: { run: RunResult; g: Group }) {
  const s = run.scenario;
  const gs = run.groups.find((x) => x.id === g.id);
  const line = (Icon: LucideIcon, tone: string, text: React.ReactNode) => (
    <p className={cn("mt-1 flex items-center gap-1.5 text-[12px] leading-snug", tone)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0">{text}</span>
    </p>
  );
  if (!gs) return null;
  if (gs.blockedAll) return line(UnplugIcon, "font-medium text-emergency", "Blocked. All its channels need the WAN.");
  const blocked = run.deliveries.filter((d) => d.group === g.id && d.blocked).length;
  if (gs.firstDeliveryMin !== null)
    return line(
      CircleCheckIcon,
      "text-muted [&_svg]:text-normal",
      <span className="tabular">
        First message {clock(s, gs.firstDeliveryMin)} · {tplus(gs.firstDeliveryMin)}
        {blocked > 0 && <span className="text-emergency"> · {blocked} blocked by the WAN cut</span>}
      </span>
    );
  const any = gs.channels.some((cid) => run.channels.find((c) => c.id === cid)?.enabled);
  return line(CircleDashedIcon, "text-subtle", any ? `${g.trigger} not reached. Nothing sent.` : "Nothing sent.");
}

function TemplateField({ g, run, message }: { g: Group; run: RunResult; message: GroupMessage | undefined }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const d = useDraft(g.template ?? "", (v) => v, parseTemplate, (v) => updateGroup(g.id, { template: v }));
  const errId = React.useId();
  const fieldId = React.useId();
  const unknown = unknownPlaceholders(d.value);
  const s = run.scenario;
  // Render the draft at once (same values groupMessages uses), so the preview never waits for a commit.
  const text =
    message && !d.error
      ? renderTemplate(d.value, { state: g.trigger, village: message.village ?? "your area", eta: message.etaMin ?? "—", river: s.river })
      : message?.text ?? "";
  const parts = message ? smsParts(text) : null;

  const insert = (token: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? d.value.length;
    const end = el?.selectionEnd ?? d.value.length;
    d.onChange(d.value.slice(0, start) + token + d.value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="mt-4">
      <label htmlFor={fieldId} className="mb-1.5 block text-[12px] font-medium text-muted">
        Message template
      </label>
      <textarea
        id={fieldId}
        ref={ref}
        rows={2}
        value={d.value}
        onChange={(e) => d.onChange(e.target.value)}
        onBlur={d.onBlur}
        aria-invalid={!!d.error}
        aria-describedby={d.error ? errId : undefined}
        className={cn(INPUT, "h-auto min-h-[64px] resize-y py-2 text-[13.5px] leading-relaxed")}
      />
      <FieldError id={errId} error={d.error} />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11.5px] text-subtle">Insert</span>
        {PLACEHOLDERS.map((p) => (
          <button
            key={p}
            type="button"
            // keep the caret in the textarea
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(p)}
            className="inline-flex h-6 items-center rounded-[7px] bg-surface px-1.5 font-mono text-[11px] text-muted outline-none hairline transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
          >
            {p}
          </button>
        ))}
        {unknown.length > 0 && (
          <span className="text-[11.5px] text-warning">
            {unknown.join(" ")}: not a placeholder, sent as typed.
          </span>
        )}
      </div>

      {message && (
        <div className="mt-3 rounded-[14px] bg-surface px-3.5 py-3 hairline">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11.5px] text-subtle">
            <span className="tabular">
              Preview ·{" "}
              {message.sendMin !== null ? `sends ${clock(s, message.sendMin)} · ${tplus(message.sendMin)}` : `${g.trigger} is not reached in this run`}
            </span>
            {parts && (
              <span className="tabular">
                {parts.chars} characters · {parts.encoding} · {parts.parts} {parts.parts === 1 ? "SMS" : "SMS parts"}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-[92%] rounded-[18px] rounded-bl-[6px] bg-[#e9e9eb] px-3.5 py-2 text-[13.5px] leading-[1.4] text-black dark:bg-[#3a3b4c] dark:text-[#f8f8f2]">
            {text}
          </p>
          {message.sendMin !== null && /\{(village|eta)\}/.test(d.value) && (
            <p className="mt-1.5 text-[11px] text-subtle">
              {"{village}"} and {"{eta}"} reflect what the engine knew at send time.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- badge */

/** Subtle marker that the broadcast settings differ from the team defaults. Opens the editor. */
export function CustomBroadcastBadge({ className }: { className?: string }) {
  const custom = useSim((s) => !isTeamBroadcast(s.broadcast));
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {custom && (
        <motion.button
          key="custom-broadcast"
          type="button"
          onClick={openBroadcast}
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className={cn(
            "inline-flex h-6 items-center gap-1.5 rounded-full border border-border-strong px-2.5 text-xs font-medium text-muted outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60 [&_svg]:size-3.5",
            className
          )}
        >
          <MegaphoneIcon aria-hidden />
          Custom broadcast
        </motion.button>
      )}
    </AnimatePresence>
  );
}
