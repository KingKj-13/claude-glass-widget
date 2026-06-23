import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  /** Optional small caption under the value. */
  caption?: string;
  /** Accent colour for the value text. */
  accent?: string;
  className?: string;
}

/** A compact glass stat tile used across the token & session sections. */
export function StatTile({
  label,
  value,
  caption,
  accent,
  className,
}: StatTileProps) {
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "glass-tile glass-tile-hover rounded-card px-3 py-2.5",
        "flex flex-col gap-0.5",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
        {label}
      </span>
      <span
        className="text-[15px] font-bold tabular-nums leading-tight text-white text-glow"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {caption && (
        <span className="text-[10px] font-medium text-white/40">{caption}</span>
      )}
    </motion.div>
  );
}
