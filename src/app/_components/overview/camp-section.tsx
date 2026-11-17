import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ChevronRightIcon, GlobeIcon, KeyRoundIcon, NetworkIcon, RouteIcon, ServerIcon, type LucideIcon } from "lucide-react";
import { asBuilt } from "@/content/network";
import { site } from "@/content/site";
import { teamPhotos } from "@/content/team";
import { Section } from "@/components/layout/section";
import { Appear } from "./appear";
import { Provenance } from "@/components/brand/provenance";
import { Button } from "@/components/ui/button";
import { DetailTrigger, type Detail } from "./detail-sheet";

type Highlight = { key: string; icon: LucideIcon; title: string; sub: string; detail: Detail };

export function CampSection() {
  const hosts = asBuilt.serverVlan.hosts;
  const dns = hosts.filter((h) => h.detail.startsWith("BIND9"));
  const web = hosts.find((h) => h.detail.startsWith("Apache"));
  const routerId = asBuilt.router.detail.split(" · ").find((p) => p.includes("router ID"));
  const [sshPort, sshScope] = asBuilt.hardening.split(" · ");
  const base = { eyebrow: `As built · Group 1 · ${site.program}`, provenance: asBuilt.provenance } as const;

  const highlights: Highlight[] = [
    {
      key: "dns",
      icon: ServerIcon,
      title: "BIND9 DNS",
      sub: "Resolver, primary and secondary",
      detail: {
        ...base,
        title: "BIND9 DNS",
        description: `Three name servers on ${asBuilt.serverVlan.name}, for redundancy.`,
        rows: dns.map((h) => ({ label: `${h.name} · ${h.detail}`, value: h.ip, mono: true })),
      },
    },
    {
      key: "web",
      icon: GlobeIcon,
      title: "Apache web server",
      sub: web ? web.detail.split(" · ")[1] ?? asBuilt.domain : asBuilt.domain,
      detail: {
        ...base,
        title: `Apache web server · ${asBuilt.domain}`,
        description: "Our site on the camp network, resolved by our own DNS.",
        rows: web ? [{ label: web.name, value: web.ip, mono: true }, { label: "Domain", value: asBuilt.domain, mono: true }] : undefined,
      },
    },
    {
      key: "ospf",
      icon: RouteIcon,
      title: "OSPF routing",
      sub: routerId ? routerId.replace("OSPF router ", "Router ") : "Group router to backbone",
      detail: {
        ...base,
        title: "OSPF routing to the APIE backbone",
        description: "The group router and NAT edge share routes over OSPF.",
        rows: [
          { label: asBuilt.backbone.name, value: asBuilt.backbone.detail, mono: true },
          { label: asBuilt.router.name, value: asBuilt.router.detail, mono: true },
          { label: asBuilt.clientVlan.nat.name, value: asBuilt.clientVlan.nat.detail, mono: true },
        ],
      },
    },
    {
      key: "nat",
      icon: NetworkIcon,
      title: "MikroTik NAT",
      sub: asBuilt.clientVlan.lan.name.replace("NAT LAN ", "LAN "),
      detail: {
        ...base,
        title: `${asBuilt.clientVlan.nat.name} · client edge`,
        description: "NAT for our laptops and Wi-Fi. OSPF v2 and v3 to the group router.",
        rows: [
          { label: asBuilt.clientVlan.name, value: `${asBuilt.clientVlan.subnet} · gw ${asBuilt.clientVlan.gateway}`, mono: true },
          { label: "Interfaces", value: asBuilt.clientVlan.nat.detail, mono: true },
          { label: asBuilt.clientVlan.lan.name, value: asBuilt.clientVlan.lan.detail },
        ],
      },
    },
    {
      key: "ssh",
      icon: KeyRoundIcon,
      title: "SSH hardening",
      sub: sshPort ? sshPort : asBuilt.hardening,
      detail: {
        ...base,
        title: "SSH hardening",
        description: "Off the default port, limited to one VLAN.",
        rows: [
          { label: "SSH", value: sshPort ?? asBuilt.hardening },
          ...(sshScope ? [{ label: "Who may manage", value: sshScope.charAt(0).toUpperCase() + sshScope.slice(1) }] : []),
        ],
      },
    },
  ];

  const topology: Detail = {
    ...base,
    title: asBuilt.title,
    description: "Group 1's network at camp.",
    rows: [
      { label: asBuilt.backbone.name, value: asBuilt.backbone.detail, mono: true },
      { label: asBuilt.router.name, value: asBuilt.router.detail, mono: true },
      { label: asBuilt.serverVlan.name, value: `${asBuilt.serverVlan.subnet} · gw ${asBuilt.serverVlan.gateway}`, mono: true },
      { label: asBuilt.clientVlan.name, value: `${asBuilt.clientVlan.subnet} · gw ${asBuilt.clientVlan.gateway}`, mono: true },
    ],
    links: [{ href: "/network", label: "Explore the network" }],
  };

  return (
    <Section
      id="built-at-camp"
      className="scroll-mt-14"
      tone="muted"
      eyebrow={`Built at ${site.program}`}
      title="Five days at Pulchowk Campus."
      actions={
        <Button asChild variant="outline">
          <Link href="/network">
            Explore the network <ArrowRightIcon />
          </Link>
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Appear className="lg:col-span-7 lg:row-span-2">
          <Photo
            src={teamPhotos.banner.src}
            alt={teamPhotos.banner.alt}
            ratio="aspect-[3/2]"
            sizes="(min-width: 1280px) 680px, (min-width: 1024px) 56vw, 100vw"
            caption="Team PASS with mentor Nitesh Baniya at Pulchowk Campus"
            credit={teamPhotos.banner.credit}
          />
        </Appear>
        <Appear className="lg:col-span-5" delay={0.05}>
          <Photo
            src={teamPhotos.lab.src}
            alt={teamPhotos.lab.alt}
            ratio="aspect-[16/9]"
            sizes="(min-width: 1280px) 480px, (min-width: 1024px) 40vw, 100vw"
            caption="At the lab bench"
            credit={teamPhotos.lab.credit}
          />
        </Appear>
        <Appear className="lg:col-span-5" delay={0.1}>
          <DetailTrigger
            detail={topology}
            className="group flex h-full w-full flex-col justify-between gap-5 rounded-[22px] border border-border bg-surface p-6 shadow-soft transition-shadow duration-200 hover:shadow-card"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">Our domain at camp</span>
              <Provenance kind="built" />
            </span>
            <span>
              <span className="block font-mono text-[22px] font-medium tracking-[-0.02em] sm:text-[24px]">{asBuilt.domain}</span>
              <span className="mt-2 flex items-center gap-1 text-[13.5px] text-muted group-hover:text-foreground">
                Topology and addresses <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </span>
          </DetailTrigger>
        </Appear>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {highlights.map((h, i) => {
          const Icon = h.icon;
          return (
            <Appear key={h.key} delay={i * 0.05} className="h-full">
              <li className="h-full">
                <DetailTrigger
                  detail={h.detail}
                  className="group flex h-full w-full flex-col rounded-[20px] border border-border bg-surface p-5 shadow-soft transition-shadow duration-200 hover:shadow-card"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="grid grid-cols-1 size-9 place-items-center rounded-[11px] bg-surface-2 text-foreground">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <Provenance kind="built" />
                  </span>
                  <span className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">{h.title}</span>
                  <span className="mt-1 text-[13px] leading-snug text-muted">{h.sub}</span>
                </DetailTrigger>
              </li>
            </Appear>
          );
        })}
      </ul>
    </Section>
  );
}

function Photo({
  src,
  alt,
  ratio,
  sizes,
  caption,
  credit,
}: {
  src: string;
  alt: string;
  ratio: string;
  sizes: string;
  caption: string;
  credit: string;
}) {
  return (
    <figure className="relative">
      <div className={`relative overflow-hidden rounded-[22px] bg-surface-3 shadow-card ${ratio}`}>
        <Image src={src} alt={alt} fill quality={90} sizes={sizes} loading="eager" fetchPriority="low" className="object-cover" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-black/45 to-transparent sm:block" />
      </div>
      <figcaption className="flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5 px-1 pt-2.5 sm:absolute sm:inset-x-4 sm:bottom-4 sm:px-2 sm:pb-1 sm:pt-0 sm:text-white">
        <span className="text-[13px] font-medium leading-snug sm:text-[13.5px] sm:[text-shadow:0_1px_8px_rgb(0_0_0/0.35)]">{caption}</span>
        <span className="text-[11.5px] text-subtle sm:text-white/75">{credit}</span>
      </figcaption>
    </figure>
  );
}
