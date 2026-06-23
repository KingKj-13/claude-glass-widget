import { isTauri } from "./utils";

/**
 * Thin, browser-safe wrappers around the Tauri APIs we use.
 *
 * Every function is a no-op (or sensible default) when not running inside the
 * desktop app, so the same React code runs in `npm run dev` without crashing.
 */

/** Invoke a backend command; resolves to `fallback` when not in Tauri. */
export async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
  fallback?: T,
): Promise<T | undefined> {
  if (!isTauri()) return fallback;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[tauri] invoke "${cmd}" failed:`, err);
    return fallback;
  }
}

/** Subscribe to a backend event. Returns an unsubscribe function. */
export async function listen<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  if (!isTauri()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    const un = await listen<T>(event, (e) => handler(e.payload));
    return un;
  } catch (err) {
    console.warn(`[tauri] listen "${event}" failed:`, err);
    return () => {};
  }
}

/* --------------------------- window controls ----------------------------- */

export async function setAlwaysOnTop(value: boolean): Promise<void> {
  await invoke("set_always_on_top", { value });
}

export async function setWidgetSize(
  width: number,
  height: number,
  animate = true,
): Promise<void> {
  await invoke("set_widget_size", { width, height, animate });
}

export async function showWindow(): Promise<void> {
  await invoke("show_window");
}

export async function hideWindow(): Promise<void> {
  await invoke("hide_window");
}

/** Minimize the HUD to the system tray (no taskbar entry exists). */
export async function minimizeToTray(): Promise<void> {
  await invoke("hide_window");
}

/**
 * Begin an OS-driven window move. Called on mousedown over the header so the
 * whole top bar reliably drags the widget (more robust than relying solely on
 * the `data-tauri-drag-region` attribute). No-op outside Tauri.
 */
export async function startDrag(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startDragging();
  } catch (err) {
    console.warn("[tauri] startDrag failed:", err);
  }
}

/** Edge/corner identifiers accepted by Tauri's interactive resize. */
export type ResizeDir =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

/**
 * Begin an interactive, OS-driven resize from the given edge/corner. This is how
 * a frameless window gets draggable resize handles. No-op outside Tauri.
 */
export async function startResize(direction: ResizeDir): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    // The runtime accepts the string directly; cast keeps us decoupled from the
    // exact exported enum type across @tauri-apps/api versions.
    await (getCurrentWindow().startResizeDragging as (d: string) => Promise<void>)(
      direction,
    );
  } catch (err) {
    console.warn("[tauri] startResize failed:", err);
  }
}

export async function quitApp(): Promise<void> {
  await invoke("quit_app");
}

/* ----------------------------- autostart --------------------------------- */

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  try {
    const { enable, disable, isEnabled } = await import(
      "@tauri-apps/plugin-autostart"
    );
    const already = await isEnabled();
    if (enabled && !already) await enable();
    if (!enabled && already) await disable();
  } catch (err) {
    console.warn("[tauri] autostart toggle failed:", err);
  }
}
