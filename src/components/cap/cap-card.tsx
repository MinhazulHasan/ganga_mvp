"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  MountainIcon,
  SirenIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import type { CapFields } from "@/lib/engine";
import { cn } from "@/lib/utils";

type Lang = "en-US" | "ne";

const FACT_HELP: Record<string, string> = {
  Severity: "Extreme: threat to life.",
  Urgency: "Immediate: act now.",
  Certainty: "Likely from two signals. Observed once nodes go silent in order.",
  Response: "Evacuate: leave for high ground.",
  Sent: "Nepal Standard Time, UTC+05:45.",
  Type: "First alert, for the public.",
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Copy failed");
  }
}

/**
 * A CAP 1.2 alert shown as what it says, not as XML. The raw XML stays one click away.
 * Every value here comes from the same fields the engine writes into the XML.
 */
export function CapCard({
  fields,
  xml,
  html,
  dim = false,
  tag,
  className,
}: {
  fields: CapFields;
  xml: string;
  html: string;
  /** not issued yet at the current replay time */
  dim?: boolean;
  /** small badge shown next to "Exercise", e.g. "What-if" */
  tag?: React.ReactNode;
  className?: string;
}) {
  const [lang, setLang] = React.useState<Lang>("en-US");
  const [showXml, setShowXml] = React.useState(false);
  const info = fields.info.find((i) => i.language === lang) ?? fields.info[0];
  const em = fields.state === "EMERGENCY";
  const ne = lang === "ne";
  const neFont = ne ? "font-[family-name:var(--font-devanagari)]" : "";

  const facts: [string, string][] = [
    ["Severity", fields.severity],
    ["Urgency", fields.urgency],
    ["Certainty", fields.certainty],
    ["Response", fields.responseType],
    ["Sent", `${fields.issuedClock} · ${fmtDate(fields.date)}`],
    ["Type", `${fields.msgType} · ${fields.scope}`],
  ];

  const download = () => {
    const name = `${fields.identifier.toLowerCase()}.xml`;
    const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success(`Downloaded ${name}`);
  };

  return (
    <div className={cn("overflow-hidden rounded-[22px] border border-border bg-surface shadow-card transition-opacity", dim && "opacity-70", className)}>
      {/* alert banner */}
      <div className={cn("px-5 pb-5 pt-4 sm:px-6", em ? "bg-emergency-soft" : "bg-warning-soft")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]", em ? "text-emergency" : "text-warning")}>
            {em ? <SirenIcon className="size-4" aria-hidden /> : <TriangleAlertIcon className="size-4" aria-hidden />}
            {em ? "Emergency alert" : "Flood warning"}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            {tag}
            <Badge variant="outline" size="sm" className="bg-surface/70">
              Exercise
            </Badge>
          </span>
        </div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h3 className={cn("text-[21px] font-semibold leading-snug tracking-[-0.02em] sm:text-[23px]", neFont)} lang={ne ? "ne" : "en"}>
            {info.headline}
          </h3>
          <Segmented<Lang>
            size="sm"
            aria-label="Language"
            value={lang}
            onValueChange={(v) => {
              setLang(v);
              toast(v === "ne" ? "नेपाली" : "English");
            }}
            options={[
              { value: "en-US", label: "EN" },
              { value: "ne", label: "नेपाली" },
            ]}
            className="shrink-0"
          />
        </div>
        <p className={cn("mt-2 text-[15px] leading-relaxed text-muted", neFont)} lang={ne ? "ne" : "en"}>
          {info.description}
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-[14px] bg-surface/80 px-4 py-3 hairline">
          <MountainIcon className={cn("mt-0.5 size-4 shrink-0", em ? "text-emergency" : "text-warning")} aria-hidden />
          <p className={cn("text-[15px] font-medium leading-relaxed", neFont)} lang={ne ? "ne" : "en"}>
            {info.instruction}
          </p>
        </div>
      </div>

      {/* facts */}
      <div className="grid grid-cols-2 border-t border-border sm:grid-cols-3">
        {facts.map(([label, value], i) => (
          <button
            key={label}
            type="button"
            onClick={() => toast(label, { description: FACT_HELP[label] })}
            className={cn(
              "flex flex-col items-start gap-0.5 px-5 py-3.5 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 sm:px-6",
              i % 2 === 1 && "border-l border-border sm:border-l-0",
              i % 3 !== 0 && "sm:border-l sm:border-border",
              i >= 2 && "border-t border-border",
              i < 3 && "sm:border-t-0",
            )}
          >
            <span className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-subtle">{label}</span>
            <span className="text-[15px] font-semibold tabular">{value}</span>
          </button>
        ))}
      </div>

      {/* area */}
      <div className="border-t border-border px-5 py-4 sm:px-6">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-subtle">Area · downstream</p>
        {fields.areas.length ? (
          <ol className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-2">
            {fields.areas.map((a, i) => (
              <li key={a} className="flex items-center gap-1.5">
                {i > 0 && <ArrowRightIcon className="size-3.5 text-subtle" aria-hidden />}
                <button
                  type="button"
                  onClick={() =>
                    toast(a, {
                      description:
                        a === fields.village && fields.etaMin ? `Next village. Water in about ${fields.etaMin} min.` : "In the alert area.",
                    })
                  }
                  className={cn(
                    "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/60",
                    a === fields.village
                      ? em
                        ? "bg-emergency-soft text-emergency"
                        : "bg-warning-soft text-warning"
                      : "bg-surface-2 text-foreground hover:bg-surface-3",
                  )}
                >
                  {a}
                  {a === fields.village && fields.etaMin ? <span className="ml-1.5 tabular opacity-80">~{fields.etaMin} min</span> : null}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1.5 text-[14px]">{fields.areaDesc}</p>
        )}
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/50 px-5 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => copyText(fields.identifier, "Alert ID")}
          title="Copy alert ID"
          className="min-w-0 truncate font-mono text-[11.5px] text-subtle outline-none hover:text-foreground focus-visible:text-foreground"
        >
          {fields.identifier}
        </button>
        <span className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowXml((v) => !v)} aria-expanded={showXml}>
            <CodeIcon /> {showXml ? "Hide XML" : "View XML"}
            <ChevronDownIcon className={cn("transition-transform", showXml && "rotate-180")} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => copyText(xml, "CAP XML")} aria-label="Copy XML">
            <CopyIcon />
          </Button>
          <Button variant="ghost" size="sm" onClick={download} aria-label="Download XML">
            <DownloadIcon />
          </Button>
        </span>
      </div>
      {showXml && (
        <div className="border-t border-border">
          <div className="code-block max-h-[420px] overflow-auto rounded-none" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  );
}

/** WARNING / EMERGENCY switch around CapCard, for pages that show both. */
export function CapShowcase({
  variants,
}: {
  variants: Partial<Record<CapFields["state"], { fields: CapFields; xml: string; html: string }>>;
}) {
  const states = (["WARNING", "EMERGENCY"] as const).filter((s) => variants[s]);
  const [state, setState] = React.useState<CapFields["state"]>(states[0] ?? "WARNING");
  const v = variants[state];
  return (
    <div className="flex flex-col gap-4">
      {states.length > 1 && (
        <Segmented<CapFields["state"]>
          size="sm"
          aria-label="Alert level"
          value={state}
          onValueChange={(s) => {
            setState(s);
            toast(s === "EMERGENCY" ? "Emergency alert" : "Warning alert");
          }}
          options={states.map((s) => ({ value: s, label: s === "EMERGENCY" ? "Emergency" : "Warning" }))}
          className="self-start"
        />
      )}
      {v && <CapCard fields={v.fields} xml={v.xml} html={v.html} />}
    </div>
  );
}
