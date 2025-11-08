import { getBroadcastChannel } from "./broadcast";
import { DEFAULT_DB, DEFAULT_STORE, idbGet, idbSet } from "./idb";

export type StoreState<T> = {
  value: T | null | undefined; // undefined = hydrating
  repairTo: T | null;
  hydrated: boolean;
  listeners: Set<() => void>;
};

type Ns = { dbName?: string; storeName?: string };

// Composite registry key: namespace + logical key
function regKey(key: string, ns: Ns) {
  const db = ns.dbName ?? DEFAULT_DB;
  const st = ns.storeName ?? DEFAULT_STORE;
  return `${db}/${st}|${key}`;
}

const stores = new Map<
  string,
  StoreState<unknown> & {
    hydrate: () => void;
    setValue: (next: unknown | null) => void;
    isEqual: (a: unknown, b: unknown) => boolean;
  }
>();

type T_GetStore<T> = StoreState<T> & {
  hydrate: () => void;
  setValue: (next: T | null) => void;
  isEqual: (a: unknown, b: unknown) => boolean;
};

export function getStore<T>(key: string, initial: T | null, isValid: (v: T | null) => boolean, isEqual: (a: T | null | undefined, b: T | null | undefined) => boolean, ns?: Ns): T_GetStore<T> {
  const k = regKey(key, ns ?? {});
  if (stores.has(k)) return stores.get(k)! as ReturnType<typeof getStore<T>>;

  const state: StoreState<T> = {
    value: undefined,
    repairTo: initial,
    hydrated: false,
    listeners: new Set(),
  };

  const notify = () => {
    for (const fn of state.listeners) fn();
  };

  const persist = async (val: T | null) => {
    await idbSet(key, val, ns);
  };

  const setValue = (next: T | null) => {
    const safe = isValid(next) ? next : state.repairTo;
    if (isEqual(state.value, safe)) return;

    state.value = safe;

    (async () => {
      await persist(safe);
      getBroadcastChannel(ns)?.postMessage({
        key,
        value: safe,
        removed: safe === null,
      });
    })();

    notify();
  };

  const hydrate = () => {
    if (state.hydrated) return;
    state.hydrated = true;

    // client-only work; on server this early return avoids starting async tasks
    if (typeof window === "undefined") return;

    (async () => {
      const persisted = (await idbGet<T>(key, ns)) ?? state.repairTo;
      const finalVal = isValid(persisted) ? persisted : state.repairTo;

      state.value = finalVal;

      if (!isEqual(persisted, finalVal)) {
        try {
          await persist(finalVal);
        } catch {
          /* noop */
        }
      }

      notify();
    })();

    const bc = getBroadcastChannel(ns);
    if (bc) {
      const handler = (event: MessageEvent) => {
        const d = event?.data;
        if (!d || d.key !== key) return;

        const incoming: T | null = d.removed ? state.repairTo : (d.value as T | null);
        const safe = isValid(incoming) ? incoming : state.repairTo;

        if (!isEqual(state.value, safe)) {
          state.value = safe;
          notify();
        }
      };
      bc.addEventListener("message", handler);
      // no teardown needed for app lifetime; add resetStores() if you need HMR/test cleanup
    }
  };

  const store = Object.assign(state, {
    hydrate,
    setValue: (n: unknown | null) => setValue(n as T | null),
    isEqual: (a: unknown, b: unknown) => isEqual(a as T | null, b as T | null),
  });

  stores.set(k, store);
  return store;
}
