import type { ReactNode } from "react";

export function PropertyItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon} <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
