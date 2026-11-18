"use client";

import * as React from "react";
import type { Uplink } from "@/content/network";

export type UplinkDown = Record<Uplink, boolean>;

type NetworkState = {
  /** which WAN ports (Gi0/1 on GANGA-R1 / GANGA-R2) are shut down in the demo */
  down: UplinkDown;
  setUplink: (id: Uplink, down: boolean) => void;
  /** the router the switch's default route points at, or null when both uplinks are down */
  route: Uplink | null;
  /** true when no uplink is left: the station runs offline */
  offline: boolean;
};

/** OSPF picks the lowest cost: R1 (cost 1) while it is up, then R2 (cost 100). */
export const activeRoute = (down: UplinkDown): Uplink | null => (!down.r1 ? "r1" : !down.r2 ? "r2" : null);

const NetworkStateContext = React.createContext<NetworkState | null>(null);

/** Page-level state shared by the topology, the VLAN plan and their sheets. Resets when the page unmounts. */
export function NetworkStateProvider({ children }: { children: React.ReactNode }) {
  const [down, setDown] = React.useState<UplinkDown>({ r1: false, r2: false });
  const setUplink = React.useCallback((id: Uplink, d: boolean) => setDown((s) => (s[id] === d ? s : { ...s, [id]: d })), []);
  const value = React.useMemo(() => {
    const route = activeRoute(down);
    return { down, setUplink, route, offline: route === null };
  }, [down, setUplink]);
  return <NetworkStateContext.Provider value={value}>{children}</NetworkStateContext.Provider>;
}

const FALLBACK: NetworkState = { down: { r1: false, r2: false }, setUplink: () => {}, route: "r1", offline: false };

export function useNetworkState(): NetworkState {
  return React.useContext(NetworkStateContext) ?? FALLBACK;
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
