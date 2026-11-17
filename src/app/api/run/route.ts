import { NextResponse } from "next/server";
import { runScenario } from "@/lib/engine";
import { parseParams, CACHE_HEADERS } from "@/lib/engine/params";

export const runtime = "nodejs";

/** GET /api/run — run the GANGA engine and return the full timeline. */
export async function GET(req: Request) {
  const { scenario, options } = parseParams(new URL(req.url));
  const run = runScenario(scenario, options);
  return NextResponse.json(
    {
      engine: "ganga-fusion/0.1",
      generatedFrom: "deterministic engine run (same input → same output)",
      ...run,
    },
    { headers: CACHE_HEADERS }
  );
}
