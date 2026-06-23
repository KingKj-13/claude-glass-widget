import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Settings {
  /** Keep the widget above all other windows. */
  alwaysOnTop: boolean;
  /** Let mouse events pass through the widget to whatever is behind it. */
  clickThrough: boolean;
  /** Launch the widget automatically when Windows starts. */
  launchOnStartup: boolean;
  /** Glass opacity, 0.4 (very see-through) .. 1 (solid-ish). */
  transparency: number;
  /** How often to poll ccusage, in seconds. */
  refreshIntervalSec: number;
}

interface SettingsState extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
  reset(): void;
}

export const DEFAULT_SETTINGS: Settings = {
  alwaysOnTop: true,
  clickThrough: false,
  launchOnStartup: true,
  transparency: 0.85,
  refreshIntervalSec: 60,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: "claude-glass-settings",
      version: 1,
    },
  ),
);
