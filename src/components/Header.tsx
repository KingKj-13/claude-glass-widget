import { motion } from "framer-motion";
import { Cog, Expand, Collapse, Minimize } from "./icons";
import { ClaudeLogo } from "./ClaudeLogo";
import { StatusIndicator } from "./StatusIndicator";
import type { StatusLevel } from "@/types/usage";
import { useUI } from "@/store/uiStore";
import { minimizeToTray } from "@/lib/tauri";

interface HeaderProps {
  level: StatusLevel;
}

/**
 * Top bar: brand mark + title, the live status pill, and the settings / expand
 * controls. The whole bar (except the buttons) is a Tauri drag region so the
 * user can fling the HUD around the desktop.
 */
export function Header({ level }: HeaderProps) {
  const expanded = useUI((s) => s.expanded);
  const toggleExpanded = useUI((s) => s.toggleExpanded);
  const openSettings = useUI((s) => s.openSettings);

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between"
    >
      <div data-tauri-drag-region className="flex items-center gap-3">
        <motion.div
          initial={{ rotate: -20, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="grid h-11 w-11 place-items-center rounded-2xl glass-tile"
          style={{ boxShadow: "0 0 22px rgba(217,119,87,0.35)" }}
        >
          <ClaudeLogo size={26} />
        </motion.div>
        <div data-tauri-drag-region className="leading-none">
          <h1
            data-tauri-drag-region
            className="text-[22px] font-extrabold tracking-tight text-white text-glow"
          >
            Claude
          </h1>
          <p
            data-tauri-drag-region
            className="mt-0.5 text-[11px] font-medium tracking-wide text-white/50"
          >
            AI Usage Monitor
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusIndicator level={level} />
        <IconButton label="Settings" onClick={openSettings}>
          <Cog />
        </IconButton>
        <IconButton
          label={expanded ? "Collapse" : "Expand"}
          onClick={toggleExpanded}
        >
          {expanded ? <Collapse /> : <Expand />}
        </IconButton>
        <IconButton label="Minimize to tray" onClick={() => void minimizeToTray()}>
          <Minimize />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      onClick={onClick}
      whileHover={{ scale: 1.08, backgroundColor: "rgba(255,255,255,0.12)" }}
      whileTap={{ scale: 0.92 }}
      className="grid h-8 w-8 place-items-center rounded-xl glass-tile text-white/70 hover:text-white"
    >
      {children}
    </motion.button>
  );
}
