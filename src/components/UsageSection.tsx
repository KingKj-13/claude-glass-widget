import { motion } from "framer-motion";
import type { ModelUsage } from "@/types/usage";
import { ProgressBar } from "./ProgressBar";
import { SectionLabel } from "./SectionLabel";
import { StatusIndicator } from "./StatusIndicator";
import { formatCompact, ratio, statusFromRatio } from "@/lib/utils";

interface UsageSectionProps {
  models: ModelUsage[];
}

/** Per-model request progress (Claude Sonnet, Claude Opus). */
export function UsageSection({ models }: UsageSectionProps) {
  return (
    <section>
      <SectionLabel>Model Usage</SectionLabel>
      <div className="flex flex-col gap-3">
        {models.map((m, i) => (
          <ModelRow key={m.modelId} model={m} index={i} />
        ))}
      </div>
    </section>
  );
}

function ModelRow({ model, index }: { model: ModelUsage; index: number }) {
  const r = ratio(model.requestsUsed, model.requestsLimit);
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
          <span className="text-white">{formatCompact(model.requestsUsed)}</span>
          {" / "}
          {formatCompact(model.requestsLimit)} Requests Used
        </span>
      </div>
      <ProgressBar value={r} />
    </motion.div>
  );
}
