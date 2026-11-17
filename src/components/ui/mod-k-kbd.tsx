"use client";

import * as React from "react";
import { Kbd } from "@/components/ui/kbd";

const subscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

/** Shortcut label for this OS: ⌘K on Apple devices, Ctrl K elsewhere (server render and first paint show Ctrl K). */
export function ModKKbd() {
  const apple = React.useSyncExternalStore(subscribe, isApple, () => false);
  return <Kbd>{apple ? "⌘K" : "Ctrl K"}</Kbd>;
}
