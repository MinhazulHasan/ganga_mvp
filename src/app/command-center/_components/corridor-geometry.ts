import type { Scenario } from "@/lib/engine";

/*
 * Layout for the river corridor SVG, in real pixels for the measured box so text stays crisp.
 * Plan view of the river (left → right, km scale) over a stylised mountain backdrop.
 * Everything below the river has a fixed height; the sky and mountains take what is left.
 */

export const CORRIDOR_H = 330;
export const CORRIDOR_MIN_W = 720;
const PAD_L = 74;
const PAD_R = 34;
const BELOW_RIVER = 152;

export interface CorridorGeo {
  W: number;
  H: number;
  x0: number;
  x1: number;
  yRiver: number;
  yRelay: number;
  yPin: number;
  axisY: number;
  kmMax: number;
  xOf: (km: number) => number;
  yOf: (x: number) => number;
  river: string;
  ridges: { id: string; d: string; line: string }[];
  snowClip: string;
  /** vertical extent of the snow fade (top of the highest peaks → the lower snow line) */
  snowTop: number;
  snowBottom: number;
  /** label centre for each village (scenario order), nudged apart where names would touch */
  villageLabelX: number[];
  kmTicks: { km: number; x: number }[];
}

const TAU = Math.PI * 2;
/** Triangle wave in [0, 1] — angular, mountain-like when summed. */
const tri = (v: number) => 1 - Math.abs(2 * (v - Math.floor(v)) - 1);

function ridge(W: number, base: number, hLeft: number, hRight: number, phase: number) {
  const pts: [number, number][] = [];
  for (let x = -4; x <= W + 4; x += 4) {
    const u = Math.min(1, Math.max(0, x / W));
    const env = hLeft + (hRight - hLeft) * Math.pow(u, 0.7);
    const n = 0.56 * tri(x / 230 + phase) + 0.29 * tri(x / 91 + phase * 1.7) + 0.15 * tri(x / 37 + phase * 2.3);
    pts.push([x, base - env * (0.42 + 0.58 * n)]);
  }
  const line = "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
  return { line, d: `${line} L${W + 4} ${base} L-4 ${base} Z` };
}

export function corridorGeometry(s: Scenario, W: number, H: number = CORRIDOR_H): CorridorGeo {
  const yRiver = H - BELOW_RIVER;
  const sky = yRiver - 12; // usable height above the river
  const maxKm = Math.max(s.gaugeKm, ...s.villages.map((v) => v.km), ...s.nodesKm);
  const kmMax = Math.ceil((maxKm * 1.05) / 5) * 5;
  const x0 = PAD_L;
  const x1 = W - PAD_R;
  const xOf = (km: number) => x0 + (Math.min(Math.max(km, 0), kmMax) / kmMax) * (x1 - x0);
  const yOf = (x: number) => {
    const u = (x - x0) / (x1 - x0);
    return yRiver + 7 * Math.sin(TAU * 1.55 * u + 0.5) + 2.6 * Math.sin(TAU * 4.6 * u + 1.7);
  };

  const pts: string[] = [];
  for (let x = x0; x < x1; x += 3) pts.push(`${x.toFixed(1)} ${yOf(x).toFixed(1)}`);
  pts.push(`${x1.toFixed(1)} ${yOf(x1).toFixed(1)}`);
  const river = "M" + pts.join(" L");

  const far = ridge(W, yRiver - 8, sky * 0.84, sky * 0.34, 0.13);
  const mid = ridge(W, yRiver - 4, sky * 0.6, sky * 0.25, 0.61);
  const near = ridge(W, yRiver + 2, sky * 0.38, sky * 0.16, 0.37);

  // Snow above a line that rises to the right: only the high peaks near the source carry it.
  const snowY0 = yRiver - sky * 0.55;
  const snowY1 = yRiver - sky * 0.72;
  const snowClip = `M-10 -10 H${W + 10} V${snowY1.toFixed(1)} L-10 ${snowY0.toFixed(1)} Z`;

  // Village labels: estimated widths (name at 11.5px semibold, "in 2 h 45"-long sub at 10.5px),
  // then a few relaxation passes push touching neighbours apart symmetrically.
  const order = s.villages.map((v, i) => ({ i, x: xOf(v.km), w: Math.max(v.name.split(" / ")[0].length * 6.6, 9 * 5.8) }));
  order.sort((a, b) => a.x - b.x);
  const cx = order.map((o) => o.x);
  for (let pass = 0; pass < 6; pass++) {
    for (let k = 1; k < order.length; k++) {
      const overlap = cx[k - 1] + order[k - 1].w / 2 + 8 - (cx[k] - order[k].w / 2);
      if (overlap > 0) {
        cx[k - 1] -= overlap / 2;
        cx[k] += overlap / 2;
      }
    }
    for (let k = 0; k < order.length; k++) cx[k] = Math.min(W - 6 - order[k].w / 2, Math.max(6 + order[k].w / 2, cx[k]));
  }
  const villageLabelX: number[] = new Array(s.villages.length);
  order.forEach((o, k) => (villageLabelX[o.i] = cx[k]));

  const step = (x1 - x0) / (kmMax / 10) >= 46 ? 10 : 20;
  const kmTicks: { km: number; x: number }[] = [];
  for (let km = 0; km <= kmMax + 0.001; km += step) kmTicks.push({ km, x: xOf(km) });

  return {
    W,
    H,
    x0,
    x1,
    yRiver,
    yRelay: yRiver - 74,
    yPin: yRiver + 58,
    axisY: H - 30,
    kmMax,
    xOf,
    yOf,
    river,
    ridges: [
      { id: "far", ...far },
      { id: "mid", ...mid },
      { id: "near", ...near },
    ],
    snowClip,
    snowTop: yRiver - 8 - sky * 0.84,
    snowBottom: snowY0,
    villageLabelX,
    kmTicks,
  };
}
