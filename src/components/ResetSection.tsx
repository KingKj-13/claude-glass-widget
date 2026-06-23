import { motion } from "framer-motion";
import type { ResetInfo } from "@/types/usage";
import { useCountdown } from "@/hooks/useCountdown";
import { formatCountdown, ratio } from "@/lib/utils";

interface ResetSectionProps {
  reset: ResetInfo;
}

/**
 * The "Usage Reset" hero: a large live countdown to when the active rolling
 * window rolls over, with a thin progress ring tracing elapsed window time.
 */
export function ResetSection({ reset }: ResetSectionProps) {
  const remaining = useCountdown(reset.resetAt);
  const windowMs = Math.max(1, reset.resetAt - reset.windowStart);
  const elapsed = ratio(windowMs - remaining, windowMs);

  return (
    <section className="glass-tile relative overflow-hidden rounded-card px-4 py-3.5">
      {/* Soft animated coral glow behind the timer */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(217,119,87,0.35), transparent 70%)",
        }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Usage Reset
          </span>
          <div className="mt-0.5 flex items-baseline gap-1">
            <motion.span
              key={Math.floor(remaining / 1000)}
              className="text-[34px] font-extrabold leading-none tracking-tight text-white text-glow tabular-nums"
            >
              {formatCountdown(remaining)}
            </motion.span>
          </div>
          <span className="text-[11px] font-medium text-white/45">
            Until Next Reset
          </span>
        </div>

        <ResetRing progress={elapsed} />
      </div>
    </section>
  );
}

function ResetRing({ progress }: { progress: number }) {
  const size = 58;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#d97757"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - progress) }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 6px rgba(217,119,87,0.6))" }}
      />
    </svg>
  );
}
