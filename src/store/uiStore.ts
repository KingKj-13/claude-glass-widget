import { create } from "zustand";

export type ExpandedTab =
  | "overview"
  | "daily"
  | "weekly"
  | "monthly"
  | "sessions"
  | "resets";

interface UIState {
  /** Whether the widget is in its large, expanded form. */
  expanded: boolean;
  /** Whether the settings sheet is open. */
  settingsOpen: boolean;
  /** Active tab within the expanded panel. */
  tab: ExpandedTab;
  /** Whether the pointer is currently over the widget (drives hover chrome). */
  hovering: boolean;

  toggleExpanded: () => void;
  setExpanded: (v: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setTab: (t: ExpandedTab) => void;
  setHovering: (v: boolean) => void;
}

export const useUI = create<UIState>((set, get) => ({
  expanded: false,
  settingsOpen: false,
  tab: "overview",
  hovering: false,

  toggleExpanded: () => set({ expanded: !get().expanded }),
  setExpanded: (v) => set({ expanded: v }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  setTab: (t) => set({ tab: t }),
  setHovering: (v) => set({ hovering: v }),
}));
