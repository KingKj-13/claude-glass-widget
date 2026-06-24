import { motion } from "framer-motion";
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
  /** Generated tokens used in the active 5-hour window. */
  used: number;
  /** Budget for the active 5-hour window. */
  limit: number;
}

/** A single overall usage bar for the active 5-hour window. */
export function UsageSection({ used, limit }: UsageSectionProps) {
  const r = ratio(used, limit);
  const status = statusFromRatio(r);

  return (
    <section>
      <SectionLabel right={<StatusIndicator level={status} showLabel={false} />}>
        Usage
      </SectionLabel>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-medium tabular-nums text-white/60">
            <span className="text-white">{formatCompact(used)}</span>
            {" / "}
            {formatCompact(limit)} Tokens
          </span>
          <span className="text-[10px] font-medium text-white/40">
            5h window
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <ProgressBar value={r} height={10} />
          </div>
          <span
            className="w-9 text-right text-[12px] font-bold tabular-nums"
            style={{ color: STATUS_META[status].color }}
          >
            {formatPct(r)}
          </span>
        </div>
      </motion.div>
    </section>
  );
}
