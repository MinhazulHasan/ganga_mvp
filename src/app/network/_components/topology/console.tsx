"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtClock, type IosLine } from "../net-utils";

/* ------------------------------------------------------------------
   Console model: finished lines + one line being typed + a queue.
   Timestamps are passed in with each action, so the reducer stays pure.
------------------------------------------------------------------- */
export type ConLine = IosLine & { id: number; ts: number | null };
type Typing = { line: ConLine & { kind: "cmd" }; shown: number };
export type ConState = { lines: ConLine[]; typing: Typing | null; queue: IosLine[]; prompt: string; nextId: number };
export type ConAction = { type: "run"; seq: IosLine[]; now: number; instant: boolean } | { type: "tick"; now: number };

const MAX_LINES = 80;
const cap = (lines: ConLine[]) => (lines.length > MAX_LINES ? lines.slice(lines.length - MAX_LINES) : lines);

export function initConsole(intro: IosLine[], prompt: string): ConState {
  return { lines: intro.map((l, i) => ({ ...l, id: i, ts: null })), typing: null, queue: [], prompt, nextId: intro.length };
}

export function consoleReducer(s: ConState, a: ConAction): ConState {
  if (a.type === "run") {
    // Finish whatever is still running instantly, then start the new sequence.
    const lines = [...s.lines];
    let { nextId, prompt } = s;
    if (s.typing) {
      lines.push(s.typing.line);
      prompt = s.typing.line.prompt;
    }
    const flush = (l: IosLine) => {
      lines.push({ ...l, id: nextId++, ts: a.now });
      if (l.kind === "cmd") prompt = l.prompt;
    };
    s.queue.forEach(flush);
    if (a.instant) {
      a.seq.forEach(flush);
      return { lines: cap(lines), typing: null, queue: [], prompt, nextId };
    }
    return { lines: cap(lines), typing: null, queue: [...a.seq], prompt, nextId };
  }

  if (s.typing) {
    const shown = s.typing.shown + 1;
    if (shown >= s.typing.line.text.length) {
      return { ...s, lines: cap([...s.lines, s.typing.line]), typing: null, prompt: s.typing.line.prompt };
    }
    return { ...s, typing: { ...s.typing, shown } };
  }
  if (!s.queue.length) return s;
  const [next, ...rest] = s.queue;
  if (next.kind === "cmd") {
    return { ...s, queue: rest, nextId: s.nextId + 1, prompt: next.prompt, typing: { line: { ...next, id: s.nextId, ts: a.now }, shown: 0 } };
  }
  return { ...s, queue: rest, nextId: s.nextId + 1, lines: cap([...s.lines, { ...next, id: s.nextId, ts: a.now }]) };
}

/** Drives the typing animation with timers (setState only happens inside timer callbacks). */
export function useConsoleTicker(state: ConState, dispatch: React.Dispatch<ConAction>) {
  React.useEffect(() => {
    if (!state.typing && state.queue.length === 0) return;
    let delay: number;
    if (state.typing) {
      delay = 16 + Math.random() * 28;
    } else {
      const next = state.queue[0];
      const prev = state.lines[state.lines.length - 1];
      delay = next.kind === "cmd" ? 240 : next.kind === "note" ? 420 : prev?.kind === "cmd" ? 320 : 150;
    }
    const t = window.setTimeout(() => dispatch({ type: "tick", now: Date.now() }), delay);
    return () => window.clearTimeout(t);
  }, [state, dispatch]);
}

/* ------------------------------------------------------------------ */

function LogText({ text }: { text: string }) {
  if (/Destination host unreachable|^Request timed out/.test(text)) return <span className="text-[#ffb86c]">{text}</span>;
  if (/^Reply from .*TTL=/.test(text)) return <span className="text-[#50fa7b]">{text}</span>;
  if (/^O\*E2 /.test(text)) return <span className="text-[#8be9fd]">{text}</span>;
  const m = text.match(/^(%[A-Z0-9_]+-\d-[A-Z0-9_]+:)(.*)$/);
  if (!m) return <>{text}</>;
  const s = m[2].match(/^(.*changed state to )(administratively down|down|up)(.*)$/);
  return (
    <>
      <span className="text-[#ff79c6]">{m[1]}</span>
      {s ? (
        <>
          {s[1]}
          <span className={s[2] === "up" ? "text-[#50fa7b]" : "text-[#ffb86c]"}>{s[2]}</span>
          {s[3]}
        </>
      ) : (
        m[2]
      )}
    </>
  );
}

function Cursor() {
  return <span className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-[#f8f8f2]/85" aria-hidden />;
}

function Prompt({ children }: { children: React.ReactNode }) {
  return <span className="text-[#50fa7b]">{children}</span>;
}

function Gutter({ ts }: { ts: number | null }) {
  // Mobile: timestamp sits inline before the text. sm and up: a gutter column; unstamped lines keep an
  // invisible placeholder so the column never jumps when the first timestamp appears.
  return (
    <span
      className={cn("mr-2 select-none whitespace-nowrap text-[#6272a4] tabular sm:mr-0", !ts && "hidden sm:inline")}
      aria-hidden={ts ? undefined : true}
    >
      {ts ? fmtClock(ts) : <span className="invisible">00:00:00.000</span>}
    </span>
  );
}

export function ConsolePanel({ state, title, className }: { state: ConState; title: string; className?: string }) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state]);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  // While the router is printing log lines there is no prompt; before a command, show that command's prompt.
  const next = state.queue[0];
  const idle = state.queue.length === 0 ? state.prompt : next?.kind === "cmd" ? next.prompt : null;

  const copy = async () => {
    const all = [...state.lines, ...(state.typing ? [state.typing.line] : [])];
    const text = all
      .map((l) => `${l.ts ? `${fmtClock(l.ts)}  ` : ""}${l.kind === "cmd" ? `${l.prompt} ${l.text}` : l.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Console log copied", { description: `${all.length} lines from ${title}` });
    } catch {
      toast("Couldn't copy", { description: "Your browser blocked clipboard access." });
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-[18px] bg-[var(--net-term-bg)] text-[#f8f8f2] ring-1 ring-black/5 dark:ring-white/[0.06]", className)}>
      <div className="flex h-10 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[var(--net-term-bar)] px-3.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </span>
        <span className="flex-1 truncate text-center font-mono text-[11.5px] text-white/55">{title} — console</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-7 items-center gap-1.5 rounded-[8px] px-2 text-[11.5px] font-medium text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {copied ? <CheckIcon className="size-3.5 text-[#50fa7b]" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy log"}
        </button>
      </div>
      <div
        ref={bodyRef}
        role="log"
        aria-label={`${title} console output`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 font-mono text-[11px] leading-[1.7] [scrollbar-color:rgb(255_255_255/0.18)_transparent] [scrollbar-width:thin] sm:text-[11.5px]"
      >
        <div className="sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-3">
          {state.lines.map((l) => (
            <div key={l.id} className="sm:contents">
              <Gutter ts={l.ts} />
              <span className={cn("whitespace-pre-wrap break-words", l.kind === "note" && "italic text-[#6272a4]")}>
                {l.kind === "cmd" ? (
                  <>
                    <Prompt>{l.prompt}</Prompt> {l.text}
                  </>
                ) : l.kind === "log" ? (
                  <LogText text={l.text} />
                ) : (
                  l.text
                )}
              </span>
            </div>
          ))}
          {state.typing ? (
            <div className="sm:contents">
              <Gutter ts={state.typing.line.ts} />
              <span className="whitespace-pre-wrap break-words">
                <Prompt>{state.typing.line.prompt}</Prompt> {state.typing.line.text.slice(0, state.typing.shown)}
                <Cursor />
              </span>
            </div>
          ) : (
            idle && (
              <div className="sm:contents">
                <Gutter ts={null} />
                <span>
                  <Prompt>{idle}</Prompt> <Cursor />
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
