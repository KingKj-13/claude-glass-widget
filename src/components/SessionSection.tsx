import type { SessionStats } from "@/types/usage";
import { SectionLabel } from "./SectionLabel";
import { StatTile } from "./StatTile";
import { StatusIndicator } from "./StatusIndicator";
import { formatCompact, ratio, statusFromRatio } from "@/lib/utils";

interface SessionSectionProps {
  session: SessionStats;
}

/** Current rolling-window ("session") usage & remaining tokens. */
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
      <div className="grid grid-cols-2 gap-2">
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
    </section>
  );
}
