import type { UsageSnapshot } from "@/types/usage";
import type { SyncProvider } from "./types";

/**
 * MOBILE-SYNC PREPARATION (scaffold only — not wired to any backend yet).
 *
 * This is the seam where a future cloud sync layer plugs in so that an Android
 * app, a Samsung Watch face, and a web dashboard can all read the same usage
 * data the desktop widget produces.
 *
 * The interface is final; the implementation is intentionally a no-op today.
 * When the backend exists, replace the body of `RemoteSyncProvider` (or add a
 * new implementation) and flip `isEnabled()` — nothing else in the app changes.
 */
export class NoopSyncProvider implements SyncProvider {
  readonly id = "noop";

  isEnabled(): boolean {
    return false;
  }

  async push(_snapshot: UsageSnapshot): Promise<void> {
    // No remote configured yet.
  }

  async pull(): Promise<UsageSnapshot | null> {
    return null;
  }

  subscribe(_handler: (snapshot: UsageSnapshot) => void): () => void {
    // Nothing to subscribe to yet; return a no-op unsubscribe.
    return () => {};
  }
}

/**
 * Reference shape for a real implementation. Kept here (unused) to document the
 * intended wiring for whoever builds the sync backend.
 *
 *   export class RemoteSyncProvider implements SyncProvider {
 *     constructor(private endpoint: string, private token: string) {}
 *     isEnabled() { return Boolean(this.endpoint && this.token); }
 *     async push(s) { await fetch(`${this.endpoint}/snapshot`, {
 *       method: "POST", headers: { Authorization: `Bearer ${this.token}` },
 *       body: JSON.stringify(s),
 *     }); }
 *     async pull() { ... }
 *     subscribe(handler) {  // e.g. EventSource / WebSocket  }
 *   }
 */

export const syncProvider: SyncProvider = new NoopSyncProvider();
