import { useEffect, useState } from "react";

/**
 * Returns the remaining milliseconds until `target` (epoch ms), ticking every
 * second. Clamps at 0 and never goes negative.
 */
export function useCountdown(target: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return remaining;
}
