import { emptySnapshot, type UsageSnapshot } from "@/types/usage";
import type { UsageProvider } from "./types";
import { isTauri } from "@/lib/utils";

/**
 * Reads Claude usage from `ccusage` via the Tauri backend.
 *
 * The Rust side (`src-tauri/src/ccusage.rs`) runs the ccusage CLI, parses its
 * JSON output, and returns a fully normalized `UsageSnapshot`. This keeps all
 * process-spawning & parsing in Rust (fast, off the UI thread) and means the
 * frontend only ever deals with the canonical shape.
 */
export class CcusageProvider implements UsageProvider {
  readonly id = "ccusage";

  async isAvailable(): Promise<boolean> {
    if (!isTauri()) return false;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<boolean>("ccusage_available");
    } catch {
      return false;
    }
  }

  async getSnapshot(): Promise<UsageSnapshot> {
    if (!isTauri()) {
      return emptySnapshot("Not running inside the desktop app.");
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const snap = await invoke<UsageSnapshot>("get_usage");
      // Defensive: backend always returns the canonical shape, but guard anyway.
      if (!snap || typeof snap !== "object") {
        return emptySnapshot("Received malformed data from backend.");
      }
      return snap;
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "ccusage could not be reached.";
      return emptySnapshot(reason);
    }
  }
}
