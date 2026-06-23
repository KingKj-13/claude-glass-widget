import type { StatusLevel } from "@/types/usage";

/** Detect whether we are running inside the Tauri runtime. */
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Clamp a number into the inclusive [min, max] range. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Safe ratio in [0, 1]; returns 0 when the denominator is 0. */
export const ratio = (used: number, total: number): number =>
  total <= 0 ? 0 : clamp(used / total, 0, 1);

/**
 * Compact number formatter — 4_800_000 -> "4.8M", 4_812 -> "4.8K".
 * Mirrors the look of the reference mockup.
 */
export function formatCompact(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1_000) return String(Math.round(value));
  const units = [
    { v: 1_000_000_000, s: "B" },
    { v: 1_000_000, s: "M" },
    { v: 1_000, s: "K" },
  ];
  for (const { v, s } of units) {
    if (abs >= v) {
      const n = value / v;
      // Drop a trailing ".0" so "5.0K" renders as "5K".
      const str = n.toFixed(digits).replace(/\.0+$/, "");
      return `${str}${s}`;
    }
  }
  return String(value);
}

/** Full grouped number — 5_200_000 -> "5,200,000". */
export function formatFull(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Format a percentage with no decimals — 0.962 -> "96%". */
export function formatPct(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

/**
 * Convert a millisecond duration into a human "7h 44m" style string.
 * Shows seconds only when under one hour to keep the big timer calm.
 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

/** Map a 0..1 usage ratio to a status level. */
export function statusFromRatio(r: number): StatusLevel {
  if (r >= 0.9) return "danger";
  if (r >= 0.7) return "warn";
  return "healthy";
}

export const STATUS_META: Record<
  StatusLevel,
  { label: string; color: string; ring: string; text: string }
> = {
  healthy: {
    label: "Healthy",
    color: "#4ade80",
    ring: "rgba(74,222,128,0.45)",
    text: "text-status-healthy",
  },
  warn: {
    label: "Approaching Limit",
    color: "#fbbf24",
    ring: "rgba(251,191,36,0.45)",
    text: "text-status-warn",
  },
  danger: {
    label: "Near Limit",
    color: "#f87171",
    ring: "rgba(248,113,113,0.45)",
    text: "text-status-danger",
  },
};

/** Worst (most severe) status across a set of ratios. */
export function aggregateStatus(ratios: number[]): StatusLevel {
  return ratios
    .map(statusFromRatio)
    .reduce<StatusLevel>(
      (worst, cur) =>
        rank(cur) > rank(worst) ? cur : worst,
      "healthy",
    );
}
const rank = (s: StatusLevel) => (s === "danger" ? 2 : s === "warn" ? 1 : 0);

/** Tiny classNames helper. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
