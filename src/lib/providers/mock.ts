import type {
  ChartPoint,
  HistoryEntry,
  ResetEntry,
  SessionEntry,
  UsageSnapshot,
} from "@/types/usage";
import type { UsageProvider } from "./types";

/**
 * Deterministic-ish demo provider. Used when the app runs in a plain browser
 * (`npm run dev`) or whenever the real ccusage source is unavailable but we want
 * to preview the UI. Numbers slowly drift so animations & the countdown look
 * alive without ever needing the Tauri backend.
 */
export class MockUsageProvider implements UsageProvider {
  readonly id = "mock";

  // Fixed window so the countdown is stable across calls within a run.
  private readonly windowStart = Date.now() - 1000 * 60 * 60 * 4 - 1000 * 60 * 16; // 4h16m ago
  private readonly windowMs = 5 * 60 * 60 * 1000; // 5h rolling window

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async getSnapshot(): Promise<UsageSnapshot> {
    const now = Date.now();
    // A gentle sine drift so the bars/charts visibly breathe over time.
    const drift = (Math.sin(now / 90000) + 1) / 2; // 0..1

    const availableToday = 10_000_000;
    const usedToday = Math.round(4_600_000 + drift * 400_000); // ~4.8M
    const remainingToday = availableToday - usedToday;

    // Active 5h window (generated tokens, excl. cache reads).
    const windowLimit = 2_000_000;
    const sonnetWindow = Math.round(820_000 + drift * 180_000); // ~0.8–1M
    const opusWindow = Math.round(240_000 + drift * 90_000); // ~0.24–0.33M

    const sessionLimit = 4_000_000;
    const sessionUsage = sonnetWindow + opusWindow;
    const sessionRemaining = sessionLimit - sessionUsage;

    return {
      available: true,
      source: this.id,
      models: [
        {
          name: "Claude Sonnet",
          modelId: "claude-sonnet-4-6",
          windowUsed: sonnetWindow,
          windowLimit,
          tokensToday: Math.round(usedToday * 0.82),
        },
        {
          name: "Claude Opus",
          modelId: "claude-opus-4-8",
          windowUsed: opusWindow,
          windowLimit,
          tokensToday: Math.round(usedToday * 0.18),
        },
      ],
      tokens: { availableToday, usedToday, remainingToday },
      session: {
        usage: sessionUsage,
        remaining: sessionRemaining,
        limit: sessionLimit,
      },
      reset: {
        windowStart: this.windowStart,
        resetAt: this.windowStart + this.windowMs,
      },
      hourly: hourly(drift),
      daily: weekDaily(),
      weekly: weekly(),
      monthly: monthly(),
      history: {
        daily: dailyHistory(),
        weekly: weeklyHistory(),
        monthly: monthlyHistory(),
      },
      resetHistory: resetHistory(),
      sessionHistory: sessionHistory(),
      updatedAt: now,
    };
  }
}

/* ----------------------------- chart builders ---------------------------- */

function hourly(drift: number): ChartPoint[] {
  const pts: ChartPoint[] = [];
  for (let h = 23; h >= 0; h--) {
    const base = Math.sin((24 - h) / 3.2) * 0.5 + 0.5;
    const spike = h < 6 ? 0.15 : h < 12 ? 0.9 : 0.65;
    const value = Math.round((base * spike + drift * 0.1) * 320_000);
    pts.push({ label: `${(new Date().getHours() - h + 24) % 24}:00`, value });
  }
  return pts;
}

function weekDaily(): ChartPoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const vals = [3.1, 5.8, 4.2, 6.7, 4.8, 2.1, 1.4];
  return days.map((label, i) => ({ label, value: Math.round(vals[i] * 1_000_000) }));
}

function weekly(): ChartPoint[] {
  const vals = [22, 28, 19, 31, 25, 33];
  return vals.map((v, i) => ({ label: `W${i + 19}`, value: v * 1_000_000 }));
}

function monthly(): ChartPoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const vals = [88, 102, 76, 121, 95, 64];
  return months.map((label, i) => ({ label, value: vals[i] * 1_000_000 }));
}

/* ---------------------------- history builders --------------------------- */

function dailyHistory(): HistoryEntry[] {
  const rows: HistoryEntry[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const tokens = Math.round((6.7 - i * 0.6 + (i % 2)) * 1_000_000);
    rows.push({
      period: d.toISOString().slice(0, 10),
      tokens,
      requests: Math.round(tokens / 1100),
      cost: +(tokens / 1_000_000 * 3.4).toFixed(2),
    });
  }
  return rows;
}

function weeklyHistory(): HistoryEntry[] {
  return [33, 25, 31, 19, 28, 22].map((m, i) => ({
    period: `Week ${24 - i}`,
    tokens: m * 1_000_000,
    requests: Math.round((m * 1_000_000) / 1100),
    cost: +(m * 3.4).toFixed(2),
  }));
}

function monthlyHistory(): HistoryEntry[] {
  return [
    ["June 2026", 64],
    ["May 2026", 95],
    ["April 2026", 121],
    ["March 2026", 76],
    ["February 2026", 102],
    ["January 2026", 88],
  ].map(([period, m]) => ({
    period: period as string,
    tokens: (m as number) * 1_000_000,
    requests: Math.round(((m as number) * 1_000_000) / 1100),
    cost: +((m as number) * 3.4).toFixed(2),
  }));
}

function resetHistory(): ResetEntry[] {
  const out: ResetEntry[] = [];
  const now = Date.now();
  for (let i = 1; i <= 6; i++) {
    out.push({
      at: now - i * 5 * 60 * 60 * 1000,
      tokensAtReset: Math.round(4_200_000 + Math.sin(i) * 900_000),
    });
  }
  return out;
}

function sessionHistory(): SessionEntry[] {
  const out: SessionEntry[] = [];
  const now = Date.now();
  for (let i = 1; i <= 6; i++) {
    const ended = now - i * 5 * 60 * 60 * 1000;
    const started = ended - 5 * 60 * 60 * 1000;
    const tokens = Math.round(3_400_000 + Math.cos(i) * 1_100_000);
    out.push({
      startedAt: started,
      endedAt: ended,
      tokens,
      requests: Math.round(tokens / 1100),
    });
  }
  return out;
}
