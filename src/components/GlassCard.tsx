import { motion } from "framer-motion";
import { useSettings } from "@/store/settingsStore";
import { useUI } from "@/store/uiStore";
import { clamp } from "@/lib/utils";
import { startResize, type ResizeDir } from "@/lib/tauri";
import { Grip } from "./icons";

interface GlassCardProps {
  children: React.ReactNode;
}

/**
 * The floating glass surface itself.
 *
 * The OS window is transparent; this is the only element that paints. It layers
 * a white specular highlight over a dark tint whose opacity is driven by the
 * user's Transparency setting (more transparency -> less dark tint), so the HUD
 * stays readable over bright wallpapers yet melts into dark ones.
 */
export function GlassCard({ children }: GlassCardProps) {
  const transparency = useSettings((s) => s.transparency);
  const setHovering = useUI((s) => s.setHovering);

  // transparency 0.4 (more solid) .. 1 (pure glass)
  const t = clamp(transparency, 0.3, 1);
  const darkAlpha = (1 - t) * 0.6 + 0.06; // 0.3 -> 0.48, 1 -> 0.06

  return (
    <motion.div
      layout
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="relative flex h-screen w-screen flex-col overflow-hidden rounded-glass"
      style={{
        background: `
          linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.06)),
          rgba(16,14,20,${darkAlpha})
        `,
        backdropFilter: "blur(30px) saturate(170%)",
        WebkitBackdropFilter: "blur(30px) saturate(170%)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow:
          "0 20px 80px rgba(0,0,0,0.35), inset 0 1px 0 0 rgba(255,255,255,0.22)",
      }}
    >
      {/* Top specular sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10), transparent)",
        }}
      />
      {/* Animated edge glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-glass"
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          boxShadow:
            "inset 0 0 60px rgba(217,119,87,0.08), inset 0 0 1px rgba(255,255,255,0.4)",
        }}
      />
      {children}

      {/* Interactive resize handles — frameless windows have no native ones. */}
      <ResizeGrip dir="SouthWest" />
      <ResizeGrip dir="SouthEast" />
    </motion.div>
  );
}

/** A draggable corner grip that starts an OS-driven window resize. */
function ResizeGrip({ dir }: { dir: ResizeDir }) {
  const isLeft = dir === "SouthWest";
  return (
    <div
      onMouseDown={(e) => {
        // Only the primary button, and don't let it start a text selection.
        if (e.button !== 0) return;
        e.preventDefault();
        void startResize(dir);
      }}
      title="Drag to resize"
      className={
        "group absolute bottom-0 z-40 grid h-6 w-6 place-items-end p-1 " +
        (isLeft
          ? "left-0 cursor-nesw-resize"
          : "right-0 cursor-nwse-resize")
      }
    >
      <Grip
        size={12}
        className={
          "text-white/25 transition-colors group-hover:text-white/60 " +
          (isLeft ? "-scale-x-100" : "")
        }
      />
    </div>
  );
}
