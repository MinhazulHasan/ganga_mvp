/**
 * The 26 August 2026 Bhote Koshi flash flood (Rasuwa, Nepal), as reported in public sources.
 * Every figure carries a source. Figures marked `deck` come from the Team PASS camp deck and
 * should be checked against the original source before the final presentation.
 */
export type Source = { id: string; label: string; url?: string; note?: string };

export const sources: Record<string, Source> = {
  aljazeera: {
    id: "aljazeera",
    label: "Al Jazeera, 27 Aug 2026 — Nepal-Tibet floods: what happened",
    url: "https://www.aljazeera.com/amp/news/2026/8/27/nepal-tibet-floods-what-happened-what-caused-them-and-who-is-missing",
  },
  earthsky: {
    id: "earthsky",
    label: "EarthSky — Nepal flash flood, glacier collapse, Aug 26 2026",
    url: "https://earthsky.org/earth/nepal-flash-flood-glacier-collapse-landslide-aug-26-2026/",
  },
  hirisk: {
    id: "hirisk",
    label: "Watchers / HiRISK — Langtang Lirung rock-ice avalanche",
    url: "https://watchers.news/epicenter/deadly-langtang-rock-ice-avalanche-in-nepal-followed-decades-of-glacier-retreat-and-exceptional-high-altitude-heat/",
  },
  kathmandupost: {
    id: "kathmandupost",
    label: "The Kathmandu Post, 2 Sep 2026 — Nepal sent its disaster alert 38 minutes after the glacier collapse",
    url: "https://kathmandupost.com/national/2026/09/02/nepal-sent-its-disaster-alert-38-minutes-after-the-glacier-collapse-it-wasn-t-enough",
    note: "NDRRMA spokesperson: text alerts at 09:15. One resident's phone showed it at 09:42.",
  },
  wikipedia2026: {
    id: "wikipedia2026",
    label: "2026 Nepal floods (Wikipedia) — Nepali officials, as of 5 Oct 2026",
    url: "https://en.wikipedia.org/wiki/2026_Nepal_floods",
    note: "Secondary source. Check the NDRRMA figure before presenting.",
  },
  deck: {
    id: "deck",
    label: "Team PASS camp deck (citing Idaho State University, 1 Oct 2026)",
    note: "Deck figure. Verify against the original source.",
  },
  icimod2020: { id: "icimod2020", label: "ICIMOD glacial lake inventory (2020)" },
  thame: { id: "thame", label: "ICIMOD / NDRRMA — Thame GLOF study (2024)" },
};

export const event = {
  name: "26 August 2026 · Bhote Koshi flash flood",
  region: "Rasuwa, Nepal — Upper Trishuli watershed",
  triggerLocal: "08:37",
  triggerUtc: "02:52 UTC",
  facts: [
    {
      label: "Trigger",
      value: "08:37",
      detail: "Rock-ice avalanche from the Lirung massif. Seismic signal at 02:52 UTC.",
      source: "earthsky",
    },
    {
      label: "Path",
      value: "Lhende Khola → Bhote Koshi → Trishuli",
      detail: "The avalanche dammed the Lhende Khola. The dam failed and the flood ran down the Bhote Koshi into the Trishuli.",
      source: "aljazeera",
    },
    {
      label: "Border reached",
      value: "08:44",
      detail: "Reached Rasuwagadhi 7 minutes after the trigger. Upper-reach speed above 30 m/s (estimate).",
      source: "hirisk",
    },
    {
      label: "River rise",
      value: "9 m in 30 min",
      detail: "The Trishuli reportedly rose up to 9 m in 30 minutes.",
      source: "aljazeera",
    },
    {
      label: "First SMS",
      value: "+38 min",
      detail: "NDRRMA's first text alert went out at 09:15, 38 minutes after the 08:37 collapse. The Syabrubesi river gauge was swept away at 08:50.",
      source: "kathmandupost",
    },
    {
      label: "Lives lost",
      value: "1,455",
      detail: "Dead in Nepal as of 5 October 2026, when formal search and rescue ended. 5,285 more were still missing.",
      source: "wikipedia2026",
    },
  ],
  monitoringGap: "No operational glacier-hazard warning system covered the failure site.",
  monitoringGapSource: "hirisk",
} as const;

/**
 * Proof chart — reconstruction shown on the team deck (slide "Replaying 26 August").
 * Downstream threshold gauge, ~100 km below the source.
 */
export const gaugeReplay = {
  amberThresholdM: 4.1,
  gaugeKm: 100,
  firstCrossing: "11:20",
  points: [
    { time: "08:40", levelM: 1.6 },
    { time: "09:00", levelM: 1.6 },
    { time: "09:20", levelM: 2.1 },
    { time: "10:00", levelM: 2.9 },
    { time: "10:40", levelM: 3.6 },
    { time: "11:20", levelM: 4.2 },
    { time: "12:00", levelM: 3.9 },
    { time: "13:00", levelM: 3.1 },
  ],
  note: "Reconstructed from published station readings (team deck). Not a field trial.",
} as const;
