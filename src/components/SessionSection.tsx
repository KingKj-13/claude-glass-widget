import type { SessionStats } from "@/types/usage";
import { SectionLabel } from "./SectionLabel";
import { StatTile } from "./StatTile";
import { ProgressBar } from "./ProgressBar";
import { StatusIndicator } from "./StatusIndicator";
import {
  formatCompact,
  formatPct,
  ratio,
  statusFromRatio,
  STATUS_META,
} from "@/lib/utils";

interface SessionSectionProps {
  session: SessionStats;
}

/** Current rolling-window ("session") usage & remaining. */
export function SessionSection({ session }: SessionSectionProps) {
  const r = ratio(session.usage, session.limit);
  const status = statusFromRatio(r);

  return (
    <section>
      <SectionLabel
        right={<StatusIndicator level={status} showLabel={false} />}
      >
        Current Session
      </SectionLabel>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <StatTile
          label="Session Usage"
          value={`${formatCompact(session.usage)} Tokens`}
          accent="#f0a085"
        />
        <StatTile
          label="Session Remaining"
          value={`${formatCompact(session.remaining)} Tokens`}
          accent="#4ade80"
        />
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
    </section>
  );
}
