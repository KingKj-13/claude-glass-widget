import { motion } from "framer-motion";
import { statusFromRatio, STATUS_META, clamp } from "@/lib/utils";

interface ProgressBarProps {
  /** 0..1 fill ratio. */
  value: number;
  /** Track height in px. */
  height?: number;
}

/**
 * Animated glass progress bar with a moving shimmer highlight and a colour that
 * shifts from coral -> amber -> red as the ratio approaches the limit.
 */
export function ProgressBar({ value, height = 8 }: ProgressBarProps) {
  const v = clamp(value, 0, 1);
  const status = statusFromRatio(v);
  const color = STATUS_META[status].color;

  // Coral base, shifting toward the status colour near the limit.
  const from = "#d97757";
  const to = color;

  return (
    <div
      className="relative w-full overflow-hidden rounded-pill"
      style={{
        height,
        background: "rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.35)",
      }}
    >
      <motion.div
        className="relative h-full rounded-pill"
        initial={{ width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 22, mass: 0.6 }}
        style={{
          background: `linear-gradient(90deg, ${from}, ${to})`,
          boxShadow: `0 0 12px ${STATUS_META[status].ring}`,
        }}
      >
        {/* Moving shimmer highlight */}
        <div className="absolute inset-0 overflow-hidden rounded-pill">
          <div
            className="absolute inset-y-0 w-1/3 animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
