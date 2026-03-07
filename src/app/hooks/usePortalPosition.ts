import { useState, useEffect, useCallback } from "react";

export function usePortalPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const recalc = useCallback(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256;
    if (left < 8) left = 8;
    // If dropdown would overflow bottom, flip above trigger
    if (top + 200 > window.innerHeight - 16) {
      top = rect.top - 200 - 4;
    }
    // Clamp: never go above viewport
    if (top < 8) top = 8;
    setPos({ top, left });
  }, [open, triggerRef]);

  useEffect(() => {
    recalc();
  }, [recalc]);

  return pos;
}
