import { createStore, del, get, set, type UseStore } from "idb-keyval";

type StoreKey = `${string}/${string}`;

export const DEFAULT_DB = "local-db";
export const DEFAULT_STORE = "local-db";

const storeCache = new Map<StoreKey, UseStore | null>();

function keyFor(dbName: string, storeName: string): StoreKey {
  return `${dbName}/${storeName}`;
}

export function getOrCreateIdbStore(dbName: string = DEFAULT_DB, storeName: string = DEFAULT_STORE): UseStore | null {
  if (typeof indexedDB === "undefined") return null;
  const k = keyFor(dbName, storeName);
  if (storeCache.has(k)) return storeCache.get(k)!;
  try {
    const s = createStore(dbName, storeName);
    storeCache.set(k, s);
    return s;
  } catch {
    storeCache.set(k, null);
    return null;
  }
}

export async function idbGet<T>(key: string, opts?: { dbName?: string; storeName?: string }): Promise<T | undefined> {
  const s = getOrCreateIdbStore(opts?.dbName, opts?.storeName);
  if (!s) return undefined;
  try {
    return await get<T>(key, s);
  } catch {
    return undefined;
  }
}

export async function idbSet<T>(key: string, value: T | null, opts?: { dbName?: string; storeName?: string }): Promise<void> {
  const s = getOrCreateIdbStore(opts?.dbName, opts?.storeName);
  if (!s) return;
  try {
    value === null ? await del(key, s) : await set(key, value, s);
  } catch {
    /* swallow to keep UI responsive */
  }
}
