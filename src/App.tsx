import { AnimatePresence } from "framer-motion";
import { useUsage } from "@/store/usageStore";
import { useUI } from "@/store/uiStore";
import { useUsagePolling } from "@/hooks/useUsagePolling";
import { useWindowControls } from "@/hooks/useWindowControls";
import { aggregateStatus, ratio } from "@/lib/utils";

import { GlassCard } from "@/components/GlassCard";
import { Header } from "@/components/Header";
import { UsageSection } from "@/components/UsageSection";
import { ResetSection } from "@/components/ResetSection";
import { DailyTokenSection } from "@/components/DailyTokenSection";
import { SessionSection } from "@/components/SessionSection";
import { MiniChart } from "@/components/MiniChart";
import { SectionLabel } from "@/components/SectionLabel";
import { ExpandedPanel } from "@/components/ExpandedPanel";
import { Settings } from "@/components/Settings";
import { NoData } from "@/components/NoData";

export default function App() {
  useUsagePolling();
  useWindowControls();

  const snapshot = useUsage((s) => s.snapshot);
  const expanded = useUI((s) => s.expanded);

  // Overall HUD status = worst of per-model request ratios + session ratio.
  const level = aggregateStatus([
    ...snapshot.models.map((m) => ratio(m.requestsUsed, m.requestsLimit)),
    ratio(snapshot.session.usage, snapshot.session.limit),
  ]);

  return (
    <GlassCard>
      <div className="flex h-full flex-col px-5 pb-5 pt-4">
        <Header level={level} />

        {!snapshot.available ? (
          <NoData reason={snapshot.reason} />
        ) : (
          <div className="scroll-thin mt-4 flex-1 space-y-4 overflow-y-auto pr-0.5">
            <UsageSection models={snapshot.models} />
            <ResetSection reset={snapshot.reset} />
            <DailyTokenSection tokens={snapshot.tokens} />
            <SessionSection session={snapshot.session} />

            <section>
              <SectionLabel>Usage Charts</SectionLabel>
              <div className="grid grid-cols-1 gap-2.5">
                <MiniChart title="24 Hour Usage" points={snapshot.hourly} />
                <MiniChart
                  title="7 Day Usage"
                  points={snapshot.daily}
                  color="#f0a085"
                />
              </div>
            </section>

            <AnimatePresence initial={false}>
              {expanded && <ExpandedPanel snapshot={snapshot} />}
            </AnimatePresence>
          </div>
        )}

        <Footer />
      </div>

      <Settings />
    </GlassCard>
  );
}

function Footer() {
  const lastRefresh = useUsage((s) => s.lastRefresh);
  const loading = useUsage((s) => s.loading);
  const source = useUsage((s) => s.snapshot.source);

  return (
    <div className="mt-3 flex items-center justify-between text-[10px] text-white/35">
      <span>
        Source: <span className="font-semibold text-white/55">{source}</span>
      </span>
      <span className="flex items-center gap-1.5">
        {loading && (
          <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-claude-400" />
        )}
        {lastRefresh
          ? `Updated ${new Date(lastRefresh).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}`
          : "Connecting…"}
      </span>
    </div>
  );
}
