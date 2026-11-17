# GANGA — Glacial-flood Anomaly-detection Network with Geophysical Alerting

Edge-first flood early-warning prototype by **Team PASS** at **APIE Camp #11** (SOI Asia × IOE Pulchowk Campus,
Tribhuvan University, 26–30 October 2026). The site replays the 26 August 2026 Bhote Koshi flash flood through a
deterministic fusion engine and shows how villages are warned — even when the WAN is cut.

## Run it locally (Windows, macOS or Linux)

Requires Node.js 20.9 or newer.

```bash
npm install
copy .env.example .env.local   # macOS/Linux: cp .env.example .env.local
npm run dev                    # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Engine unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

### Environment variables (`.env.local`, server-side only)

| Name | Needed for | Default |
|---|---|---|
| `OPENAI_API_KEY` | `/api/report` (post-event report). Without it the report tab shows a clear "not configured" message; everything else works. | — |
| `OPENAI_MODEL` | Model for the report | `gpt-6.1-terra` |

## Pages

| Route | Content |
|---|---|
| `/` | Overview — the problem, how GANGA works, proof, built at camp |
| `/command-center` | Replay console: engine state, river corridor, evidence feed, lead times, WAN cut, deliveries, CAP 1.2, report. URL params: `?autoplay=1`, `?t=6`, `?wan=down`, `?eocGsm=1`, `?scenario=template`, `?speed=120` |
| `/architecture` | Field / edge / cloud tiers, data flow, fusion rules, why fusion |
| `/network` | Packet Tracer topology with live WAN cut, VLAN + IPv6 plan, the network built at camp |
| `/field` | Signal chain, LoRa choice, power budget, cost |
| `/team` | Team PASS and mentor |
| `/developers` | API docs, annotated CAP 1.2, rules and thresholds |

APIs: `GET /api/run`, `GET /api/cap`, `GET /api/report` — see `/developers` or `ENGINE.md`.

## Project layout

```
src/
  app/            routes (each page has its own _components/ folder) + api/ routes
  components/     shared UI (ui/, brand/, layout/, motion/)
  content/        every fact shown on the site, with sources
  lib/engine/     the fusion engine, scenarios, broadcast model, CAP builder + tests
public/           photos (metadata stripped, bystanders blurred) and logos
DESIGN.md         design system rules · ENGINE.md engine reference
scripts/shot.mjs  screenshot helper used for visual QA
```
