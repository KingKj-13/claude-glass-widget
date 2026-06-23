import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Settings {
  /** Keep the widget above all other windows. */
  alwaysOnTop: boolean;
  /** Launch the widget automatically when Windows starts. */
  launchOnStartup: boolean;
  /** Glass opacity, 0.3 (more see-through) .. 1 (more solid). */
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
  launchOnStartup: true,
  transparency: 0.6,
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
      version: 2,
      // v1 shipped a too-transparent default + a click-through toggle. Reset the
      // transparency to the new readable default and drop the removed key.
      migrate: (state, version) => {
        const s = (state as Partial<SettingsState> & { clickThrough?: boolean }) ?? {};
        if (version < 2) {
          s.transparency = DEFAULT_SETTINGS.transparency;
          delete s.clickThrough;
        }
        return s as SettingsState;
      },
    },
  ),
);
