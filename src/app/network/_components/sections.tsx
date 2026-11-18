import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BrickWallShieldIcon,
  CloudIcon,
  CpuIcon,
  GlobeIcon,
  GraduationCapIcon,
  HeartPulseIcon,
  LayersIcon,
  LockKeyholeIcon,
  RouteIcon,
  RouterIcon,
  ServerIcon,
  SatelliteDishIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Provenance } from "@/components/brand/provenance";
import { cn } from "@/lib/utils";
import { asBuilt, failover, ipv6, nextSteps, routingNote, vlanPlan } from "@/content/network";
import { resilience } from "@/content/architecture";
import { Rise } from "./rise";
import { sviFor } from "./net-utils";
import { VlanDot } from "./vlan-tone";

/* ------------------------------------------------------------------
   Header chips — each one jumps to the section that backs it up.
------------------------------------------------------------------- */
export function HeaderChips() {
  const chips: { href: string; icon: LucideIcon; label: string; planned?: boolean }[] = [
    { href: "#addressing", icon: LayersIcon, label: `VLANs ${vlanPlan.map((v) => v.vlan).join("/")}` },
    { href: "#topology", icon: RouteIcon, label: "OSPF area 0" },
    { href: "#topology", icon: SatelliteDishIcon, label: "Cellular + satellite" },
    { href: "#ipv6", icon: GlobeIcon, label: "Dual-stack ready", planned: ipv6.provenance === "planned" },
    { href: "#as-built", icon: ServerIcon, label: "BIND9 primary + secondary" },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map(({ href, icon: Icon, label, planned }) => (
        <li key={label}>
          <a
            href={href}
            title={planned ? "Planned — see the IPv6 section" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/60",
              planned
                ? "border border-dashed border-border-strong bg-planned-soft text-planned hover:text-foreground"
                : "bg-surface text-foreground shadow-soft hairline hover:bg-surface-2"
            )}
          >
            <Icon className="size-3.5 text-muted" aria-hidden />
            {label}
            {planned && <span className="sr-only">(planned)</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------
   Addressing side cards
------------------------------------------------------------------- */
export function RoutingCard() {
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-[11px] bg-primary/[0.07] text-primary dark:bg-primary/15">
          <RouteIcon className="size-[18px]" aria-hidden />
        </span>
        <Provenance kind="simulated" label="Packet Tracer" tip="OSPF process 1, area 0, runs between GANGA-R1, GANGA-R2 and GANGA-SW in the Packet Tracer model." />
      </div>
      <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">Routing · OSPF area 0</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{routingNote}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">{failover.how}</p>
    </Card>
  );
}

/** Only rendered when every VLAN really follows the pattern — checked against the content. */
export function AddressRuleCard() {
  const follows = vlanPlan.every(
    (v) => v.subnet === `10.0.${v.vlan}.0/24` && v.ipv6 === `2001:db8:${v.vlan}::/64` && sviFor(v.vlan) === `10.0.${v.vlan}.1`
  );
  if (!follows) return null;
  const n = <span className="font-semibold text-primary">n</span>;
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <h3 className="text-[17px] font-semibold tracking-[-0.02em]">One rule for every address</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        The VLAN number is in both prefixes. The gateway is always <span className="font-mono text-[13.5px]">.1</span>.
      </p>
      <div className="mt-4 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 rounded-[14px] bg-surface-2 px-4 py-3.5 font-mono text-[12.5px]">
        <span className="font-sans text-[12px] text-muted">IPv4</span>
        <span>10.0.{n}.0/24</span>
        <span className="font-sans text-[12px] text-muted">Gateway</span>
        <span>10.0.{n}.1</span>
        <span className="font-sans text-[12px] text-muted">IPv6</span>
        <span>2001:db8:{n}::/64</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-muted">
        <span>n =</span>
        {vlanPlan.map((v) => (
          <span key={v.vlan} className="inline-flex items-center gap-1.5">
            <VlanDot vlan={v.vlan} />
            <span className="font-mono text-foreground">{v.vlan}</span> {v.zone}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------
   IPv6
------------------------------------------------------------------- */
const WHY_ICONS: LucideIcon[] = [GlobeIcon, GraduationCapIcon, CloudIcon];
const STEP_ICONS: Record<string, LucideIcon> = { Router: RouterIcon, BIND9: ServerIcon, Firewall: BrickWallShieldIcon, Cloud: CloudIcon };

export function Ipv6Section() {
  const steps = ipv6.steps.map((s) => {
    const i = s.indexOf(":");
    const layer = i > 0 ? s.slice(0, i).trim() : "";
    const text = i > 0 ? s.slice(i + 1).trim() : s;
    return { layer, text: text.charAt(0).toUpperCase() + text.slice(1) };
  });
  const [lead, ...rest] = ipv6.status.split(/(?<=\.)\s+/);
  const ospfV3 = /v3/i.test(asBuilt.clientVlan.nat.detail);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {ipv6.why.map((w, i) => {
          const Icon = WHY_ICONS[i] ?? GlobeIcon;
          return (
            <Rise key={w.title} delay={i * 0.05} className="h-full">
              <Card className="h-full p-6">
                <span className="inline-flex size-9 items-center justify-center rounded-[11px] bg-watch-soft text-watch">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">{w.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{w.detail}</p>
              </Card>
            </Rise>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Rise className="h-full">
          <Card className="h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Dual-stack rollout</h3>
                <p className="mt-1 text-sm text-muted">Four changes. IPv4 is untouched.</p>
              </div>
              <Provenance kind={ipv6.provenance} />
            </div>
            <ol className="mt-5 flex flex-col">
              {steps.map((s, i) => {
                const Icon = STEP_ICONS[s.layer] ?? GlobeIcon;
                return (
                  <li key={s.text} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < steps.length - 1 && <span className="absolute left-[15px] top-9 bottom-1 w-px bg-border-strong" aria-hidden />}
                    <span className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong bg-planned-soft font-mono text-[12px] font-semibold text-planned">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-subtle">
                        <Icon className="size-3.5" aria-hidden />
                        {s.layer}
                      </p>
                      <p className="mt-1 text-[15px] leading-snug">{s.text}</p>
                      {i === 0 && (
                        <ul className="mt-2.5 grid w-fit grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
                          {vlanPlan.map((v) => (
                            <li
                              key={v.vlan}
                              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11.5px] tabular"
                            >
                              <VlanDot vlan={v.vlan} />
                              {v.ipv6}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </Rise>

        <div className="flex flex-col gap-6">
          <Rise>
            <Card className="p-5 sm:p-6">
              <p className="text-[19px] font-semibold leading-snug tracking-[-0.02em]">{lead}</p>
              {rest.length > 0 && <p className="mt-3 text-[14px] leading-relaxed text-muted">{rest.join(" ")}</p>}
            </Card>
          </Rise>
          {ospfV3 && (
            <Rise delay={0.05} className="flex-1">
              <Card className="h-full p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-subtle">Already at camp</p>
                  <Provenance kind={asBuilt.provenance} />
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">
                  Our MikroTik ({asBuilt.clientVlan.nat.name.replace(/\s*\(.*\)$/, "")}) ran{" "}
                  <span className="font-mono text-[13.5px]">OSPF v2/v3</span> at camp. OSPFv3 is OSPF for IPv6.
                </p>
                <a
                  href="#as-built"
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                >
                  See the camp network <ArrowRightIcon className="size-3.5" aria-hidden />
                </a>
              </Card>
            </Rise>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
   Resilience & security
------------------------------------------------------------------- */
const RES_META: Record<string, { icon: LucideIcon; href: string; cta: string }> = {
  "Encrypted telemetry": { icon: LockKeyholeIcon, href: "#trust-zones", cta: "See the trust zones" },
  "Segmented network": { icon: LayersIcon, href: "#addressing", cta: "See the VLAN plan" },
  "Edge-first decisions": { icon: CpuIcon, href: "#topology", cta: "Run the failover test" },
  "Silence is a signal": { icon: HeartPulseIcon, href: "/architecture", cta: "How the engine reads silence" },
  "Redundant naming": { icon: ServerIcon, href: "#as-built", cta: "See the DNS we built" },
  "Off-grid by design": { icon: SunIcon, href: "/field", cta: "Power and field kit" },
};

export function ResilienceGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resilience.map((r, i) => {
        const meta = RES_META[r.name] ?? { icon: LayersIcon, href: "#topology", cta: "Learn more" };
        const Icon = meta.icon;
        const route = meta.href.startsWith("/");
        const body = (
          <>
            <span className="inline-flex size-10 items-center justify-center rounded-[12px] bg-surface-2 text-foreground ring-1 ring-border transition-colors group-hover:bg-primary/[0.07] group-hover:text-primary dark:group-hover:bg-primary/15">
              <Icon className="size-[19px]" aria-hidden />
            </span>
            <span className="mt-5 block text-[17px] font-semibold tracking-[-0.02em]">{r.name}</span>
            <span className="mt-1.5 block text-[15px] leading-relaxed text-muted">{r.detail}</span>
            <span className="mt-auto flex items-center gap-1 pt-5 text-[13px] font-medium text-foreground">
              {meta.cta}
              {route ? (
                <ArrowUpRightIcon className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              ) : (
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              )}
            </span>
          </>
        );
        const cls =
          "group flex h-full flex-col rounded-[22px] border border-border bg-surface p-6 shadow-card outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-float focus-visible:ring-[3px] focus-visible:ring-ring/60";
        return (
          <li key={r.name}>
            <Rise delay={(i % 3) * 0.05} className="h-full">
              {route ? (
                <Link href={meta.href} className={cls}>
                  {body}
                </Link>
              ) : (
                <a href={meta.href} className={cls}>
                  {body}
                </a>
              )}
            </Rise>
          </li>
        );
      })}
    </ul>
  );
}


/* ------------------------------------------------------------------
   Not redundant yet — honest list from Swarnima's recording
------------------------------------------------------------------- */
export function NextSteps() {
  return (
    <Card className="mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Not done yet</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">What the Packet Tracer model does not cover. We list it so nobody has to ask.</p>
        </div>
        <Provenance kind={failover.gapProvenance} />
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nextSteps.map((n, i) => (
          <li key={n.title} className="flex gap-3 rounded-[16px] border border-dashed border-border-strong bg-planned-soft/50 p-4">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface font-mono text-[12px] font-semibold text-planned ring-1 ring-border">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold tracking-[-0.01em]">{n.title}</span>
              <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">{n.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
