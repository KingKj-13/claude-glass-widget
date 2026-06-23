import { motion, AnimatePresence } from "framer-motion";
import type {
  HistoryEntry,
  ResetEntry,
  SessionEntry,
  UsageSnapshot,
} from "@/types/usage";
import { useUI, type ExpandedTab } from "@/store/uiStore";
import { MiniChart } from "./MiniChart";
import { formatCompact, formatFull, cn } from "@/lib/utils";

interface ExpandedPanelProps {
  snapshot: UsageSnapshot;
}

const TABS: { id: ExpandedTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "sessions", label: "Sessions" },
  { id: "resets", label: "Resets" },
];

/** The detail surface revealed when the widget expands to 650 x 800. */
export function ExpandedPanel({ snapshot }: ExpandedPanelProps) {
  const tab = useUI((s) => s.tab);
  const setTab = useUI((s) => s.setTab);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4 border-t border-white/10 pt-3"
    >
      {/* Tab bar */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative rounded-pill px-3 py-1.5 text-[11px] font-semibold transition-colors",
              tab === t.id ? "text-white" : "text-white/50 hover:text-white/80",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-pill bg-claude-500/85"
                style={{ boxShadow: "0 0 16px rgba(217,119,87,0.45)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "overview" && <Overview snapshot={snapshot} />}
          {tab === "daily" && (
            <HistoryTable rows={snapshot.history.daily} firstCol="Date" />
          )}
          {tab === "weekly" && (
            <HistoryTable rows={snapshot.history.weekly} firstCol="Week" />
          )}
          {tab === "monthly" && (
            <HistoryTable rows={snapshot.history.monthly} firstCol="Month" />
          )}
          {tab === "sessions" && (
            <SessionList rows={snapshot.sessionHistory} />
          )}
          {tab === "resets" && <ResetList rows={snapshot.resetHistory} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function Overview({ snapshot }: { snapshot: UsageSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <MiniChart title="24 Hour Usage" points={snapshot.hourly} height={90} />
      <MiniChart
        title="7 Day Usage"
        points={snapshot.daily}
        color="#f0a085"
        height={90}
      />
      <MiniChart
        title="Weekly Trend"
        points={snapshot.weekly}
        color="#e87f5d"
        height={90}
      />
      <MiniChart
        title="Monthly Trend"
        points={snapshot.monthly}
        color="#c75f3f"
        height={90}
      />
    </div>
  );
}

function HistoryTable({
  rows,
  firstCol,
}: {
  rows: HistoryEntry[];
  firstCol: string;
}) {
  return (
    <div className="overflow-hidden rounded-card glass-tile">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
        <span>{firstCol}</span>
        <span className="text-right">Tokens</span>
        <span className="text-right">Requests</span>
        <span className="text-right">Cost</span>
      </div>
      <div className="scroll-thin max-h-[440px] overflow-y-auto">
        {rows.map((r, i) => (
          <motion.div
            key={r.period}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-white/5 px-3 py-2.5 text-[12px] last:border-0 hover:bg-white/[0.04]"
          >
            <span className="font-medium text-white/85">{r.period}</span>
            <span className="text-right font-semibold tabular-nums text-white">
              {formatCompact(r.tokens)}
            </span>
            <span className="text-right tabular-nums text-white/70">
              {formatFull(r.requests)}
            </span>
            <span className="text-right tabular-nums text-claude-200">
              ${r.cost.toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SessionList({ rows }: { rows: SessionEntry[] }) {
  return (
    <div className="scroll-thin max-h-[480px] space-y-2 overflow-y-auto">
      {rows.map((s, i) => (
        <motion.div
          key={s.startedAt}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-tile flex items-center justify-between rounded-card px-3 py-2.5"
        >
          <div>
            <p className="text-[12px] font-semibold text-white">
              {fmtTime(s.startedAt)} – {fmtTime(s.endedAt)}
            </p>
            <p className="text-[10px] text-white/45">{fmtDate(s.startedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-bold tabular-nums text-claude-200">
              {formatCompact(s.tokens)}
            </p>
            <p className="text-[10px] text-white/45">
              {formatFull(s.requests)} req
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ResetList({ rows }: { rows: ResetEntry[] }) {
  return (
    <div className="scroll-thin max-h-[480px] space-y-2 overflow-y-auto">
      {rows.map((r, i) => (
        <motion.div
          key={r.at}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-tile flex items-center justify-between rounded-card px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-claude-400 shadow-glow" />
            <div>
              <p className="text-[12px] font-semibold text-white">
                {fmtTime(r.at)}
              </p>
              <p className="text-[10px] text-white/45">{fmtDate(r.at)}</p>
            </div>
          </div>
          <p className="text-[12px] tabular-nums text-white/70">
            {formatCompact(r.tokensAtReset)} at reset
          </p>
        </motion.div>
      ))}
    </div>
  );
}

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
