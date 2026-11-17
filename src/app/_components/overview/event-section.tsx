import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  GaugeIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  MountainSnowIcon,
  LayoutDashboardIcon,
  WavesIcon,
  EyeOffIcon,
  FlaskConicalIcon,
  type LucideIcon,
} from "lucide-react";
import { event, gaugeReplay, sources } from "@/content/event";
import { contextLesson, contextStats } from "@/content/context";
import { Section } from "@/components/layout/section";
import { Appear } from "./appear";
import { cn } from "@/lib/utils";
import { DetailTrigger, type Detail } from "./detail-sheet";
import { fmtDuration, minutesAfterTrigger, type OverviewFacts } from "./facts";

type Fact = (typeof event.facts)[number];

function sourceOf(id: string): Detail["source"] {
  const s = sources[id];
  return s ? { label: s.label, url: s.url, note: s.note } : undefined;
}

function addMinutes(clock: string, min: number) {
  const [h, m] = clock.split(":").map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

type TimelineItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  time: string;
  approx?: boolean;
  offset: string;
  detail: string;
  sourceId: string;
  sheet: Detail;
};

export function EventSection({ facts }: { facts: OverviewFacts }) {
  const fact = (label: string) => event.facts.find((f) => f.label === label) as Fact | undefined;
  const trigger = fact("Trigger");
  const border = fact("Border reached");
  const sms = fact("First SMS");
  const path = fact("Path");
  const rise = fact("River rise");

  const offsetLabel = (min: number) => (min <= 0 ? "T+0" : `T+${fmtDuration(min)}`);
  const smsMin = sms ? Number(sms.value.replace(/[^\d]/g, "")) : null;
  const borderMin = border ? minutesAfterTrigger(border.value, event.triggerLocal) : null;
  const gaugeMin = minutesAfterTrigger(gaugeReplay.firstCrossing, event.triggerLocal);
  const peak = Math.max(...gaugeReplay.points.map((p) => p.levelM));

  const items: TimelineItem[] = [];
  if (trigger) {
    items.push({
      key: "trigger",
      icon: MountainSnowIcon,
      label: trigger.label,
      time: trigger.value,
      offset: "T+0",
      detail: trigger.detail,
      sourceId: trigger.source,
      sheet: {
        eyebrow: `26 August 2026 · ${trigger.value}`,
        title: "Rock-ice avalanche",
        description: trigger.detail,
        rows: [
          { label: "Local time", value: event.triggerLocal, mono: true },
          { label: "UTC", value: event.triggerUtc, mono: true },
          { label: "Region", value: event.region },
        ],
        source: sourceOf(trigger.source),
      },
    });
  }
  if (border && borderMin !== null) {
    items.push({
      key: "border",
      icon: MapPinIcon,
      label: border.label,
      time: border.value,
      offset: offsetLabel(borderMin),
      detail: border.detail,
      sourceId: border.source,
      sheet: {
        eyebrow: `26 August 2026 · ${border.value}`,
        title: "Flood reaches the border",
        description: border.detail,
        rows: [
          { label: "Place", value: "Rasuwagadhi, Nepal–China border" },
          { label: "After the trigger", value: fmtDuration(borderMin) },
        ],
        source: sourceOf(border.source),
      },
    });
  }
  if (sms && smsMin !== null) {
    items.push({
      key: "sms",
      icon: MessageSquareTextIcon,
      label: sms.label,
      time: addMinutes(event.triggerLocal, smsMin),
      approx: true,
      offset: `T+${smsMin} min`,
      detail: sms.detail,
      sourceId: sms.source,
      sheet: {
        eyebrow: `26 August 2026 · ${sms.value}`,
        title: "First SMS sent",
        description: sms.detail,
        rows: [
          { label: "After the collapse", value: sms.value },
          { label: "Clock time (derived)", value: `≈ ${addMinutes(event.triggerLocal, smsMin)}`, mono: true },
        ],
        note: "Derived from the 08:37 trigger plus the reported 38 minutes.",
        source: sourceOf(sms.source),
      },
    });
  }
  items.push({
    key: "gauge",
    icon: GaugeIcon,
    label: "Gauge crossed",
    time: gaugeReplay.firstCrossing,
    offset: offsetLabel(gaugeMin),
    detail: `The gauge about ${gaugeReplay.gaugeKm} km downstream crossed its ${gaugeReplay.amberThresholdM} m amber threshold.`,
    sourceId: "deck",
    sheet: {
      eyebrow: `26 August 2026 · ${gaugeReplay.firstCrossing}`,
      title: "Downstream gauge crosses amber",
      description: `It alarms only when the water reaches it, about ${gaugeReplay.gaugeKm} km below the source.`,
      rows: [
        { label: "Amber threshold", value: `${gaugeReplay.amberThresholdM} m` },
        { label: "First crossing", value: gaugeReplay.firstCrossing, mono: true },
        { label: "Highest reading", value: `${peak} m` },
        { label: "After the trigger", value: fmtDuration(gaugeMin) },
      ],
      note: gaugeReplay.note,
      source: sourceOf("deck"),
      links: [{ href: "#proof-chart", label: "See the gauge chart" }],
    },
  });

  const firstVillage = facts.villages[0];
  const fp = facts.firstPublic;

  return (
    <Section
      id="what-happened"
      className="scroll-mt-14"
      tone="muted"
      eyebrow="The Rasuwa flood · 26 August 2026"
      title={
        <>
          {borderMin ?? 7} minutes to the border.
          <br className="hidden sm:block" /> {smsMin ?? 38} minutes to the first SMS.
        </>
      }
      description={path?.detail}
    >
      {path && (
        <Appear className="-mt-4 mb-8 flex flex-wrap items-center gap-2 text-[13px] sm:-mt-6">
          {path.value.split(" → ").map((stop, i, all) => (
            <React.Fragment key={stop}>
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-3 font-medium hairline">
                <WavesIcon className="size-3.5 text-subtle" aria-hidden />
                {stop}
              </span>
              {i < all.length - 1 && <ArrowRightIcon className="size-3.5 text-subtle" aria-hidden />}
            </React.Fragment>
          ))}
          <span className="ml-1 text-subtle">Source: {sources[path.source]?.label.split(" — ")[0]}</span>
        </Appear>
      )}

      {/* timeline */}
      <Appear>
        <ol className="grid grid-cols-1 overflow-hidden rounded-[24px] border border-border bg-surface shadow-card lg:grid-cols-4">
          {items.map((it, i) => {
            const Icon = it.icon;
            const last = i === items.length - 1;
            return (
              <li key={it.key} className={cn("relative", !last && "border-b border-border lg:border-b-0 lg:border-r")}>
                <DetailTrigger
                  detail={it.sheet}
                  className="group flex h-full w-full gap-4 p-6 transition-colors duration-200 hover:bg-surface-2/60 focus-visible:ring-inset lg:flex-col lg:gap-0 lg:p-7"
                >
                  <span className="flex items-center self-start lg:mb-6 lg:w-full lg:self-auto">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-[13px] bg-surface-2 text-foreground transition-colors group-hover:bg-surface-3",
                        it.key === "trigger" && "bg-emergency-soft text-emergency group-hover:bg-emergency-soft"
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span aria-hidden className="ml-3 hidden h-px flex-1 bg-border-strong lg:block" />
                    <span className="ml-3 hidden font-mono text-[11px] text-subtle tabular lg:block">{it.offset}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">{it.label}</span>
                    <span className="mt-2 flex items-baseline gap-2">
                      <span className="text-[34px] font-semibold leading-none tracking-[-0.035em] tabular">
                        {it.approx && <span className="mr-0.5 text-[24px] font-medium text-subtle">≈</span>}
                        {it.time}
                      </span>
                      <span className="font-mono text-[11px] text-subtle tabular lg:hidden">{it.offset}</span>
                    </span>
                    <span className="mt-3 text-[14px] leading-relaxed text-muted">{it.detail}</span>
                    <span className="mt-auto flex items-center gap-1 pt-4 text-[12px] text-subtle">
                      {sources[it.sourceId]?.label.split(" — ")[0].split(" (")[0]}
                      <ArrowUpRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </span>
                  </span>
                </DetailTrigger>
              </li>
            );
          })}
        </ol>
      </Appear>

      {/* what GANGA would have changed + supporting facts */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {fp && firstVillage?.leadGanga != null && (
          <Appear className="h-full">
            <Link
              href="/command-center?autoplay=1"
              className="group flex h-full flex-col rounded-[22px] bg-primary p-6 text-primary-foreground shadow-card outline-none transition-[box-shadow,background-color] duration-200 hover:bg-primary/94 hover:shadow-float focus-visible:ring-[3px] focus-visible:ring-ring/60"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] opacity-75">
                  <LayoutDashboardIcon className="size-4" aria-hidden /> In the GANGA replay
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-medium dark:bg-black/10">
                  <FlaskConicalIcon className="size-3" aria-hidden /> Simulated
                </span>
              </div>
              <p className="mt-4 text-[22px] font-semibold leading-snug tracking-[-0.02em]">
                Residents warned at <span className="tabular">{fp.clock}</span>
              </p>
              <p className="mt-2 text-[14px] leading-relaxed opacity-80">
                {fp.t} after the avalanche. {firstVillage.leadGanga.toFixed(1)} min before the water reached {firstVillage.name.split(" / ")[0]}.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 pt-5 text-[13px] font-medium opacity-80 transition-opacity group-hover:opacity-100">
                Watch the replay <ArrowUpRightIcon className="size-3.5" aria-hidden />
              </span>
            </Link>
          </Appear>
        )}
        {rise && (
          <Appear className="h-full" delay={0.05}>
            <FactCard
              icon={WavesIcon}
              label={rise.label}
              value={rise.value}
              detail={rise.detail}
              sourceId={rise.source}
              sheet={{
                eyebrow: "26 August 2026 · reported",
                title: `River rise: ${rise.value}`,
                description: rise.detail,
                source: sourceOf(rise.source),
              }}
            />
          </Appear>
        )}
        <Appear className="h-full" delay={0.1}>
          <FactCard
            icon={EyeOffIcon}
            label="Monitoring gap"
            value="No early warning"
            detail={event.monitoringGap}
            sourceId={event.monitoringGapSource}
            sheet={{
              eyebrow: "Monitoring gap",
              title: "No glacier early warning at the site",
              description: event.monitoringGap,
              source: sourceOf(event.monitoringGapSource),
            }}
          />
        </Appear>
      </div>

      {/* wider context */}
      <div className="mt-16 grid grid-cols-1 gap-10 border-t border-border pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <Appear>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-subtle">The wider risk</p>
          <h3 className="mt-4 text-[26px] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[28px]">{contextLesson.title}</h3>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">{contextLesson.body}</p>
        </Appear>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {contextStats.map((s, i) => (
            <Appear key={s.label} delay={i * 0.05} className="h-full">
              <div className="flex h-full flex-col rounded-[20px] border border-border bg-surface p-5">
                <span className="text-[40px] font-semibold leading-none tracking-[-0.04em]">
                  {"isYear" in s && s.isYear ? s.value : s.value.toLocaleString("en-US")}
                </span>
                <span className="mt-3 text-[14.5px] font-medium leading-snug">{s.label}</span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.detail}</span>
                <span className="mt-auto pt-4 text-[12px] text-subtle">Source: {s.source}</span>
              </div>
            </Appear>
          ))}
        </div>
      </div>
    </Section>
  );
}

function FactCard({
  icon: Icon,
  label,
  value,
  detail,
  sourceId,
  sheet,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  sourceId: string;
  sheet: Detail;
}) {
  return (
    <DetailTrigger
      detail={sheet}
      className="group flex h-full w-full flex-col rounded-[22px] border border-border bg-surface p-6 shadow-soft transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">
        <Icon className="size-4" aria-hidden /> {label}
      </span>
      <span className="mt-4 text-[22px] font-semibold leading-snug tracking-[-0.02em]">{value}</span>
      <span className="mt-2 text-[14px] leading-relaxed text-muted">{detail}</span>
      <span className="mt-auto flex items-center gap-1 pt-4 text-[12px] text-subtle">
        {sources[sourceId]?.label.split(" — ")[0].split(" (")[0]}
        <ArrowUpRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </span>
    </DetailTrigger>
  );
}

