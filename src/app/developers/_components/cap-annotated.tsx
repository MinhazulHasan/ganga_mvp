"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

interface Note {
  key: string;
  field: string;
  title: string;
  body: React.ReactNode;
  /** Matches the trimmed text of the XML lines this note explains. */
  match: RegExp;
}

export function CapAnnotated({ xml, html, identifier, sent }: { xml: string; html: string; identifier: string; sent: string }) {
  const [active, setActive] = React.useState<string | null>(null);
  const codeRef = React.useRef<HTMLDivElement>(null);

  const notes: Note[] = [
    {
      key: "identifier",
      field: "identifier",
      title: "Unique ID",
      body: (
        <>
          <code className="font-mono text-xs">{identifier}</code>. Same run, same ID.
        </>
      ),
      match: /^<identifier>/,
    },
    {
      key: "sent",
      field: "sent",
      title: "Time with offset",
      body: (
        <>
          <code className="font-mono text-xs">{sent}</code>. <code className="font-mono text-xs">+05:45</code> is Nepal Standard Time. CAP requires an offset on every time.
        </>
      ),
      match: /^<sent>/,
    },
    {
      key: "status",
      field: "status",
      title: "Exercise",
      body: "Not a live public warning. The note field says so too.",
      match: /^<status>|^<note>/,
    },
    {
      key: "msgType",
      field: "msgType",
      title: "Alert",
      body: "First message. A follow-up would use Update or Cancel and reference this identifier.",
      match: /^<msgType>/,
    },
    {
      key: "scope",
      field: "scope",
      title: "Public",
      body: "For anyone in the area. WARNING reaches the public. WATCH stays with officials.",
      match: /^<scope>/,
    },
    {
      key: "info",
      field: "info × 2",
      title: "One per language",
      body: (
        <>
          English (<code className="font-mono text-xs">en-US</code>) and Nepali (<code className="font-mono text-xs">ne</code>).{" "}
          <span className="font-medium text-foreground">Nepali text is a draft.</span> Needs native review.
        </>
      ),
      match: /^<\/?info>|^<language>/,
    },
    {
      key: "category",
      field: "category",
      title: "Geo and Met",
      body: "Geo (debris flow, ground shaking) and Met (water). Receivers can filter on either.",
      match: /^<category>/,
    },
    {
      key: "usc",
      field: "urgency · severity · certainty",
      title: "Urgency, severity, certainty",
      body: "WARNING: Immediate, Extreme, Likely. EMERGENCY: certainty Observed. Set by engine state.",
      match: /^<urgency>|^<severity>|^<certainty>/,
    },
    {
      key: "param",
      field: "parameter GANGA_STATE",
      title: "Engine state",
      body: "Custom parameter: WARNING or EMERGENCY.",
      match: /^<\/?parameter>|^<valueName>|^<value>/,
    },
    {
      key: "area",
      field: "areaDesc",
      title: "Villages ahead of the flood",
      body: "In order down the valley. Only places not yet reached at send time.",
      match: /^<areaDesc>|^<\/?area>/,
    },
  ];

  // Highlight the XML lines for the selected note.
  React.useEffect(() => {
    const root = codeRef.current;
    if (!root) return;
    const note = notes.find((n) => n.key === active);
    let first: HTMLElement | null = null;
    root.querySelectorAll<HTMLElement>(".line").forEach((el) => {
      const hit = !!note && note.match.test((el.textContent ?? "").trim());
      el.toggleAttribute("data-hl", hit);
      if (hit && !first) first = el;
    });
    if (first) {
      const box = root;
      const el = first as HTMLElement;
      const top = el.offsetTop - box.clientHeight / 3;
      box.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function download() {
    const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${identifier}.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${identifier}.xml`);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <Card className="flex min-w-0 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Badge variant="outline" size="md" className="font-mono">XML</Badge>
            <span className="truncate font-mono text-xs text-muted">{identifier}.xml</span>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={xml} message="CAP XML copied" label="Copy" />
            <Button type="button" size="sm" variant="secondary" onClick={download}>
              <DownloadIcon aria-hidden /> Download
            </Button>
          </div>
        </div>
        <div className="relative min-h-[420px] flex-1 p-3">
          <div
            ref={codeRef}
            tabIndex={0}
            aria-label="Annotated CAP 1.2 XML"
            className={cn(
              "code-block max-h-[520px] overflow-auto rounded-[16px] lg:absolute lg:inset-3 lg:max-h-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
              "[&_pre.shiki]:overflow-visible [&_pre.shiki]:w-max [&_pre.shiki]:min-w-full",
              "[&_.line]:inline-block [&_.line]:min-w-full [&_.line]:transition-colors [&_.line]:duration-200",
              "[&_.line[data-hl]]:bg-primary/12 [&_.line[data-hl]]:shadow-[inset_3px_0_0_var(--primary)]"
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </Card>

      <Card className="min-w-0 p-2">
        <p className="px-4 pb-1 pt-3 text-[13px] text-muted">Select a field to highlight it.</p>
        <ul className="flex flex-col">
          {notes.map((n, i) => {
            const on = active === n.key;
            return (
              <li key={n.key} className={cn(i > 0 && "border-t border-border")}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setActive(on ? null : n.key);
                    if (!on) toast(n.field);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-[14px] px-4 py-3 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/60",
                    on && "bg-surface-2"
                  )}
                >
                  <span className="font-mono text-xs font-medium text-muted">{n.field}</span>
                  <span className="text-[15px] font-semibold tracking-[-0.015em]">{n.title}</span>
                  <span className="text-[13px] leading-relaxed text-muted">{n.body}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
