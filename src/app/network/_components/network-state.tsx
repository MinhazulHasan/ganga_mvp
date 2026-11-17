"use client";

import * as React from "react";

type NetworkState = {
  /** true while Gi0/1 (WAN) on GANGA-R1 is shut down in the demo */
  wanDown: boolean;
  setWanDown: (down: boolean) => void;
};

const NetworkStateContext = React.createContext<NetworkState | null>(null);

/** Page-level state shared by the topology, the VLAN plan and their sheets. Resets when the page unmounts. */
export function NetworkStateProvider({ children }: { children: React.ReactNode }) {
  const [wanDown, setWanDown] = React.useState(false);
  const value = React.useMemo(() => ({ wanDown, setWanDown }), [wanDown]);
  return <NetworkStateContext.Provider value={value}>{children}</NetworkStateContext.Provider>;
}

export function useNetworkState(): NetworkState {
  const ctx = React.useContext(NetworkStateContext);
  return ctx ?? { wanDown: false, setWanDown: () => {} };
}

const noopSubscribe = () => () => {};
/** true after hydration, false on the server and during hydration — no mismatch. */
export function useMounted() {
  return React.useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Media query that is hydration-safe (server value is used during hydration). */
export function useMediaQuery(query: string, serverValue: boolean) {
  const subscribe = React.useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query]
  );
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue);
}

/** Reduced-motion preference read without the render-time mismatch of motion's hook. */
export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
