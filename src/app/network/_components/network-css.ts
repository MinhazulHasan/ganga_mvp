/**
 * Page-scoped CSS for /network. Rendered once by page.tsx as a hoisted <style>.
 * - VLAN palette (light = APIE-friendly, dark = Dracula) — defined on :root/.dark
 *   so sheets rendered in portals can use it too.
 * - React Flow theming via its --xy-* custom properties (its CSS lives in
 *   @layer xyflow, so these unlayered rules win without !important).
 */
export const networkCss = `
:root {
  --net-vlan-10: #6b4fd8; --net-vlan-10-text: #5a3fc4;
  --net-vlan-20: #0a84ff; --net-vlan-20-text: #0a63c9;
  --net-vlan-30: #12a594; --net-vlan-30-text: #0b7568;
  --net-vlan-50: #f08c00; --net-vlan-50-text: #a35300;
  --net-link: color-mix(in srgb, var(--foreground) 24%, var(--background));
  --net-link-strong: color-mix(in srgb, var(--foreground) 42%, var(--background));
  --net-link-live: color-mix(in srgb, var(--normal-fill) 78%, var(--foreground));
  --net-term-bg: #0c0d28;
  --net-term-bar: #16183a;
}
.dark {
  --net-vlan-10: #bd93f9; --net-vlan-10-text: #bd93f9;
  --net-vlan-20: #8be9fd; --net-vlan-20-text: #8be9fd;
  --net-vlan-30: #50fa7b; --net-vlan-30-text: #50fa7b;
  --net-vlan-50: #ffb86c; --net-vlan-50-text: #ffb86c;
  --net-term-bg: #191a21;
  --net-term-bar: #21222c;
}
.ganga-flow .react-flow {
  --xy-background-color: transparent;
  --xy-edge-stroke: var(--net-link);
}
.ganga-flow .react-flow__pane { touch-action: pan-x pan-y; }
.ganga-flow .react-flow__node { cursor: default; }
.ganga-flow .react-flow__edge { pointer-events: none; }
.ganga-flow .react-flow__edge-path { transition: stroke .35s ease, stroke-width .35s ease; }
.ganga-flow .react-flow__handle { opacity: 0; pointer-events: none; min-width: 0; min-height: 0; width: 1px; height: 1px; border: 0; }
/* Live WAN path: dashes run from the station up to the cloud. */
.ganga-flow .net-flow { stroke: var(--background); opacity: .85; stroke-dasharray: 3 11; animation: net-flow 1.1s linear infinite; }
@keyframes net-flow { to { stroke-dashoffset: 14; } }
@media (prefers-reduced-motion: reduce) { .ganga-flow .net-flow { display: none; } }
`;
