"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRightIcon, LockIcon, RotateCcwIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { getScenario, RULES, type RunResult, type Scenario } from "@/lib/engine";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { runAtDefaults, runWithWhatIf, useRun, useSim } from "./sim-store";
import { openWhatIf, resetWhatIfs, setWhatIf, setWhatIfOpen } from "./sim-actions";
import { CC_VARS, Caption } from "./bits";
import { IosSlider } from "./ios-slider";
import {
  anchorSummary,
  baseFloodSpeed,
  changedParams,
  fmtWhatIfValue,
  isWhatIfDefault,
  normalizeWhatIf,
  outcomeDiff,
  WHAT_IF_LABEL,
  WHAT_IF_RANGE,
  type WhatIf,
  type WhatIfKey,
} from "./what-if-model";

/* ---------------------------------------------------------------- shared bits */

/** Tailwind's xl breakpoint, live. The server and the first client render assume "below xl". */
function useMinWidth(px: number) {
  return React.useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(`(min-width: ${px}px)`);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(min-width: ${px}px)`).matches,
    () => false
  );
}

const useScenario = () => getScenario(useSim((s) => s.scenarioId));
const useWhatIfActive = () => useSim((s) => !isWhatIfDefault(s.whatIf, getScenario(s.scenarioId)));

/* ---------------------------------------------------------------- trigger + container */

type Kind = "popover" | "sheet";

/** Title, description and close parts for whichever container hosts the panel. */
const PARTS = {
  popover: { Title: PopoverPrimitive.Title, Description: PopoverPrimitive.Description, Close: PopoverPrimitive.Close },
  sheet: { Title: SheetTitle, Description: SheetDescription, Close: SheetClose },
} as const;

/**
 * The What-if button and its panel. Rendered twice (inside the xl console row and in the compact
 * cluster below xl); only the visible one may open, so the panel anchors to the right button.
 * md and up: a non-modal popover, so the page re-runs in view behind it. Phones: a bottom sheet.
 */
export function WhatIfControl({ placement }: { placement: "bar" | "compact" }) {
  const isXl = useMinWidth(1280);
  const isMd = useMinWidth(768);
  const mine = placement === "bar" ? isXl : !isXl;
  const open = useSim((s) => s.whatIfOpen) && mine;
  const active = useWhatIfActive();
  const asSheet = placement === "compact" && !isMd;
  const [tip, setTip] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);

  const button = (
    <Button
      variant={active ? "default" : "secondary"}
      size="sm"
      aria-label={active ? "What-if (values changed)" : "What-if"}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={asSheet ? () => setWhatIfOpen(!open) : undefined}
      className={cn(
        "h-8 gap-1.5 text-[12.5px] [&_svg]:size-3.5",
        !active && "hairline",
        placement === "bar" ? "px-3" : "px-2.5 md:w-8 md:px-0"
      )}
    >
      <SlidersHorizontalIcon aria-hidden />
      <span className={cn(placement === "compact" && "md:hidden")}>What-if</span>
      {active && placement === "bar" && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />}
    </Button>
  );

  if (asSheet) {
    return (
      <>
        {button}
        <Sheet open={open} onOpenChange={setWhatIfOpen}>
          <SheetContent
            ref={sheetRef}
            side="bottom"
            className={cn(CC_VARS, "max-h-[88dvh] text-foreground")}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              sheetRef.current?.focus({ preventScroll: true });
            }}
          >
            <WhatIfPanel kind="sheet" />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  const trigger = <PopoverPrimitive.Trigger asChild>{button}</PopoverPrimitive.Trigger>;
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setWhatIfOpen}>
      {placement === "compact" ? (
        // Icon-only from md up: the tooltip names it (and stays out of the way while the popover is open).
        <Tooltip open={tip && !open} onOpenChange={setTip}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>What-if: heartbeat, geophones, delay, flood speed</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={placement === "bar" ? "start" : "end"}
          side="bottom"
          sideOffset={10}
          collisionPadding={12}
          // Stay open while the console is used (play, scrub, switch) and when focus moves away.
          onPointerDownOutside={(e) => {
            const target = e.detail.originalEvent.target;
            if (target instanceof Element && target.closest("[data-cc-bar], [data-sonner-toaster]")) e.preventDefault();
          }}
          onFocusOutside={(e) => e.preventDefault()}
          className={cn(
            CC_VARS,
            "z-40 flex max-h-[var(--radix-popover-content-available-height)] w-[min(720px,calc(100vw-24px))] origin-[var(--radix-popover-content-transform-origin)] flex-col overflow-hidden rounded-[22px] border border-border bg-surface text-foreground shadow-float outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <WhatIfPanel kind="popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/* ---------------------------------------------------------------- panel */

/** Commit to the page this long after the last slider change (each commit re-renders the whole page). */
const COMMIT_AFTER_MS = 160;

function WhatIfPanel({ kind }: { kind: Kind }) {
  const s = useScenario();
  const whatIf = useSim((st) => st.whatIf);
  const run = useRun();
  const floodBase = baseFloodSpeed(s);
  const { Title, Description, Close } = PARTS[kind];

  // While a thumb moves, the engine re-runs only for the readout (cheap); the page follows after
  // a short pause or on release, so dragging stays smooth.
  const [draft, setDraft] = React.useState<Partial<WhatIf>>({});
  const pending = React.useRef<{ scenarioId: string; values: Partial<WhatIf> } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    // a scenario switch in the meantime drops the draft: it belonged to the other scenario
    if (p && p.scenarioId === useSim.getState().scenarioId) setWhatIf(p.values);
  }, []);
  React.useEffect(() => flush, [flush]); // closing the panel still commits the last move

  const change = (k: WhatIfKey, v: number) => {
    const values = { ...(pending.current?.values ?? {}), [k]: v };
    pending.current = { scenarioId: s.id, values };
    setDraft(values);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
      setDraft({});
    }, COMMIT_AFTER_MS);
  };

  const resetAll = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setDraft({});
    resetWhatIfs();
  };

  const effective = React.useMemo(() => normalizeWhatIf({ ...whatIf, ...draft }, s), [whatIf, draft, s]);
  const preview = React.useDeferredValue(effective);
  const previewRun = runWithWhatIf(run, preview);
  const active = !isWhatIfDefault(effective, s);
  const shown = (k: Exclude<WhatIfKey, "floodSpeedMs">) => draft[k] ?? whatIf[k];

  return (
    <>
      <div className={cn("flex items-start justify-between gap-3 px-5 pb-1 pt-4 md:border-b md:border-border md:pb-3.5", kind === "sheet" && "pr-14 pt-5")}>
        <div className="min-w-0">
          <Title className="text-[16px] font-semibold tracking-[-0.02em]">What-if</Title>
          <Description className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
            Change an assumption. The engine re-runs at once.
          </Description>
        </div>
        {/* the sheet brings its own close button */}
        {kind === "popover" && (
          <Close
            aria-label="Close what-if"
            className="-mr-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted outline-none transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
          >
            <XIcon className="size-3.5" />
          </Close>
        )}
      </div>

      {/* md+: sliders on the left, the live readout on the right; phones: one column */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid md:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <SliderRow
            k="heartbeatS"
            value={shown("heartbeatS")}
            def={s.heartbeatS}
            onChange={change}
            hint={() => `Quiet-RTU report interval. Event mode: every ${RULES.burstS} s.`}
          />
          <SliderRow k="geophoneRangeKm" value={shown("geophoneRangeKm")} def={s.geophoneRangeKm} onChange={change} hint={(v) => geophoneHint(run, v)} />
          <SliderRow k="procDelayS" value={shown("procDelayS")} def={s.procDelayS} onChange={change} hint={() => "Engine time before an alert leaves."} />
          {floodBase !== null ? (
            <SliderRow
              k="floodSpeedMs"
              value={draft.floodSpeedMs ?? whatIf.floodSpeedMs ?? floodBase}
              def={floodBase}
              onChange={change}
              hint={() => "One speed for the whole valley. Illustrative scenarios only."}
            />
          ) : (
            <LockedFloodSpeed s={s} />
          )}
        </div>
        <Readout run={previewRun} active={!isWhatIfDefault(preview, s)} s={s} heartbeatChanged={preview.heartbeatS !== s.heartbeatS} />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <Button variant="ghost" size="sm" disabled={!active} onClick={resetAll} className="text-muted hover:text-foreground">
          <RotateCcwIcon /> Reset what-ifs
        </Button>
        <Close asChild>
          <Button size="sm">Done</Button>
        </Close>
      </div>
    </>
  );
}

function geophoneHint(run: RunResult, km: number): string {
  const inRange = run.nodes.filter((n) => n.km <= km).map((n) => n.id);
  if (!inRange.length) return "No RTU feels the collapse. WATCH waits for rising water.";
  const list = inRange.length > 2 ? `${inRange[0]}–${inRange[inRange.length - 1]}` : inRange.join(" and ");
  return `Feel the collapse: ${list}`;
}

function SliderRow({
  k,
  value,
  def,
  hint,
  onChange,
}: {
  k: WhatIfKey;
  value: number;
  def: number;
  hint: (v: number) => string;
  onChange: (k: WhatIfKey, v: number) => void;
}) {
  const r = WHAT_IF_RANGE[k];
  const changed = value !== def;
  const label = WHAT_IF_LABEL[k];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[14px] font-medium">{label}</span>
        <span className="flex items-center gap-1.5">
          {changed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(k, def)}
                  aria-label={`${label}: back to ${fmtWhatIfValue(k, def)}`}
                  className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] text-subtle outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/60"
                >
                  <RotateCcwIcon className="size-3" aria-hidden />
                  {fmtWhatIfValue(k, def)}
                </button>
              </TooltipTrigger>
              <TooltipContent>Back to the default</TooltipContent>
            </Tooltip>
          )}
          <span
            className={cn(
              "inline-flex h-6 min-w-[58px] items-center justify-center rounded-full px-2 text-[12.5px] font-semibold tabular transition-colors",
              changed ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground hairline"
            )}
          >
            {fmtWhatIfValue(k, value)}
          </span>
        </span>
      </div>
      <IosSlider
        value={value}
        min={r.min}
        max={r.max}
        step={r.step}
        mark={def}
        label={label}
        valueText={fmtWhatIfValue(k, value)}
        className="mt-1"
        onValueChange={(v) => onChange(k, v)}
        onValueCommit={(v) => onChange(k, v)}
      />
      <p className="mt-0.5 text-[11.5px] leading-snug text-subtle">{hint(value)}</p>
    </div>
  );
}

function LockedFloodSpeed({ s }: { s: Scenario }) {
  const why = `Anchored on published timings (${anchorSummary(s)})`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          role="group"
          aria-label={`${WHAT_IF_LABEL.floodSpeedMs} is fixed. ${why}.`}
          className="-m-1.5 cursor-not-allowed rounded-[14px] p-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
        >
          <div className="flex items-center justify-between gap-3 opacity-60">
            <span className="text-[14px] font-medium">{WHAT_IF_LABEL.floodSpeedMs}</span>
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2 text-[12px] font-medium text-muted hairline">
              <LockIcon className="size-3" aria-hidden /> Anchored
            </span>
          </div>
          <div className="mt-1 flex h-8 items-center opacity-60" aria-hidden>
            <div className="h-[5px] w-full rounded-full bg-surface-3" />
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-subtle">{why}.</p>
        </div>
      </TooltipTrigger>
      <TooltipContent>{why}</TooltipContent>
    </Tooltip>
  );
}

/* ---------------------------------------------------------------- readout */

function Readout({ run, active, s, heartbeatChanged }: { run: RunResult; active: boolean; s: Scenario; heartbeatChanged: boolean }) {
  const base = runAtDefaults(run);
  const rows = React.useMemo(() => (base === run ? [] : outcomeDiff(base, run)), [base, run]);
  const alertsHeld = !rows.some((r) => ["WATCH", "WARNING", "EMERGENCY", "public"].includes(r.key));
  return (
    <section
      aria-label="What changed versus the defaults"
      className="mx-3 mb-3 rounded-[16px] border border-border bg-surface-2 px-3.5 py-3 md:m-0 md:rounded-none md:border-y-0 md:border-r-0 md:bg-surface-2/60 md:px-5 md:pb-5 md:pt-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <Caption>What changed</Caption>
        <span className="text-[11px] text-subtle">vs the defaults</span>
      </div>
      {!active ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          All defaults.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">No change in alerts or lead times.</p>
      ) : (
        <>
          <dl className="mt-1.5 divide-y divide-border">
            {rows.map((r) => (
              <div key={r.key} className="flex items-baseline justify-between gap-3 py-[7px] text-[12.5px]">
                <dt className={cn("min-w-0 truncate text-muted", ["WATCH", "WARNING", "EMERGENCY"].includes(r.key) && "text-[11.5px] font-semibold tracking-[0.04em]")}>
                  {r.label}
                </dt>
                <dd className="flex shrink-0 items-center gap-1.5 tabular">
                  <span className="text-subtle">{r.before}</span>
                  <ArrowRightIcon className="size-3 text-subtle" aria-label="to" />
                  <span className="font-semibold text-foreground">{r.after}</span>
                </dd>
              </div>
            ))}
          </dl>
          {heartbeatChanged && alertsHeld && (
            <p className="mt-1.5 text-[12px] leading-snug text-muted">
              Alert times hold. Event mode reports every {RULES.burstS} s.
            </p>
          )}
        </>
      )}
      {active && (
        <p className="mt-3 border-t border-border pt-2.5 text-[12px] leading-snug text-subtle">
          What-if run, not {s.kind === "reconstructed" ? "the reconstructed baseline" : "the scenario as designed"}.
        </p>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- title-row badge */

/** "What-if" badge next to the scenario name, so a what-if run is never mistaken for the baseline. */
export function WhatIfBadge() {
  const s = useScenario();
  const whatIf = useSim((st) => st.whatIf);
  const reduce = useReducedMotion();
  const changes = changedParams(whatIf, s);
  const active = changes.length > 0;
  return (
    <AnimatePresence initial={false}>
      {active && (
        <motion.span
          key="what-if"
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="inline-flex items-center gap-1"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={openWhatIf}
                className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary px-2.5 text-xs font-semibold text-primary-foreground shadow-soft outline-none transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/60"
              >
                <SlidersHorizontalIcon className="size-3.5" aria-hidden />
                What-if
                <span className="font-medium opacity-75">· {changes.length === 1 ? changes[0].label.toLowerCase() : `${changes.length} changes`}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-80">
              {s.kind === "reconstructed" ? "Not the reconstructed baseline. " : "Not the scenario defaults. "}
              {changes.map((c) => `${c.label} ${c.from} → ${c.to}`).join(" · ")}
            </TooltipContent>
          </Tooltip>
          <Button variant="subtle" size="xs" onClick={() => resetWhatIfs()} className="h-6 gap-1 rounded-full px-2 text-xs [&_svg]:size-3.5">
            <RotateCcwIcon aria-hidden /> Reset what-ifs
          </Button>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
