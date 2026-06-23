import { create } from "zustand";
import {
  emptySnapshot,
  type UsageSnapshot,
} from "@/types/usage";
import { createUsageProvider, type UsageProvider } from "@/lib/providers";
import { syncProvider } from "@/lib/providers/SyncProvider";

interface UsageState {
  snapshot: UsageSnapshot;
  loading: boolean;
  /** Wall-clock time of the last successful refresh, epoch ms. */
  lastRefresh: number | null;
  /** The active data provider. */
  provider: UsageProvider;

  /** Fetch a fresh snapshot from the active provider. */
  refresh: () => Promise<void>;
}

export const useUsage = create<UsageState>((set, get) => ({
  snapshot: emptySnapshot("Loading…"),
  loading: false,
  lastRefresh: null,
  provider: createUsageProvider(),

  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const snap = await get().provider.getSnapshot();
      set({ snapshot: snap, loading: false, lastRefresh: Date.now() });

      // Best-effort push to the (currently no-op) sync layer for future clients.
      if (snap.available && syncProvider.isEnabled()) {
        void syncProvider.push(snap);
      }
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Unknown error while refreshing.";
      set({
        snapshot: emptySnapshot(reason),
        loading: false,
        lastRefresh: Date.now(),
      });
    }
  },
}));
