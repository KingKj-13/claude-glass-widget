import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

/** Small uppercase section heading used throughout the HUD. */
export function SectionLabel({ children, right, className }: SectionLabelProps) {
  return (
    <div className={cn("mb-2 flex items-center justify-between", className)}>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
        {children}
      </span>
      {right}
    </div>
  );
}
