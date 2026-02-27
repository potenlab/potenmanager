import { ReactNode } from "react";
import { Permission } from "../../../lib/permissions";
import { usePermission } from "../../context/PermissionContext";
import { Lock } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface PermissionGateProps {
  /** Required permission(s). If array, user needs ANY of them. */
  permission: Permission | Permission[];
  /** Content to show when user has permission */
  children: ReactNode;
  /** What to show when permission is denied. Defaults to nothing. */
  fallback?: ReactNode;
  /** If true, show a subtle lock message instead of hiding */
  showLock?: boolean;
}

export function PermissionGate({ permission, children, fallback, showLock }: PermissionGateProps) {
  const { can, canAny } = usePermission();
  const { language } = useLanguage();

  const allowed = Array.isArray(permission)
    ? canAny(permission)
    : can(permission);

  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (showLock) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 text-xs">
        <Lock size={12} />
        <span>{language === "ko" ? "권한이 없습니다" : "No permission"}</span>
      </div>
    );
  }

  return null;
}
