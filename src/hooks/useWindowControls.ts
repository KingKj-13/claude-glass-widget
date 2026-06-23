import { useEffect } from "react";
import { useSettings } from "@/store/settingsStore";
import { useUI } from "@/store/uiStore";
import {
  listen,
  setAlwaysOnTop,
  setAutostart,
  setClickThrough,
  setWidgetSize,
} from "@/lib/tauri";

/** Collapsed (HUD) geometry. Matches the reference mockup. */
export const COLLAPSED_SIZE = { width: 400, height: 520 };
/** Expanded (detail) geometry. */
export const EXPANDED_SIZE = { width: 650, height: 800 };

/**
 * Keeps the OS window in sync with settings + UI state, and wires up the tray
 * menu events (`open-settings`, `toggle-expand`).
 */
export function useWindowControls(): void {
  const { alwaysOnTop, clickThrough, launchOnStartup } = useSettings();
  const expanded = useUI((s) => s.expanded);
  const setExpanded = useUI((s) => s.setExpanded);
  const openSettings = useUI((s) => s.openSettings);

  // Always-on-top.
  useEffect(() => {
    void setAlwaysOnTop(alwaysOnTop);
  }, [alwaysOnTop]);

  // Click-through.
  useEffect(() => {
    void setClickThrough(clickThrough);
  }, [clickThrough]);

  // Launch on startup.
  useEffect(() => {
    void setAutostart(launchOnStartup);
  }, [launchOnStartup]);

  // Resize when expanding / collapsing (backend keeps the top-right anchored).
  useEffect(() => {
    const target = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
    void setWidgetSize(target.width, target.height, true);
  }, [expanded]);

  // Tray / shortcut events.
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    listen("open-settings", () => openSettings()).then((u) => unsubs.push(u));
    listen<boolean>("toggle-expand", () => setExpanded(!useUI.getState().expanded)).then(
      (u) => unsubs.push(u),
    );
    return () => unsubs.forEach((u) => u());
  }, [openSettings, setExpanded]);
}
