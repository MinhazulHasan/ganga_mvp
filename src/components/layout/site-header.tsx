"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { MenuIcon, SearchIcon, LayoutDashboardIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { nav } from "@/content/site";
import { GangaWordmark } from "@/components/brand/ganga-mark";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { useCommandStore } from "@/lib/stores/command-store";

const primary = nav.filter((n) => n.href !== "/command-center");

export function SiteHeader() {
  const pathname = usePathname();
  const openCommand = useCommandStore((s) => s.setOpen);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="mx-auto flex h-[60px] w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="mr-2 rounded-[10px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60" aria-label="GANGA home">
          <GangaWordmark />
        </Link>

        <nav className="hidden flex-1 items-center justify-center xl:flex" aria-label="Main">
          <ul className="flex items-center gap-0.5">
            {primary.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex h-8 items-center whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/60",
                      active ? "text-foreground" : "text-muted hover:text-foreground"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 -z-10 rounded-full bg-surface-2 hairline"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="hidden w-40 justify-between text-muted md:inline-flex"
            onClick={() => openCommand(true)}
          >
            <span className="inline-flex items-center gap-2">
              <SearchIcon className="size-3.5" /> Search
            </span>
            <Kbd>⌘K</Kbd>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => openCommand(true)}>
            <SearchIcon />
          </Button>
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/command-center">
              <LayoutDashboardIcon /> Command Center
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <MenuIcon />
          </Button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>GANGA</SheetTitle>
            <SheetDescription>Team PASS · APIE Camp #11</SheetDescription>
          </SheetHeader>
          <SheetBody className="px-3">
            <ul className="flex flex-col gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex flex-col rounded-[14px] px-3.5 py-3 transition-colors hover:bg-surface-2",
                      isActive(item.href) && "bg-surface-2"
                    )}
                  >
                    <span className="text-[15px] font-medium">{item.label}</span>
                    <span className="text-[13px] text-muted">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </header>
  );
}
