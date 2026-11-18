import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* In-memory stand-in for the Atlas collection (only what the route uses). */
type Doc = Record<string, unknown> & { _id: { toString(): string } };
const store: Doc[] = [];
let nextId = 1;
const fakeCol = {
  insertMany: async (docs: Record<string, unknown>[]) => {
    for (const d of docs) store.push({ ...d, _id: { toString: () => String(nextId++).padStart(24, "0") } });
    return { insertedCount: docs.length };
  },
  countDocuments: async (q: Record<string, unknown>) => store.filter((d) => !q.runId || d.runId === q.runId).length,
  find: (q: Record<string, unknown>) => ({
    sort: () => ({
      limit: (n: number) => ({
        toArray: async () => store.filter((d) => d.runId === q.runId).slice().reverse().slice(0, n),
      }),
    }),
  }),
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mongo", () => ({
  atlasConfigured: () => Boolean(process.env.MONGODB_URI),
  atlasLabel: { db: "ganga", collection: "readings" },
  readings: async () => fakeCol,
}));

const { GET, POST } = await import("./route");

const reading = (over: Record<string, unknown> = {}) => ({
  rtu: "RTU1",
  role: "lake",
  t: 0.1,
  clock: "08:37:06",
  level: 0,
  rate: 0.3,
  vib: 5.11,
  state: "WATCH",
  ...over,
});
const post = (body: unknown, ip = "1.1.1.1") =>
  POST(new Request("http://x/api/readings", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": ip } }));

describe("/api/readings", () => {
  beforeEach(() => {
    process.env.MONGODB_URI = "mongodb://test";
    store.length = 0;
  });
  afterEach(() => {
    delete process.env.MONGODB_URI;
  });

  it("reports itself off when MONGODB_URI is missing", async () => {
    delete process.env.MONGODB_URI;
    const res = await GET(new Request("http://x/api/readings"));
    expect(await res.json()).toEqual({ configured: false });
    expect((await post({ runId: "aug26-abcdef", scenario: "aug26", docs: [reading()] })).status).toBe(503);
  });

  it("stores a batch with server fields and returns the latest documents", async () => {
    const res = await post({ runId: "aug26-abcdef", scenario: "aug26", docs: [reading(), reading({ rtu: "RTU2", role: "gorge", t: 0.183, buffered: true })] });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.inserted).toBe(2);
    expect(j.runTotal).toBe(2);
    expect(j.latest[0].rtu).toBe("RTU2");
    expect(j.latest[0].buffered).toBe(true);
    expect(j.latest[0].synthetic).toBe(true);
    expect(store[0].expireAt).toBeInstanceOf(Date);
    expect((store[0].expireAt as Date).getTime() - (store[0].receivedAt as Date).getTime()).toBe(24 * 3600 * 1000);
  });

  it("rejects bad input", async () => {
    expect((await post({ runId: "BAD ID", scenario: "aug26", docs: [reading()] })).status).toBe(400);
    expect((await post({ runId: "aug26-abcdef", scenario: "mars", docs: [reading()] })).status).toBe(400);
    expect((await post({ runId: "aug26-abcdef", scenario: "aug26", docs: [reading({ rtu: "DROP TABLE" })] })).status).toBe(400);
    expect((await post({ runId: "aug26-abcdef", scenario: "aug26", docs: [reading({ state: "PANIC" })] })).status).toBe(400);
    expect((await post({ runId: "aug26-abcdef", scenario: "aug26", docs: Array.from({ length: 51 }, () => reading()) })).status).toBe(400);
    expect(store.length).toBe(0);
  });

  it("rate-limits one client", async () => {
    let last = 200;
    for (let i = 0; i < 95; i++) last = (await post({ runId: "aug26-abcdef", scenario: "aug26", docs: [reading()] }, "9.9.9.9")).status;
    expect(last).toBe(429);
  });
});
