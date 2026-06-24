import { motion } from "framer-motion";
import type { ModelUsage } from "@/types/usage";
import { ProgressBar } from "./ProgressBar";
import { SectionLabel } from "./SectionLabel";
import { StatusIndicator } from "./StatusIndicator";
import {
  formatCompact,
  formatPct,
  ratio,
  statusFromRatio,
  STATUS_META,
} from "@/lib/utils";

interface UsageSectionProps {
  models: ModelUsage[];
}

/** Per-model usage within the active 5-hour window (Claude Sonnet, Claude Opus). */
export function UsageSection({ models }: UsageSectionProps) {
  return (
    <section>
      <SectionLabel>Model Usage · 5h Window</SectionLabel>
      <div className="flex flex-col gap-3">
        {models.map((m, i) => (
          <ModelRow key={m.modelId} model={m} index={i} />
        ))}
      </div>
    </section>
  );
}

function ModelRow({ model, index }: { model: ModelUsage; index: number }) {
  const r = ratio(model.windowUsed, model.windowLimit);
  const status = statusFromRatio(r);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">
            {model.name}
          </span>
          <StatusIndicator level={status} showLabel={false} />
        </div>
        <span className="text-[11px] font-medium tabular-nums text-white/60">
          <span className="text-white">{formatCompact(model.windowUsed)}</span>
          {" / "}
          {formatCompact(model.windowLimit)} Tokens
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <ProgressBar value={r} />
        </div>
        <span
          className="w-9 text-right text-[11px] font-bold tabular-nums"
          style={{ color: STATUS_META[status].color }}
        >
          {formatPct(r)}
        </span>
      </div>
    </motion.div>
  );
}
