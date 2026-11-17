# GANGA engine — quick reference for page builders

```ts
import {
  aug26, template, scenarioList, getScenario, runScenario,
  stateAt, nodeStatusAt, latestReading, villageStatusAt, deliveryStatusAt, evidenceUntil,
  frontKmAt, arrivalMinAtKm, frontSpeedMsAtKm, predictedArrivalAt,
  clockAt, fmtT, buildCap, buildMessage, RULES, RULE_TEXT, defaultChannels, defaultGroups,
} from "@/lib/engine";
```

- `runScenario(scenario, { wanDownFromMin?: number | null, eocGsm?: boolean, heartbeatS?, geophoneRangeKm?, procDelayS?, floodSpeedMs?, channels?, groups?, gatewayFailAtMin? })`
  - `floodSpeedMs` replaces the arrival anchors with one constant speed — offer it only for illustrative scenarios. When set, **use `run.scenario`** (not the original scenario) for `frontKmAt`, `durationMin`, etc.
  - `channels` / `groups` override the team broadcast model (broadcast editor). `eocGsm` is applied on top (`applyEocGsm`).
  → `RunResult`. Pure, deterministic, ~5 ms — call it in `useMemo`. **All times are minutes after the trigger.**
- `RunResult`:
  - `scenario`, `options`, `stateTimes { WATCH?, WARNING?, EMERGENCY? }`
  - `nodes[] { id, label, km, hitMin, risingFromMin, shakingFromMin, silenceDetectedMin, readings[{ t, level, rate, vib }] }`
  - `evidence[] { id, t, kind: vibration|rise|silence|corroboration|state|speed|gateway|info, node?, rule (R1–R7, ETA, HB), title, detail, values?, state? }`
  - `speedEstimates[] { t, ms, basis }`, `deaths[]`
  - `villages[] { id, name, km, note?, arrivalMin, gangaWarnMin, gaugeWarnMin, leadGangaMin, leadGaugeMin, predictedArrivalMin }`
  - `gauge { km, crossMin, warnMin }`
  - `deliveries[] { id, group, groupName, channel, channelName, trigger, sendMin, deliverMin, blocked, reason? }`
  - `groups[] { id, name, firstDeliveryMin, blockedAll, channels }`, `channels[] { id, name, short, latencyS, needsWan, enabled }`
  - `findings[]` (plain sentences), `summary { firstPublicWarningMin, firstGaugeWarningMin, villagesWithLead10Ganga, villagesWithLead10Gauge, villageCount, realFirstSmsMin }`
- Instant views for playback at minute `t`: `stateAt(run, t)`, `nodeStatusAt(node, t)` → `alive|anomaly|silent|destroyed-unseen`,
  `latestReading(node, t)`, `villageStatusAt(village, t)` → `normal|warned|flooded`, `deliveryStatusAt(d, t)` →
  `waiting|sending|delivered|blocked`, `evidenceUntil(run, t)`, `frontKmAt(scenario, t)`, `predictedArrivalAt(run, km, t)`.
- Formatting: `clockAt(scenario, min, withSeconds = true)` → `"08:38:26"`; `fmtT(min, seconds?)` → `"T+1:26"`.
- Alerts: `buildMessage(run, "WARNING" | "EMERGENCY")` → `{ issuedMin, issuedClock, village, etaMin, en { headline, description, instruction, sms }, ne { … } }`
  (Nepali text is a draft for a native speaker to check — label it). `buildCap(run, state)` → CAP 1.2 XML string.
- Broadcast helpers: `defaultChannels()`, `defaultGroups()`, `DEFAULT_TEMPLATES`, `applyEocGsm(groups)`, `renderTemplate(tpl, { state, village, eta, river })`, `groupMessages(run)` → per-group `{ group, sendMin, village, etaMin, text }`. `run.groupConfig` = the groups actually used. `run.options` includes `procDelayS` and `floodSpeedMs`.
- `RULES` = thresholds (placeholders until a pilot), `RULE_TEXT` = R1–R7 one-line descriptions.
- Scenario fields: `name, shortName, river, region, triggerClock, kind ("reconstructed" | "illustrative"), description,
  nodesKm, villages, gaugeKm, arrival (anchors with label + source), heartbeatS, geophoneRangeKm, durationMin,
  realFirstSmsMin, assumptions[]`.

Reference numbers for 26 Aug (WAN up) — **compute them from the engine, never hardcode**: WATCH 08:37:06,
WARNING 08:38:11, EMERGENCY 08:42:02, first public warning delivered 08:38:26 (T+1:26), gauge warning 11:20:15.
Leads: Rasuwagadhi 5.6 min, Timure 25.6, Syaphrubesi 51.6, Mailung 85.6, Betrawati 131.6, Trishuli Bazar 169.6 (gauge only 7.8).
WAN down: EOC + hydropower operators receive nothing (all their channels need the cloud); residents are still warned.
Real first SMS: T+38 (team deck figure).

APIs: `GET /api/run?scenario=aug26|template&wan=up|down&eocGsm=0|1` (JSON) ·
`GET /api/cap?scenario=…&state=WARNING|EMERGENCY` (XML) ·
`GET /api/report?scenario=…&wan=…` → `{ markdown, model, generatedAt, cached }`, or `{ error }` with 503 when
`OPENAI_API_KEY` is not set (handle this gracefully).
