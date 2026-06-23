import { motion, AnimatePresence } from "framer-motion";
import { Close, Pin, Power, Bolt, Refresh } from "./icons";
import { useUI } from "@/store/uiStore";
import { useSettings, DEFAULT_SETTINGS } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

/** Slide-up glass settings sheet covering the widget. */
export function Settings() {
  const open = useUI((s) => s.settingsOpen);
  const close = useUI((s) => s.closeSettings);
  const s = useSettings();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-20 rounded-glass bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            className="absolute inset-x-3 bottom-3 top-3 z-30 flex flex-col overflow-hidden rounded-card glass-surface"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-[15px] font-bold text-white">Settings</h2>
              <button
                onClick={close}
                aria-label="Close settings"
                className="grid h-7 w-7 place-items-center rounded-lg glass-tile text-white/70 hover:text-white"
              >
                <Close size={15} />
              </button>
            </div>

            <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-4 py-3">
              <Toggle
                icon={<Pin size={15} />}
                title="Always On Top"
                desc="Keep the widget above all windows"
                checked={s.alwaysOnTop}
                onChange={(v) => s.set("alwaysOnTop", v)}
              />
              <Toggle
                icon={<Power size={15} />}
                title="Launch On Startup"
                desc="Start automatically when Windows boots"
                checked={s.launchOnStartup}
                onChange={(v) => s.set("launchOnStartup", v)}
              />

              <Slider
                icon={<Bolt size={15} />}
                title="Transparency Level"
                value={s.transparency}
                min={0.3}
                max={1}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => s.set("transparency", v)}
              />

              <Slider
                icon={<Refresh size={15} />}
                title="Refresh Interval"
                value={s.refreshIntervalSec}
                min={15}
                max={300}
                step={15}
                format={(v) => `${v}s`}
                onChange={(v) => s.set("refreshIntervalSec", v)}
              />

              <button
                onClick={s.reset}
                className="mt-2 w-full rounded-card glass-tile glass-tile-hover py-2 text-[12px] font-semibold text-white/70 hover:text-white"
              >
                Reset to defaults ({DEFAULT_SETTINGS.refreshIntervalSec}s,{" "}
                {Math.round(DEFAULT_SETTINGS.transparency * 100)}%)
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-tile flex items-center justify-between gap-3 rounded-card px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-claude-300">
          {icon}
        </span>
        <div>
          <p className="text-[13px] font-semibold text-white">{title}</p>
          {desc && <p className="text-[10px] text-white/45">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row icon={icon} title={title} desc={desc}>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-300",
          checked ? "bg-claude-500" : "bg-white/15",
        )}
        style={checked ? { boxShadow: "0 0 14px rgba(217,119,87,0.5)" } : undefined}
      >
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </button>
    </Row>
  );
}

function Slider({
  icon,
  title,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="glass-tile rounded-card px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-claude-300">
            {icon}
          </span>
          <p className="text-[13px] font-semibold text-white">{title}</p>
        </div>
        <span className="rounded-pill bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-claude-200">
          {format(value)}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={title}
          className="slider-input h-1.5 w-full cursor-pointer appearance-none rounded-pill"
          style={{
            background: `linear-gradient(90deg, #d97757 ${pct}%, rgba(255,255,255,0.14) ${pct}%)`,
          }}
        />
      </div>
    </div>
  );
}
