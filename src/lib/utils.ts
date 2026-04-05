import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Enter/Escape key handler that ignores IME composition (한글 등 조합 중 중복 방지) */
export function onKeys(
  handlers: { Enter?: () => void; Escape?: () => void },
  opts?: { noShift?: boolean; preventDefault?: boolean },
): React.KeyboardEventHandler {
  return (e) => {
    if (e.key === "Enter" && handlers.Enter && !e.nativeEvent.isComposing) {
      if (opts?.noShift && e.shiftKey) return;
      if (opts?.preventDefault !== false) e.preventDefault();
      handlers.Enter();
    } else if (e.key === "Escape" && handlers.Escape) {
      handlers.Escape();
    }
  };
}
