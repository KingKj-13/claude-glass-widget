/**
 * Canonical data model for the widget.
 *
 * Every data source (ccusage today, a mobile sync service tomorrow) is adapted
 * into a `UsageSnapshot`. The UI never talks to a data source directly — it only
 * ever renders a `UsageSnapshot`. See `lib/providers`.
 */

export type StatusLevel = "healthy" | "warn" | "danger";

/** Per-model request / token consumption. */
export interface ModelUsage {
  /** Human label, e.g. "Claude Sonnet". */
  name: string;
  /** Stable model id, e.g. "claude-sonnet-4-6". */
  modelId: string;
  /** Requests consumed in the current window. */
  requestsUsed: number;
  /** Request ceiling for the current window. */
  requestsLimit: number;
  /** Tokens consumed by this model in the current window. */
  tokensUsed: number;
}

/** Daily token budget figures (whole tokens). */
export interface TokenStats {
  availableToday: number;
  usedToday: number;
  remainingToday: number;
}

/** Current rolling-window ("session") figures (whole tokens). */
export interface SessionStats {
  usage: number;
  remaining: number;
  limit: number;
}

/** Information about the active usage window and when it rolls over. */
export interface ResetInfo {
  /** Epoch milliseconds at which the active window resets. */
  resetAt: number;
  /** Epoch milliseconds at which the active window started. */
  windowStart: number;
}

/** A single point on a mini chart. */
export interface ChartPoint {
  label: string;
  value: number;
}

/** A generic historical row used in the expanded breakdowns. */
export interface HistoryEntry {
  /** ISO date or label, e.g. "2026-06-23" or "Week 24". */
  period: string;
  tokens: number;
  requests: number;
  cost: number;
}

/** A past reset event. */
export interface ResetEntry {
  at: number;
  tokensAtReset: number;
}

/** A past session / rolling window. */
export interface SessionEntry {
  startedAt: number;
  endedAt: number;
  tokens: number;
  requests: number;
}

/** The single object the entire UI renders from. */
export interface UsageSnapshot {
  /** False when no data source could be reached (e.g. ccusage not installed). */
  available: boolean;
  /** Optional human-readable reason when `available` is false. */
  reason?: string;
  /** Which provider produced this snapshot, e.g. "ccusage" or "mock". */
  source: string;

  models: ModelUsage[];
  tokens: TokenStats;
  session: SessionStats;
  reset: ResetInfo;

  hourly: ChartPoint[];
  daily: ChartPoint[];
  weekly: ChartPoint[];
  monthly: ChartPoint[];

  history: {
    daily: HistoryEntry[];
    weekly: HistoryEntry[];
    monthly: HistoryEntry[];
  };
  resetHistory: ResetEntry[];
  sessionHistory: SessionEntry[];

  /** Epoch milliseconds when this snapshot was produced. */
  updatedAt: number;
}

/** An empty snapshot used when no data source is available. */
export function emptySnapshot(reason: string): UsageSnapshot {
  return {
    available: false,
    reason,
    source: "none",
    models: [],
    tokens: { availableToday: 0, usedToday: 0, remainingToday: 0 },
    session: { usage: 0, remaining: 0, limit: 0 },
    reset: { resetAt: Date.now(), windowStart: Date.now() },
    hourly: [],
    daily: [],
    weekly: [],
    monthly: [],
    history: { daily: [], weekly: [], monthly: [] },
    resetHistory: [],
    sessionHistory: [],
    updatedAt: Date.now(),
  };
}
