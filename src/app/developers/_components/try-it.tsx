"use client";

import * as React from "react";
import { InfoIcon, LoaderCircleIcon, SendIcon, TerminalIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { CopyButton } from "./copy-button";

type SegControl = { kind: "segmented"; name: string; label: string; options: { value: string; label: string }[]; initial: string };
type SwitchControl = { kind: "switch"; name: string; label: string; hint: string };
type Control = SegControl | SwitchControl;

const SCENARIO: SegControl = {
  kind: "segmented",
  name: "scenario",
  label: "scenario",
  options: [
    { value: "aug26", label: "aug26" },
    { value: "template", label: "template" },
  ],
  initial: "aug26",
};
const WAN: SegControl = {
  kind: "segmented",
  name: "wan",
  label: "wan",
  options: [
    { value: "up", label: "up" },
    { value: "down", label: "down" },
  ],
  initial: "up",
};

const CONTROLS: Record<string, Control[]> = {
  "/api/run": [SCENARIO, WAN, { kind: "switch", name: "eocGsm", label: "eocGsm", hint: "Local GSM SMS for district EOC and operators" }],
  "/api/cap": [
    SCENARIO,
    {
      kind: "segmented",
      name: "state",
      label: "state",
      options: [
        { value: "WARNING", label: "WARNING" },
        { value: "EMERGENCY", label: "EMERGENCY" },
      ],
      initial: "WARNING",
    },
  ],
  "/api/report": [SCENARIO, WAN],
};

type Result = {
  url: string;
  status: number;
  statusText: string;
  ms: number;
  bytes: number;
  kind: "json" | "xml" | "text";
  body: string;
  error?: string;
};

const PREVIEW_LINES = 22;

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "http://localhost:3000";

function initialValues(controls: Control[]) {
  const v: Record<string, string> = {};
  for (const c of controls) v[c.name] = c.kind === "segmented" ? c.initial : "0";
  return v;
}

export function TryIt({ method, path }: { method: string; path: string }) {
  const controls = CONTROLS[path] ?? [];
  const [values, setValues] = React.useState(() => initialValues(controls));
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const origin = React.useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const baseId = React.useId();

  const query = new URLSearchParams(values).toString();
  const relUrl = `${path}?${query}`;
  const curl = `curl -s "${origin}${relUrl}"`;

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  async function send() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setExpanded(false);
    const t0 = performance.now();
    try {
      const res = await fetch(relUrl, { signal: ac.signal, cache: "no-store" });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      const ct = res.headers.get("content-type") ?? "";
      let kind: Result["kind"] = "text";
      let body = text;
      if (ct.includes("json")) {
        kind = "json";
        try {
          body = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          /* keep raw text */
        }
      } else if (ct.includes("xml")) kind = "xml";
      setResult({ url: relUrl, status: res.status, statusText: res.statusText, ms, bytes: new Blob([text]).size, kind, body });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setResult({ url: relUrl, status: 0, statusText: "", ms: Math.round(performance.now() - t0), bytes: 0, kind: "text", body: "", error: "Request did not complete." });
      toast.error("Request failed");
    } finally {
      if (abortRef.current === ac) setLoading(false);
    }
  }

  const lines = result ? result.body.split("\n") : [];
  const truncated = lines.length > PREVIEW_LINES && !expanded;
  const shown = truncated ? lines.slice(0, PREVIEW_LINES).join("\n") : result?.body ?? "";
  const notConfigured = result?.status === 503 && path === "/api/report";
  const tone = !result ? "neutral" : result.status >= 200 && result.status < 300 ? "normal" : result.status === 503 ? "watch" : "warning";

  return (
    <div className="flex flex-col gap-4 rounded-[18px] bg-surface-2 p-4 hairline sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold tracking-[-0.01em]">Try it</p>
        <Badge variant="outline" size="sm">
          Live request
        </Badge>
      </div>

      {controls.length > 0 && (
        <div className="flex flex-col gap-3">
          {controls.map((c) => {
            const id = `${baseId}-${c.name}`;
            return (
              <div key={c.name} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
                <label htmlFor={c.kind === "switch" ? id : undefined} id={`${id}-label`} className="w-20 shrink-0 font-mono text-xs text-muted">
                  {c.label}
                </label>
                {c.kind === "segmented" ? (
                  <Segmented
                    size="sm"
                    aria-label={c.label}
                    value={values[c.name]}
                    onValueChange={(v) => set(c.name, v)}
                    options={c.options}
                    className="self-start"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Switch id={id} checked={values[c.name] === "1"} onCheckedChange={(on) => set(c.name, on ? "1" : "0")} />
                    <span className="text-xs text-muted">{c.hint}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex min-w-0 items-center gap-2 rounded-[12px] bg-surface px-3 py-2 hairline">
        <TerminalIcon className="size-3.5 shrink-0 text-subtle" aria-hidden />
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground" tabIndex={0} aria-label="curl command">
          {curl}
        </code>
        <CopyButton text={curl} message="curl command copied" size="xs" variant="subtle" />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={send} disabled={loading} size="md" aria-label={`Send ${method} request to ${path}`}>
          {loading ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <SendIcon aria-hidden />}
          {loading ? "Sending" : "Send request"}
        </Button>
        <span className="min-w-0 truncate font-mono text-xs text-subtle">{method} {relUrl}</span>
      </div>

      <div aria-live="polite" className="min-w-0">
        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {result.error ? (
                <Badge variant="warning" size="md">Failed</Badge>
              ) : (
                <Badge variant={tone} size="md" className="tabular">
                  {result.status} {result.statusText}
                </Badge>
              )}
              <Badge variant="neutral" size="md" className="tabular bg-surface">{result.ms} ms</Badge>
              {!result.error && (
                <Badge variant="neutral" size="md" className="tabular bg-surface">
                  {result.bytes > 1024 ? `${(result.bytes / 1024).toFixed(1)} KB` : `${result.bytes} B`}
                </Badge>
              )}
              {!result.error && (
                <Badge variant="neutral" size="md" className="bg-surface uppercase">{result.kind}</Badge>
              )}
              {!result.error && !notConfigured && (
                <span className="ml-auto">
                  <CopyButton text={result.body} message="Response copied" label="Copy response" size="xs" variant="subtle" />
                </span>
              )}
            </div>

            {notConfigured && (
              <div className="flex gap-3 rounded-[14px] bg-watch-soft p-3.5 text-[13px] leading-relaxed text-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-watch" aria-hidden />
                <p>
                  <span className="font-semibold">Report not configured.</span> Returns 503 until the
                  server has <code className="font-mono text-xs">OPENAI_API_KEY</code> set.
                </p>
              </div>
            )}

            {result.error ? (
              <p className="text-[13px] text-muted">{result.error}</p>
            ) : (
              <div className="min-w-0 rounded-[14px] bg-surface hairline">
                <pre
                  tabIndex={0}
                  className={`overflow-auto p-4 font-mono text-xs leading-[1.65] text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 rounded-[14px] ${expanded ? "max-h-[440px]" : ""}`}
                >
                  {shown}
                  {truncated ? "\n…" : ""}
                </pre>
                {lines.length > PREVIEW_LINES && (
                  <div className="border-t border-border px-4 py-2">
                    <Button type="button" variant="link" size="xs" onClick={() => setExpanded((e) => !e)} className="text-[13px] text-muted hover:text-foreground">
                      {expanded ? "Show less" : `Show all (${lines.length} lines)`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
