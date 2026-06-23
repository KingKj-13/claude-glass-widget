import { useEffect } from "react";
import { useUsage } from "@/store/usageStore";
import { useSettings } from "@/store/settingsStore";
import { listen } from "@/lib/tauri";

/**
 * Drives data refresh:
 *  - immediately on mount,
 *  - on the configured interval (`refreshIntervalSec`),
 *  - whenever the tray "Refresh Data" item fires a `refresh-data` event,
 *  - when the window regains focus (cheap freshness win).
 */
export function useUsagePolling(): void {
  const refresh = useUsage((s) => s.refresh);
  const intervalSec = useSettings((s) => s.refreshIntervalSec);

  // Interval polling (re-armed whenever the interval setting changes).
  useEffect(() => {
    void refresh();
    const id = window.setInterval(
      () => void refresh(),
      Math.max(5, intervalSec) * 1000,
    );
    return () => window.clearInterval(id);
  }, [refresh, intervalSec]);

  // Tray-initiated refresh.
  useEffect(() => {
    let un = () => {};
    listen("refresh-data", () => void refresh()).then((fn) => (un = fn));
    return () => un();
  }, [refresh]);

  // Refresh on focus / visibility regain.
  useEffect(() => {
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
}
