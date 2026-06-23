interface ClaudeLogoProps {
  size?: number;
  className?: string;
}

/**
 * Stylized Claude "sunburst" mark — radiating rounded spokes in the brand
 * terracotta. Rendered as inline SVG so it scales crisply and can glow.
 */
export function ClaudeLogo({ size = 34, className }: ClaudeLogoProps) {
  const spokes = 12;
  const cx = 50;
  const cy = 50;
  const inner = 7;
  const outer = 33;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      aria-label="Claude"
    >
      <defs>
        <radialGradient id="claudeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0a085" />
          <stop offset="60%" stopColor="#d97757" />
          <stop offset="100%" stopColor="#c75f3f" />
        </radialGradient>
      </defs>
      {Array.from({ length: spokes }).map((_, i) => {
        const a = (i / spokes) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * inner;
        const y1 = cy + Math.sin(a) * inner;
        const x2 = cx + Math.cos(a) * outer;
        const y2 = cy + Math.sin(a) * outer;
        // Alternate spoke length for the asterisk-burst feel.
        const len = i % 2 === 0 ? 1 : 0.7;
        const ex = cx + Math.cos(a) * (inner + (outer - inner) * len);
        const ey = cy + Math.sin(a) * (inner + (outer - inner) * len);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={ex || x2}
            y2={ey || y2}
            stroke="url(#claudeGlow)"
            strokeWidth={7}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={5.5} fill="url(#claudeGlow)" />
    </svg>
  );
}
