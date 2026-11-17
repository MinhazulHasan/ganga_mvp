"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRightIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Provenance } from "@/components/brand/provenance";
import type { Detail } from "@/app/_components/overview/detail-sheet";
import { RTU_ROLES } from "@/lib/engine/run";
import { aug26 } from "@/lib/engine/scenarios";
import { valley } from "@/content/rtu";
import { cn } from "@/lib/utils";
import { DiagramCard, SvgHit, SvgText } from "./diagram";

const ROWS = [30, 104, 178];

const viaBooster = RTU_ROLES.filter((r) => r.booster).map((r) => r.name);
const direct = RTU_ROLES.filter((r) => !r.booster).map((r) => r.name);

const D = {
  booster: {
    eyebrow: "05 · Relay",
    title: "Mountain signal booster",
    description: "A solar repeater on the ridge. Used only where a peak blocks the line of sight to the station.",
    provenance: "planned",
    rows: [
      { label: "Relays for", value: viaBooster.join(", ") },
      { label: "Not needed for", value: `${direct.join(", ")} (line of sight)` },
    ],
  },
  station: {
    eyebrow: "05 · Edge",
    title: "Local valley station",
    description: "Receives every RTU, runs the fusion engine and fires the siren. None of this needs the internet.",
    provenance: "built",
    rows: [
      { label: "Network", value: "Built and tested at camp" },
      { label: "Fusion engine", value: "Runs in this prototype" },
      { label: "LoRa / VHF receiver", value: "Planned" },
    ],
    links: [
      { href: "/network", label: "See the station network" },
      { href: "/#fusion-engine", label: "How the engine decides" },
    ],
  },
  siren: {
    eyebrow: "05 · Offline warning",
    title: "Village siren",
    description: "Fired by the valley station the moment the engine reaches WARNING. Works with the internet down.",
    provenance: "simulated",
    rows: [{ label: "Needs internet", value: "No" }],
    links: [{ href: "/command-center", label: "See it in the replay" }],
  },
  uplink: {
    eyebrow: "05 · Server upload",
    title: "4G / Internet · MQTT",
    description: "The station pushes readings and alert states to the remote server over cellular or broadband.",
    provenance: "planned",
    rows: [
      { label: "Protocol", value: "MQTT over TLS", mono: true },
      { label: "If it fails", value: "Dashboard shows STALE. Siren still fires." },
    ],
  },
  server: {
    eyebrow: "05 · Remote server",
    title: "Control room and mass SMS",
    description: "Live dashboard, mass SMS to officials and the public, and the post-event report.",
    provenance: "built",
    rows: [
      { label: "Dashboard", value: "Built (Command Center)" },
      { label: "Mass SMS", value: "Simulated" },
      { label: "Post-event report", value: "Built (OpenAI API)" },
    ],
    links: [{ href: "/command-center", label: "Open the Command Center" }],
  },
} satisfies Record<string, Detail>;

function rtuDetail(i: number): Detail {
  const r = RTU_ROLES[i];
  return {
    eyebrow: `05 · RTU ${i + 1}`,
    title: r.name,
    description: r.job,
    provenance: "simulated",
    rows: [
      { label: "Position", value: `${aug26.nodesKm[i]} km from the source` },
      { label: "Path to the station", value: r.booster ? "Via the mountain booster" : "Direct line of sight" },
    ],
  };
}

export function Valley() {
  const [cut, setCut] = React.useState(false);

  const onCut = (v: boolean) => {
    setCut(v);
    if (v) toast("Internet down", { id: "arch-wan", description: "The siren still fires from the valley station. The dashboard shows STALE." });
    else toast("Internet back", { id: "arch-wan", description: "Readings flow to the remote server again." });
  };

  const net = cut ? "stroke-subtle/50" : "stroke-foreground/55";

  return (
    <div className="flex flex-col gap-10">
      <DiagramCard
        label="RTUs to the valley and the server"
        minWidth={760}
        controls={
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium">
            <Switch tone="danger" checked={cut} onCheckedChange={onCut} aria-label="Cut the internet" />
            Cut the internet
          </label>
        }
      >
        <svg viewBox="0 0 1000 300" className="block h-auto w-full" role="img" aria-label="Three RTUs reach the local valley station, two of them through a mountain booster. The station fires the village siren directly and uploads to the remote server over 4G with MQTT.">
          {/* valley floor + mountain */}
          <rect x={0} y={244} width={1000} height={56} className="fill-surface-2" />
          <path d="M256 244 L372 86 L488 244 Z" className="fill-surface-3" />

          {/* radio links */}
          <path d="M192 53 L370 70" className="animate-flow fill-none stroke-foreground/45" strokeWidth={1.6} strokeDasharray="6 6" />
          <path d="M192 127 L370 74" className="animate-flow fill-none stroke-foreground/45" strokeWidth={1.6} strokeDasharray="6 6" />
          <path d="M376 70 L640 112" className="animate-flow fill-none stroke-foreground/45" strokeWidth={1.6} strokeDasharray="6 6" />
          <path d="M192 214 C 232 262 262 262 300 262 H 566" className="animate-flow fill-none stroke-foreground/45" strokeWidth={1.6} strokeDasharray="6 6" />
          <SvgText x={420} y={284} anchor="middle" size={10.5} className="fill-subtle">
            <tspan fontStyle="italic">direct line of sight</tspan>
          </SvgText>

          {/* booster */}
          <SvgHit detail={D.booster} label="Mountain signal booster">
            <rect x={300} y={44} width={144} height={136} className="fill-transparent" />
            <line x1={372} y1={92} x2={372} y2={66} className="stroke-foreground" strokeWidth={2} />
            <circle cx={372} cy={64} r={4.5} className="fill-primary" />
            <SvgText x={372} y={160} anchor="middle" weight={650} className="fill-foreground">
              Mountain booster
            </SvgText>
            <SvgText x={372} y={175} anchor="middle" size={10.5}>
              Solar repeater
            </SvgText>
          </SvgHit>

          {/* RTUs */}
          {RTU_ROLES.map((r, i) => (
            <SvgHit key={r.role} detail={rtuDetail(i)} label={`${r.name}, ${aug26.nodesKm[i]} km`}>
              <rect x={24} y={ROWS[i]} width={168} height={46} rx={10} className="fill-surface stroke-border-strong" strokeWidth={1.2} />
              <rect x={34} y={ROWS[i] + 9} width={28} height={28} rx={7} className="fill-primary" />
              <text x={48} y={ROWS[i] + 28} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-primary-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                {i + 1}
              </text>
              <SvgText x={74} y={ROWS[i] + 21} size={12.5} weight={650} className="fill-foreground">
                {r.name}
              </SvgText>
              <SvgText x={74} y={ROWS[i] + 36} size={10.5}>
                {aug26.nodesKm[i]} km{r.booster ? " · via booster" : " · direct"}
              </SvgText>
            </SvgHit>
          ))}

          {/* station */}
          <SvgHit detail={D.station} label="Local valley station">
            <path d="M566 262 V168 L621 132 L676 168 V262 Z" className="fill-foreground" />
            <line x1={642} y1={146} x2={642} y2={112} className="stroke-foreground" strokeWidth={2} />
            <circle cx={642} cy={110} r={3.5} className="fill-foreground" />
            <SvgText x={621} y={202} anchor="middle" size={12} weight={650} className="fill-background">
              Valley
            </SvgText>
            <SvgText x={621} y={217} anchor="middle" size={12} weight={650} className="fill-background">
              station
            </SvgText>
          </SvgHit>
          <Link href="/#fusion-engine" aria-label="Fusion engine runs here: how it decides" className="outline-none [&:focus-visible>text]:underline [&:hover>text]:underline">
            <SvgText x={621} y={284} anchor="middle" size={10.5} weight={600} className="fill-primary">
              Fusion engine runs here →
            </SvgText>
          </Link>

          {/* siren (offline) */}
          <path d="M676 166 L760 92" className="fill-none stroke-emergency" strokeWidth={2.2} strokeLinecap="round" />
          <SvgHit detail={D.siren} label="Village siren">
            <rect x={760} y={36} width={200} height={70} className="fill-transparent" />
            <rect x={764} y={62} width={13} height={20} rx={2} className="fill-emergency" />
            <path d="M777 62 L798 48 V96 L777 82 Z" className="fill-emergency" />
            <path d="M806 60 q 8 12 0 24 M814 54 q 13 18 0 36" className="fill-none stroke-emergency" strokeWidth={2} strokeLinecap="round" />
            <SvgText x={832} y={68} size={12.5} weight={650} className="fill-emergency">
              Village siren
            </SvgText>
            <SvgText x={832} y={84} size={10.5}>
              Instant · no internet
            </SvgText>
          </SvgHit>

          {/* internet path */}
          <path d="M676 214 H742" className={cn("fill-none transition-[stroke]", net)} strokeWidth={2} strokeDasharray={cut ? "3 5" : undefined} />
          {cut && <path d="M702 205 l14 14 M716 205 l-14 14" className="stroke-emergency" strokeWidth={2.6} strokeLinecap="round" />}
          <SvgHit detail={D.uplink} label="4G or internet uplink, MQTT">
            <g className={cn("transition-opacity duration-300", cut && "opacity-40")}>
              <path d="M752 228 a16 16 0 0 1 4 -31 a22 22 0 0 1 40 -6 a18 18 0 0 1 30 14 a13 13 0 0 1 -2 23 Z" className="fill-surface-2 stroke-border-strong" strokeWidth={1.2} />
              <SvgText x={790} y={219} anchor="middle" size={10.5} weight={650} className="fill-foreground">
                4G / Internet
              </SvgText>
            </g>
            <SvgText x={790} y={250} anchor="middle" size={10.5} className="fill-subtle">
              <tspan style={{ fontFamily: "var(--font-mono)" }}>MQTT</tspan>
            </SvgText>
          </SvgHit>
          <path d="M830 214 H876" className={cn("fill-none transition-[stroke]", net)} strokeWidth={2} strokeDasharray={cut ? "3 5" : undefined} />

          <SvgHit detail={D.server} label="Remote server: control room and mass SMS">
            <g className={cn("transition-opacity duration-300", cut && "opacity-40")}>
              <rect x={880} y={176} width={100} height={78} rx={10} className="fill-foreground" />
              <rect x={894} y={190} width={44} height={5} rx={2} className="fill-background/55" />
              <rect x={894} y={202} width={44} height={5} rx={2} className="fill-background/55" />
              <rect x={894} y={214} width={44} height={5} rx={2} className="fill-background/55" />
              <SvgText x={930} y={242} anchor="middle" size={10.5} weight={650} className="fill-background">
                Remote server
              </SvgText>
            </g>
            <SvgText x={930} y={166} anchor="middle" size={10.5}>
              {cut ? "Dashboard: STALE" : "Control room · mass SMS"}
            </SvgText>
          </SvgHit>
        </svg>
      </DiagramCard>

      <div className="grid gap-6 md:grid-cols-3 md:gap-8">
        {valley.columns.map((c) => (
          <div key={c.title} className="border-t-2 border-foreground pt-4">
            <h3 className="text-[16px] font-semibold tracking-[-0.02em]">{c.title}</h3>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[18px] border border-border bg-surface-2/70 p-5">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">What runs today</p>
        <ul className="grid gap-3 md:grid-cols-3">
          {valley.mapping.map((m) => (
            <li key={m.label}>
              <Link href={m.href} className="group flex h-full flex-col gap-2 rounded-[14px] bg-surface p-4 shadow-soft hairline transition-shadow hover:shadow-card focus-visible:ring-[3px] focus-visible:ring-ring/60 outline-none">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[14.5px] font-semibold tracking-[-0.01em]">{m.label}</span>
                  <ArrowUpRightIcon className="size-4 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="text-[13.5px] leading-relaxed text-muted">{m.value}</span>
                <span className="mt-auto pt-1">
                  <Provenance kind={m.provenance} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
