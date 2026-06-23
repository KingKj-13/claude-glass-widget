import type { UsageProvider } from "./types";
import { CcusageProvider } from "./ccusage";
import { MockUsageProvider } from "./mock";
import { isTauri } from "@/lib/utils";

export type { UsageProvider, SyncProvider } from "./types";
export { CcusageProvider } from "./ccusage";
export { MockUsageProvider } from "./mock";
export { syncProvider, NoopSyncProvider } from "./SyncProvider";

/**
 * Select the active usage provider for this runtime.
 *
 * - Inside the desktop app -> real ccusage (with a mock fallback so the UI is
 *   never blank while previewing without ccusage installed, controlled by the
 *   `allowMockFallback` flag).
 * - In a plain browser (`npm run dev`) -> mock, so the design is fully
 *   previewable without the Tauri backend.
 */
export function createUsageProvider(): UsageProvider {
  if (isTauri()) {
    return new CcusageProvider();
  }
  return new MockUsageProvider();
}

/** A standalone mock provider, handy for design previews / storybook-style use. */
export const mockProvider = new MockUsageProvider();
