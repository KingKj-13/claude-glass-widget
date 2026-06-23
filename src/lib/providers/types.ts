import type { UsageSnapshot } from "@/types/usage";

/**
 * A `UsageProvider` is any source of Claude usage data.
 *
 * Today the only real implementation reads from `ccusage` through the Tauri
 * backend. Tomorrow a `RemoteUsageProvider` could read the same shape from a
 * cloud sync service that an Android app / Samsung Watch / web dashboard also
 * consume. The UI is completely decoupled from the source.
 */
export interface UsageProvider {
  /** Stable identifier, e.g. "ccusage", "mock", "remote". */
  readonly id: string;

  /** Cheap availability probe; should not throw. */
  isAvailable(): Promise<boolean>;

  /** Produce a single normalized snapshot. Should never throw — return an
   *  unavailable snapshot instead. */
  getSnapshot(): Promise<UsageSnapshot>;
}

/**
 * A `SyncProvider` is responsible for pushing/pulling snapshots to and from a
 * remote backend so that other clients (mobile, watch, web) stay in sync.
 *
 * This is intentionally a no-op scaffold today — see `SyncProvider.ts`. It is
 * here so the rest of the app can already depend on the abstraction.
 */
export interface SyncProvider {
  readonly id: string;
  /** Whether remote sync is currently configured & reachable. */
  isEnabled(): boolean;
  /** Push the latest snapshot to the remote. No-op when disabled. */
  push(snapshot: UsageSnapshot): Promise<void>;
  /** Pull the latest remote snapshot, or null when unavailable. */
  pull(): Promise<UsageSnapshot | null>;
  /** Subscribe to remote-initiated updates. Returns an unsubscribe fn. */
  subscribe(handler: (snapshot: UsageSnapshot) => void): () => void;
}
