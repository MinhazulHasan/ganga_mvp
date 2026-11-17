import { getScenario } from "./scenarios";
import type { RunOptions } from "./types";
import type { CapState } from "./cap";

/** Parse and whitelist query parameters shared by the API routes. Unknown values fall back to defaults. */
export function parseParams(url: URL) {
  const scenarioId = url.searchParams.get("scenario") === "template" ? "template" : "aug26";
  const wan = url.searchParams.get("wan") === "down" ? "down" : "up";
  const eocGsm = url.searchParams.get("eocGsm") === "1";
  const state: CapState = url.searchParams.get("state") === "EMERGENCY" ? "EMERGENCY" : "WARNING";
  const options: RunOptions = { wanDownFromMin: wan === "down" ? 0 : null, eocGsm };
  return { scenario: getScenario(scenarioId), scenarioId, wan, eocGsm, state, options } as const;
}

export const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800",
} as const;
