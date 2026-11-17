"use client";

import { create } from "zustand";
import type { ReactNode } from "react";

export type CommandAction = {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
};

type CommandStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Page-scoped actions (e.g. Command Center registers Play, Cut WAN). */
  actions: Record<string, CommandAction>;
  register: (actions: CommandAction[]) => () => void;
};

export const useCommandStore = create<CommandStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  actions: {},
  register: (actions) => {
    set((s) => {
      const next = { ...s.actions };
      for (const a of actions) next[a.id] = a;
      return { actions: next };
    });
    return () =>
      set((s) => {
        const next = { ...s.actions };
        for (const a of actions) delete next[a.id];
        return { actions: next };
      });
  },
}));
