## Introduction

A tiny **client-side React hook** for **persistent state**, backed by **IndexedDB**, with:

- ✅ Zod-based schema validation
- ✅ Cross-tab synchronization (BroadcastChannel)
- ✅ Repair of invalid persisted data
- ✅ SSR-safe hydration (`value: undefined` while loading)
- ✅ No external state library required
- ✅ Per-hook database & store targeting
- ✅ Deduplicated shared store per key (`useSyncExternalStore`)

Perfect for saving **user settings, UI state, drafts, local preferences**, or anything that should persist across reloads and sync across tabs.

---

## Installation

```bash
npm install @bigbang-sdk/local-db
# or
yarn add @bigbang-sdk/local-db
# or
pnpm add @bigbang-sdk/local-db
# or
bun add @bigbang-sdk/local-db
```

Requires React 18+.

---

## Quick Example

```tsx
import { useLocalDb } from "@bigbang-sdk/local-db";
import { z } from "zod";

const SettingsSchema = z.object({
  fontSize: z.number().min(10).max(32),
});

export default function SettingsPanel() {
  const { value, setValue } = useLocalDb({
    key: "settings",
    schema: SettingsSchema,
    initialValue: { fontSize: 16 },
  });

  if (value === undefined) return <div>Loading…</div>; // hydrating

  return (
    <div>
      <div>Font size: {value.fontSize}px</div>
      <button onClick={() => setValue({ fontSize: value.fontSize + 1 })}>Increase</button>
      <button onClick={() => setValue({ fontSize: value.fontSize - 1 })}>Decrease</button>
    </div>
  );
}
```

---

## API

### `useLocalDb(options)`

| Option         | Type             | Default      | Description                                                                 |
| -------------- | ---------------- | ------------ | --------------------------------------------------------------------------- |
| `key`          | `string`         | **required** | The logical key used in IndexedDB & cross-tab sync.                         |
| `schema`       | `z.ZodSchema<T>` | **required** | Validates and repairs stored values.                                        |
| `initialValue` | `T \| null`      | `null`       | Used if no data exists or persisted data is invalid. Captured on first use. |
| `dbName`       | `string`         | `"local-db"` | Optional database name override.                                            |
| `storeName`    | `string`         | `"local-db"` | Optional object store name override.                                        |

### Returns

```ts
{
  value: T | null | undefined;
  setValue(next: T | null): void;
}
```

- **`value === undefined`** → still hydrating from IndexedDB
- **`value === null`** → no stored value
- **`value === T`** → validated, ready to use

---

## Cross-Tab Sync

Updates propagate instantly across open browser tabs/windows:

- Automatically via **BroadcastChannel**
- Repairs apply consistently across all tabs
- No unnecessary re-renders (deep-equality guarded)

---

## Validation & Repair

Every read and write is validated using your Zod schema.

If data is corrupted or has an outdated shape:

```diff
Persisted Data → schema.safeParse() → ✅ valid → used
Persisted Data → schema.safeParse() → ❌ invalid → repaired to initialValue
```

The repaired value is **automatically written back** to IndexedDB.

---

## SSR Behavior (Next.js Friendly)

This hook is designed for **client components**.

- It does **not** access `window`, `indexedDB` or `BroadcastChannel` on the server.
- `value` begins as **`undefined`** so server and client HTML always match.
- Hydration + IDB read happens **only in the browser**.

---

## Using Multiple Databases / Stores

```ts
const { value, setValue } = useLocalDb({
  key: "draft",
  schema: DraftSchema,
  initialValue: null,
  dbName: "editor-db",
  storeName: "drafts",
});
```

Tabs will **only sync if both `dbName` and `storeName` match**.

---

## Performance

- No-op writes are skipped using deep-equality.
- Broadcasts are only emitted on real changes.
- Hydration is lazy-per-key with `useSyncExternalStore`.
- UI remains responsive even if IndexedDB is slow.

### If you expect _high-frequency updates_ (e.g., live typing):

Consider batching or debouncing writes:

```ts
setValue(next);
```

---

## Why not localStorage?

| Feature                  | localStorage       | @bigbang-sdk/local-db             |
| ------------------------ | ------------------ | --------------------------------- |
| Large data               | ❌ slow / capped   | ✅ stores MBs efficiently         |
| Cross-tab sync           | ⚠️ yes, but coarse | ✅ fine-grained, structured clone |
| Validation               | ❌ no              | ✅ Zod                            |
| React state sync         | ❌ manual          | ✅ automatic                      |
| Safe corruption handling | ❌ none            | ✅ self-repair                    |

---

## License

MIT

---

## Contributing

PRs welcome!
