import deepEqual from "fast-deep-equal";
import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import type { z } from "zod";
import { getStore } from "./components/store-registry";

export type T_UseLocalDb<T> = {
  key: string;
  schema: z.ZodSchema<T>;
  initialValue?: T | null;
  /** Optional: choose a specific IndexedDB database & object store */
  dbName?: string;
  storeName?: string;
};

export type UseLocalDbReturn<T> = {
  value: T | null | undefined;
  setValue: (next: T | null) => void;
};

export function useLocalDb<T>({ key, schema, initialValue = null, dbName, storeName }: T_UseLocalDb<T>): UseLocalDbReturn<T> {
  const isValid = useMemo(
    () => (val: T | null) => {
      if (val === null) return true;
      const res = schema.safeParse(val);
      return res.success;
    },
    [schema]
  );

  const isEqual = useMemo(
    () => (a: T | null | undefined, b: T | null | undefined) => {
      if (a === b) return true; // handles primitives + null/undefined fast path
      if (!a || !b) return false; // one is null/undefined and they weren't ===
      if (typeof a !== "object" || typeof b !== "object") return false;
      return deepEqual(a, b);
    },
    []
  );

  const initialRef = useRef(initialValue);
  const ns = useMemo(() => ({ dbName, storeName }), [dbName, storeName]);

  const store = useMemo(() => getStore<T>(key, initialRef.current, isValid, isEqual, ns), [key, isValid, isEqual, ns]);

  const value = useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    () => store.value,
    () => store.value
  ) as T | null | undefined;

  const setValue = useCallback(
    (next: T | null) => {
      if (store.isEqual(value, next)) return;
      const safe = isValid(next) ? next : (store.repairTo as T | null);
      store.setValue(safe);
    },
    [store, value, isValid]
  );

  store.hydrate();

  return { value, setValue };
}
