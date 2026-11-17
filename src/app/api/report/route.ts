import OpenAI from "openai";
import { NextResponse } from "next/server";
import { runScenario, clockAt, fmtT } from "@/lib/engine";
import { parseParams, CACHE_HEADERS } from "@/lib/engine/params";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || "gpt-6.1-terra";

/** Small in-memory cache per server instance (the CDN caches too, via Cache-Control). */
const memo = new Map<string, { markdown: string; model: string; generatedAt: string }>();

/**
 * GET /api/report — post-event report written by an LLM from the engine's evidence log.
 * The alert itself (state + CAP) never depends on this call.
 */
export async function GET(req: Request) {
  const { scenario, scenarioId, wan, eocGsm, options } = parseParams(new URL(req.url));
  const key = `${scenarioId}:${wan}:${eocGsm ? "gsm" : "base"}`;
  const hit = memo.get(key);
  if (hit) return NextResponse.json({ ...hit, cached: true }, { headers: CACHE_HEADERS });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The report service is not configured on this deployment (OPENAI_API_KEY is missing)." },
      { status: 503 }
    );
  }

  const run = runScenario(scenario, options);
  const c = (m: number | null | undefined) => (m == null ? "not reached" : `${clockAt(scenario, m)} (${fmtT(m, true)})`);
  const facts = [
    `Scenario: ${scenario.name} (${scenario.kind}). River: ${scenario.river}. Trigger ${scenario.triggerClock} local time.`,
    `WAN uplink: ${wan === "down" ? "down for the whole event" : "up"}.`,
    `States: WATCH ${c(run.stateTimes.WATCH)}, WARNING ${c(run.stateTimes.WARNING)}, EMERGENCY ${c(run.stateTimes.EMERGENCY)}.`,
    `First public warning delivered ${c(run.summary.firstPublicWarningMin)}. A threshold gauge at ${run.gauge.km} km would have warned at ${c(run.gauge.warnMin)}.`,
    scenario.realFirstSmsMin ? `In reality the first SMS went out at T+${scenario.realFirstSmsMin} min (reported by The Kathmandu Post).` : "",
    `Villages: ${run.villages.map((v) => `${v.name} at ${v.km} km — flood ${c(v.arrivalMin)}, GANGA lead ${v.leadGangaMin ? v.leadGangaMin.toFixed(0) + " min" : "none"}, gauge lead ${v.leadGaugeMin ? v.leadGaugeMin.toFixed(0) + " min" : "none"}`).join("; ")}.`,
    `Engine evidence (time · rule · finding): ${run.evidence.map((e) => `${fmtT(e.t, true)} · ${e.rule} · ${e.title}${e.values?.length ? " [" + e.values.join(", ") + "]" : ""}`).join(" | ")}.`,
    `Message groups: ${run.groups.map((g) => `${g.name}: ${g.firstDeliveryMin == null ? "received nothing" : "first message " + c(g.firstDeliveryMin)}`).join("; ")}.`,
    `Findings: ${run.findings.join(" ")}`,
    `Assumptions: ${scenario.assumptions.join(" ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new OpenAI({ apiKey, timeout: 45_000 });
    const response = await client.responses.create({
      model: MODEL,
      max_output_tokens: 1100,
      instructions:
        "You write short, plain-English post-event reports for a flood early-warning prototype. Use only the facts given. Do not invent numbers, names or events. Say clearly that the scenario is simulated or reconstructed. Format in Markdown with these sections: Summary (3 sentences), Timeline (bullets with local times), What worked, What to improve, Limits of this run. Keep it under 350 words.",
      input: facts,
    });
    const markdown = response.output_text?.trim();
    if (!markdown) throw new Error("Empty response from the model.");
    const result = { markdown, model: MODEL, generatedAt: new Date().toISOString() };
    memo.set(key, result);
    return NextResponse.json({ ...result, cached: false }, { headers: CACHE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `The report could not be generated: ${message}` }, { status: 502 });
  }
}
