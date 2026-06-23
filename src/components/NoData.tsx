import { motion } from "framer-motion";
import { ClaudeLogo } from "./ClaudeLogo";
import { Refresh } from "./icons";
import { useUsage } from "@/store/usageStore";

interface NoDataProps {
  reason?: string;
}

/** Shown when no usage source is reachable (e.g. ccusage not installed). */
export function NoData({ reason }: NoDataProps) {
  const refresh = useUsage((s) => s.refresh);
  const loading = useUsage((s) => s.loading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        className="grid h-16 w-16 place-items-center rounded-3xl glass-tile"
      >
        <ClaudeLogo size={34} />
      </motion.div>

      <div>
        <h2 className="text-[16px] font-bold text-white">
          No Claude Usage Data Available
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">
          {reason ?? "We couldn't read your Claude usage."}
        </p>
      </div>

      <div className="glass-tile w-full rounded-card p-3 text-left">
        <p className="text-[11px] font-semibold text-white/70">Install ccusage</p>
        <code className="selectable mt-1 block rounded-lg bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-claude-200">
          npm install -g ccusage
        </code>
        <p className="mt-2 text-[10px] text-white/40">
          Then make sure you've used Claude Code at least once so usage logs
          exist.
        </p>
      </div>

      <motion.button
        onClick={() => void refresh()}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 rounded-pill bg-claude-500/90 px-4 py-2 text-[12px] font-semibold text-white shadow-glow"
      >
        <motion.span
          animate={loading ? { rotate: 360 } : { rotate: 0 }}
          transition={
            loading
              ? { duration: 1, repeat: Infinity, ease: "linear" }
              : { duration: 0.2 }
          }
        >
          <Refresh size={14} />
        </motion.span>
        {loading ? "Checking…" : "Retry"}
      </motion.button>
    </motion.div>
  );
}
