import { motion, AnimatePresence } from "framer-motion";
import type { StatusLevel } from "@/types/usage";
import { STATUS_META, cn } from "@/lib/utils";

interface StatusIndicatorProps {
  level: StatusLevel;
  /** Show the text label next to the dot. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Animated traffic-light pill: green = Healthy, yellow = Approaching Limit,
 * red = Near Limit. The dot has a soft pulsing halo that transitions colour
 * smoothly between states.
 */
export function StatusIndicator({
  level,
  showLabel = true,
  className,
}: StatusIndicatorProps) {
  const meta = STATUS_META[level];

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-2 rounded-pill px-2.5 py-1",
        "glass-tile",
        className,
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full"
          style={{ backgroundColor: meta.color }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 2.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          animate={{ backgroundColor: meta.color }}
          transition={{ duration: 0.5 }}
          style={{ boxShadow: `0 0 10px ${meta.ring}` }}
        />
      </span>
      {showLabel && (
        <AnimatePresence mode="wait">
          <motion.span
            key={meta.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] font-semibold tracking-wide"
            style={{ color: meta.color }}
          >
            {meta.label}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
