import { useState, useEffect } from "react";

export function usePortalPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256;
    if (top + 300 > window.innerHeight - 16) top = rect.top - 304;
    setPos({ top, left });
  }, [open]);
  return pos;
}
