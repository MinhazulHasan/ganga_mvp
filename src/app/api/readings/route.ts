import { NextResponse } from "next/server";
import type { Document, WithId } from "mongodb";
import { atlasConfigured, atlasLabel, readings } from "@/lib/mongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/* ------------------------------------------------------------------
   /api/readings — the valley station's uplink to the cloud database.
   POST: store a batch of synthetic RTU readings in MongoDB Atlas.
   GET:  counts + the latest documents of a run, read back from Atlas.
   Off (configured: false) when MONGODB_URI is not set.
------------------------------------------------------------------- */

const MAX_BATCH = 50;
const TTL_MS = 24 * 60 * 60 * 1000;
const ROLES = new Set(["lake", "gorge", "confluence"]);
const STATES = new Set(["NORMAL", "WATCH", "WARNING", "EMERGENCY"]);
const SCENARIOS = new Set(["aug26", "template"]);
const NO_STORE = { "Cache-Control": "no-store" };

/** Per-instance limit: plenty for one demo browser, a brake for anything else. */
const hits = new Map<string, { n: number; start: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > 60_000) {
    hits.set(ip, { n: 1, start: now });
    return false;
  }
  h.n += 1;
  return h.n > 90;
}

const num = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

type InDoc = {
  rtu: string;
  role: string;
  t: number;
  clock: string;
  level: number;
  rate: number;
  vib: number;
  state: string;
  buffered?: boolean;
};

function validDoc(d: unknown): d is InDoc {
  if (!d || typeof d !== "object") return false;
  const x = d as Record<string, unknown>;
  return (
    typeof x.rtu === "string" &&
    /^RTU\d{1,2}$/.test(x.rtu) &&
    typeof x.role === "string" &&
    ROLES.has(x.role) &&
    num(x.t, 0, 1440) &&
    typeof x.clock === "string" &&
    /^\d{2}:\d{2}(:\d{2})?$/.test(x.clock) &&
    num(x.level, -1000, 100000) &&
    num(x.rate, -10000, 100000) &&
    num(x.vib, 0, 100000) &&
    typeof x.state === "string" &&
    STATES.has(x.state) &&
    (x.buffered === undefined || typeof x.buffered === "boolean")
  );
}

const shape = (d: WithId<Document>) => ({
  id: d._id.toString(),
  runId: d.runId,
  scenario: d.scenario,
  rtu: d.rtu,
  role: d.role,
  t: d.t,
  clock: d.clock,
  level: d.level,
  rate: d.rate,
  vib: d.vib,
  state: d.state,
  buffered: Boolean(d.buffered),
  synthetic: d.synthetic === true,
  source: d.source,
  receivedAt: d.receivedAt instanceof Date ? d.receivedAt.toISOString() : null,
  expireAt: d.expireAt instanceof Date ? d.expireAt.toISOString() : null,
});

async function snapshot(runId: string | null) {
  const col = await readings();
  const [total, runTotal, latest] = await Promise.all([
    col.countDocuments({}),
    runId ? col.countDocuments({ runId }) : Promise.resolve(0),
    runId ? col.find({ runId }).sort({ _id: -1 }).limit(8).toArray() : Promise.resolve([]),
  ]);
  return { total, runTotal, latest: latest.map(shape) };
}

const fail = (e: unknown) => {
  // Log the full error on the server; never echo the connection string or host to the browser.
  console.error("[api/readings]", e);
  const err = (e ?? {}) as { name?: string; codeName?: string; code?: string | number; syscall?: string };
  const why = [err.name || "Error", err.codeName, err.code, err.syscall].filter((x) => x !== undefined && x !== "").join(" · ");
  return NextResponse.json({ configured: true, error: `MongoDB Atlas did not answer (${why}).` }, { status: 502, headers: NO_STORE });
};

const validRun = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9-]{6,64}$/.test(s);

export async function GET(req: Request) {
  if (!atlasConfigured()) return NextResponse.json({ configured: false }, { headers: NO_STORE });
  const run = new URL(req.url).searchParams.get("run");
  try {
    return NextResponse.json({ configured: true, ...atlasLabel, ...(await snapshot(validRun(run) ? run : null)) }, { headers: NO_STORE });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  if (!atlasConfigured()) return NextResponse.json({ configured: false }, { status: 503, headers: NO_STORE });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return NextResponse.json({ configured: true, error: "Too many writes. Slow down." }, { status: 429, headers: NO_STORE });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ configured: true, error: "Body must be JSON." }, { status: 400, headers: NO_STORE });
  }
  const b = body as { runId?: unknown; scenario?: unknown; docs?: unknown };
  if (!validRun(b.runId) || typeof b.scenario !== "string" || !SCENARIOS.has(b.scenario) || !Array.isArray(b.docs)) {
    return NextResponse.json({ configured: true, error: "Expected { runId, scenario, docs[] }." }, { status: 400, headers: NO_STORE });
  }
  if (b.docs.length === 0 || b.docs.length > MAX_BATCH || !b.docs.every(validDoc)) {
    return NextResponse.json({ configured: true, error: `docs must be 1–${MAX_BATCH} valid readings.` }, { status: 400, headers: NO_STORE });
  }

  const now = new Date();
  const expireAt = new Date(now.getTime() + TTL_MS);
  const docs = (b.docs as InDoc[]).map((d) => ({
    runId: b.runId,
    scenario: b.scenario,
    rtu: d.rtu,
    role: d.role,
    t: Math.round(d.t * 1000) / 1000,
    clock: d.clock,
    level: Math.round(d.level * 10) / 10,
    rate: Math.round(d.rate * 10) / 10,
    vib: Math.round(d.vib * 100) / 100,
    state: d.state,
    buffered: d.buffered === true,
    synthetic: true,
    source: "GANGA simulator (synthetic readings)",
    receivedAt: now,
    expireAt,
  }));

  try {
    const col = await readings();
    const res = await col.insertMany(docs, { ordered: false });
    return NextResponse.json(
      { configured: true, ...atlasLabel, inserted: res.insertedCount, ...(await snapshot(b.runId as string)) },
      { headers: NO_STORE }
    );
  } catch (e) {
    return fail(e);
  }
}
