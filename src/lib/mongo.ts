import "server-only";
import dns from "node:dns";
import { MongoClient, type Collection, type Document } from "mongodb";

/**
 * MongoDB Atlas, used only to store the simulator's synthetic RTU readings.
 * The connection string lives in MONGODB_URI (server-side env var). Without it, the feature is off.
 */
export const atlasConfigured = () => Boolean(process.env.MONGODB_URI);

const DB = process.env.MONGODB_DB || "ganga";
export const READINGS = "readings";

declare global {
  // Reused across hot reloads and warm serverless invocations.
  var _gangaMongo: Promise<MongoClient> | undefined;
  var _gangaIndexes: Promise<unknown> | undefined;
}

async function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!globalThis._gangaMongo) {
    // Some networks (often on Windows) refuse the SRV lookup that mongodb+srv:// needs.
    // MONGODB_DNS="8.8.8.8,1.1.1.1" points Node's resolver at public DNS. Not needed on Vercel.
    const servers = process.env.MONGODB_DNS?.split(",").map((s) => s.trim()).filter(Boolean);
    if (servers?.length) dns.setServers(servers);
    globalThis._gangaMongo = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000, appName: "ganga-mvp" }).connect();
  }
  try {
    return await globalThis._gangaMongo;
  } catch (e) {
    globalThis._gangaMongo = undefined;
    throw e;
  }
}

export async function readings(): Promise<Collection<Document>> {
  const col = (await client()).db(DB).collection(READINGS);
  // Documents delete themselves 24 h after they are written (TTL index); runs are queried newest first.
  globalThis._gangaIndexes ??= Promise.all([
    col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0, name: "ttl_24h" }),
    col.createIndex({ runId: 1, _id: -1 }, { name: "run_latest" }),
  ]).catch((e) => {
    globalThis._gangaIndexes = undefined;
    throw e;
  });
  await globalThis._gangaIndexes;
  return col;
}

export const atlasLabel = { db: DB, collection: READINGS };
