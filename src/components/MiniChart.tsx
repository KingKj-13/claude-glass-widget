import { useId } from "react";
import { motion } from "framer-motion";
import type { ChartPoint } from "@/types/usage";
import { formatCompact, cn } from "@/lib/utils";

interface MiniChartProps {
  title: string;
  points: ChartPoint[];
  color?: string;
  /** Chart drawing height in px (excludes header). */
  height?: number;
  className?: string;
}

/**
 * Apple-style smooth area chart. Builds a Catmull-Rom spline (converted to cubic
 * béziers) so the line is genuinely curved rather than piecewise-linear, fills
 * underneath with a soft gradient, and animates the stroke on mount.
 */
export function MiniChart({
  title,
  points,
  color = "#d97757",
  height = 64,
  className,
}: MiniChartProps) {
  const gid = useId().replace(/:/g, "");
  const W = 300;
  const H = height;
  const pad = 6;

  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (p.value - min) / range) * (H - pad * 2);
    return [x, y] as const;
  });

  const linePath = smoothPath(coords);
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1][0]},${H} L ${coords[0][0]},${H} Z`
      : "";

  const last = points[points.length - 1]?.value ?? 0;
  const peak = Math.max(...values, 0);

  return (
    <div className={cn("glass-tile rounded-card p-3", className)}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-white/70">
          {title}
        </span>
        <span className="text-[10px] font-medium text-white/40">
          peak {formatCompact(peak)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.42} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`stroke-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} stopOpacity={1} />
          </linearGradient>
        </defs>

        {areaPath && <path d={areaPath} fill={`url(#fill-${gid})`} />}

        {linePath && (
          <motion.path
            d={linePath}
            fill="none"
            stroke={`url(#stroke-${gid})`}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            style={{ filter: `drop-shadow(0 2px 6px ${color}66)` }}
          />
        )}

        {/* End-point marker */}
        {coords.length > 0 && (
          <motion.circle
            cx={coords[coords.length - 1][0]}
            cy={coords[coords.length - 1][1]}
            r={2.8}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        )}
      </svg>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-white/35">
          {points[0]?.label ?? ""}
        </span>
        <span className="text-[10px] font-semibold text-white/55">
          now {formatCompact(last)}
        </span>
      </div>
    </div>
  );
}

/**
 * Convert a list of points into a smooth SVG path using a Catmull-Rom spline
 * expressed as cubic béziers. Falls back to a straight `M/L` for <3 points.
 */
function smoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
  if (pts.length === 0) return "";
  if (pts.length < 3) {
    return pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`)
      .join(" ");
  }

  const t = 0.5; // tension
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];

    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * t * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * t * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * t * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * t * 2;

    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}
