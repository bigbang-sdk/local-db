import { DEFAULT_DB, DEFAULT_STORE } from "./idb";

type NsKey = `${string}/${string}`;

const bcCache = new Map<NsKey, BroadcastChannel | null | undefined>();

function nsKey(dbName: string, storeName: string): NsKey {
  return `${dbName}/${storeName}`;
}

function channelName(dbName: string, storeName: string) {
  // Namespaced channel; safe across multiple store pairs
  return `local-db:${dbName}:${storeName}`;
}

export function getBroadcastChannel(opts?: { dbName?: string; storeName?: string }): BroadcastChannel | null {
  if (typeof window === "undefined") return null;

  const db = opts?.dbName ?? DEFAULT_DB;
  const st = opts?.storeName ?? DEFAULT_STORE;
  const k = nsKey(db, st);

  const cached = bcCache.get(k);
  if (cached !== undefined) return cached!;

  try {
    const bc = new BroadcastChannel(channelName(db, st));
    bcCache.set(k, bc);
    return bc;
  } catch {
    bcCache.set(k, null);
    return null;
  }
}
