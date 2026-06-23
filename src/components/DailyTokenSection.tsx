import type { TokenStats } from "@/types/usage";
import { SectionLabel } from "./SectionLabel";
import { StatTile } from "./StatTile";
import { formatFull } from "@/lib/utils";

interface DailyTokenSectionProps {
  tokens: TokenStats;
}

/** Available / Used / Remaining token budget for today. */
export function DailyTokenSection({ tokens }: DailyTokenSectionProps) {
  return (
    <section>
      <SectionLabel>Daily Tokens</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Available"
          value={formatFull(tokens.availableToday)}
        />
        <StatTile
          label="Used"
          value={formatFull(tokens.usedToday)}
          accent="#f0a085"
        />
        <StatTile
          label="Remaining"
          value={formatFull(tokens.remainingToday)}
          accent="#4ade80"
        />
      </div>
    </section>
  );
}
