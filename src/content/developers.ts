export const endpoints = [
  {
    method: "GET",
    path: "/api/run",
    summary: "Runs the engine on a scenario. Returns the timeline as JSON.",
    params: [
      { name: "scenario", type: "string", note: "aug26 (default) or template" },
      { name: "wan", type: "up | down", note: "WAN outage at the edge router" },
      { name: "eocGsm", type: "0 | 1", note: "Add local GSM SMS for the district EOC and operators" },
    ],
  },
  {
    method: "GET",
    path: "/api/cap",
    summary: "CAP 1.2 alert at the first public warning. Content-Type: application/xml.",
    params: [
      { name: "scenario", type: "string", note: "aug26 (default) or template" },
      { name: "state", type: "WARNING | EMERGENCY", note: "Alert to render (default WARNING)" },
    ],
  },
  {
    method: "GET",
    path: "/api/report",
    summary: "Post-event report written by an LLM from the evidence log. Cached per scenario. Never used for the alert.",
    params: [
      { name: "scenario", type: "string", note: "aug26 (default) or template" },
      { name: "wan", type: "up | down", note: "Scenario variant" },
    ],
  },
] as const;
