"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ArrowRightIcon, MoonIcon, SunIcon, MonitorIcon, CornerDownLeftIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { nav } from "@/content/site";
import { useCommandStore } from "@/lib/stores/command-store";

export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { open, setOpen, toggle, actions } = useCommandStore();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const run = (fn: () => void) => {
    setOpen(false);
    requestAnimationFrame(fn);
  };

  const grouped = Object.values(actions).reduce<Record<string, typeof actions[string][]>>((acc, a) => {
    (acc[a.group] ||= []).push(a);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showClose={false} className="top-[22%] w-[min(620px,calc(100vw-24px))] translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command loop>
          <CommandInput placeholder="Search pages and actions…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {Object.entries(grouped).map(([group, items]) => (
              <React.Fragment key={group}>
                <CommandGroup heading={group}>
                  {items.map((a) => (
                    <CommandItem key={a.id} value={`${a.label} ${(a.keywords ?? []).join(" ")}`} onSelect={() => run(a.run)}>
                      {a.icon}
                      <span className="flex-1">{a.label}</span>
                      {a.shortcut && <Kbd>{a.shortcut}</Kbd>}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            ))}
            <CommandGroup heading="Go to">
              {nav.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.description}`}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <ArrowRightIcon />
                  <span className="flex-1">{item.label}</span>
                  <span className="hidden text-xs text-subtle sm:inline">{item.description}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Appearance">
              {([
                ["light", "Light theme", SunIcon],
                ["dark", "Dark theme (Dracula)", MoonIcon],
                ["system", "Match system", MonitorIcon],
              ] as const).map(([value, label, Icon]) => (
                <CommandItem
                  key={value}
                  value={label}
                  onSelect={() =>
                    run(() => {
                      setTheme(value);
                      toast.success(`${label} on`);
                    })
                  }
                >
                  <Icon />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeftIcon className="size-3" />
              </Kbd>
              to select
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>esc</Kbd> to close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
