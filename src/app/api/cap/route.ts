import { runScenario, buildCap } from "@/lib/engine";
import { parseParams, CACHE_HEADERS } from "@/lib/engine/params";

export const runtime = "nodejs";

/** GET /api/cap — CAP 1.2 alert issued by the engine (status: Exercise). */
export async function GET(req: Request) {
  const { scenario, options, state } = parseParams(new URL(req.url));
  const xml = buildCap(runScenario(scenario, options), state);
  if (!xml) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<error>No ${state} was issued in this run.</error>\n`, {
      status: 404,
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `inline; filename="ganga-${scenario.id}-${state.toLowerCase()}.xml"`,
      ...CACHE_HEADERS,
    },
  });
}
