import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../../lib/utils";
import { usePortalPosition } from "../../hooks/usePortalPosition";
import { createPortal } from "react-dom";

export function InlineDropdown<T extends string>({
  value,
  options,
  onChange,
  renderOption,
  renderValue,
  disabled = false,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderOption: (opt: T) => React.ReactNode;
  renderValue: (val: T) => React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm",
          disabled ? "cursor-default opacity-70" : "hover:bg-gray-100"
        )}
      >
        {renderValue(value)}
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[140px] sm:min-w-[160px] max-w-[calc(100vw-1rem)] py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                opt === value && "bg-blue-50/50"
              )}
            >
              {renderOption(opt)}
              {opt === value && <Check size={14} className="ml-auto text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
