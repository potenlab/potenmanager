import { useState, useCallback, useRef, ReactNode } from "react";
import { NavLink, useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Settings,
  Zap,
  Video,
  Radar,
  BookMarked,
  ChevronsUpDown,
  Check,
  X,
  LogOut,
  FlaskConical,
  Trash2,
  FolderKanban,
  Palette,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { getUserColor } from "../../../lib/mockData";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { usePermission } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { useInvite } from "../../context/InviteContext";

const APP_VERSION = __APP_VERSION__;

// ─── Group-based nav ordering ──────────────────────────────────
const SIDEBAR_NAV_TYPE = "SIDEBAR_NAV_ITEM";

interface NavGroup {
  id: string;
  labelKo: string;
  labelEn: string;
  itemIds: string[];
}

const DEFAULT_GROUPS: NavGroup[] = [
  { id: "work", labelKo: "업무", labelEn: "Work", itemIds: ["tasks", "calendar", "library"] },
  { id: "org", labelKo: "조직", labelEn: "Organization", itemIds: ["projects", "branding"] },
  { id: "tools", labelKo: "도구", labelEn: "Tools", itemIds: ["meetings", "radar"] },
];

const GROUP_ORDER_KEY = "poten_group_nav_order";

function loadGroupOrders(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(GROUP_ORDER_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

function saveGroupOrders(orders: Record<string, string[]>) {
  localStorage.setItem(GROUP_ORDER_KEY, JSON.stringify(orders));
}

function getGroupItemOrder(groupId: string, defaults: string[]): string[] {
  const stored = loadGroupOrders()[groupId];
  if (!stored) return defaults;
  // Merge: keep stored order, add missing defaults at end
  const missing = defaults.filter(id => !stored.includes(id));
  return [...stored.filter(id => defaults.includes(id)), ...missing];
}

// ─── Components ────────────────────────────────────────────────

function DraggableNavItem({
  id,
  groupId,
  moveItem,
  children,
}: {
  id: string;
  groupId: string;
  moveItem: (groupId: string, fromId: string, toId: string) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: `${SIDEBAR_NAV_TYPE}_${groupId}`,
    item: { id, groupId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: `${SIDEBAR_NAV_TYPE}_${groupId}`,
    hover(dragItem: { id: string; groupId: string }) {
      if (dragItem.id !== id && dragItem.groupId === groupId) {
        moveItem(groupId, dragItem.id, id);
      }
    },
  });

  drag(drop(ref));

  return (
    <div ref={ref} className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}>
      {children}
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  compact,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  compact: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden whitespace-nowrap",
          isActive
            ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
        )
      }
      title={compact ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>
      <span className={cn("transition-opacity duration-200", compact ? "opacity-0 w-0" : "opacity-100")}>
        {label}
      </span>
    </NavLink>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────

export function Sidebar() {
  const { language, setLanguage, t } = useLanguage();
  const { width, startResizing, isMobile, isOpen, setIsOpen } = useSidebar();
  const { currentUser, members } = usePermission();
  const { signOut } = useAuth();
  const { org, allOrgs, activeOrgId, switchOrg } = useInvite();
  const navigate = useNavigate();
  const ko = language === "ko";
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);

  // Per-group item ordering (stored in localStorage)
  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    DEFAULT_GROUPS.forEach((g) => {
      result[g.id] = getGroupItemOrder(g.id, g.itemIds);
    });
    return result;
  });

  const moveItem = useCallback((groupId: string, fromId: string, toId: string) => {
    setGroupOrders((prev) => {
      const items = [...(prev[groupId] || [])];
      const fromIdx = items.indexOf(fromId);
      const toIdx = items.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      items.splice(fromIdx, 1);
      items.splice(toIdx, 0, fromId);
      const next = { ...prev, [groupId]: items };
      saveGroupOrders(next);
      return next;
    });
  }, []);

  const isCompact = !isMobile && width < 240;

  // Nav item definitions
  const navItemMap: Record<string, { to: string; icon: ReactNode; label: string }> = {
    tasks: { to: "/tasks", icon: <CheckSquare size={18} />, label: t("my_tasks") },
    calendar: { to: "/calendar", icon: <Calendar size={18} />, label: t("calendar") },
    library: { to: "/library", icon: <BookMarked size={18} />, label: ko ? "아카이빙" : "Archive" },
    projects: { to: "/management", icon: <FolderKanban size={18} />, label: ko ? "프로젝트" : "Projects" },
    branding: { to: "/management?tab=branding", icon: <Palette size={18} />, label: ko ? "브랜딩" : "Branding" },
    meetings: { to: "/meetings", icon: <Video size={18} />, label: ko ? "회의/미팅" : "Meetings" },
    radar: { to: "/radar", icon: <Radar size={18} />, label: ko ? "비즈 레이더" : "Biz Radar" },
  };

  const closeSidebar = () => {
    if (isMobile) setIsOpen(false);
  };

  const renderNavItem = (id: string, groupId: string) => {
    const item = navItemMap[id];
    if (!item) return null;

    return (
      <DraggableNavItem key={id} id={id} groupId={groupId} moveItem={moveItem}>
        {(
          <NavItem to={item.to} icon={item.icon} label={item.label} compact={isCompact} onClick={closeSidebar} />
        )}
      </DraggableNavItem>
    );
  };

  const sidebarContent = (
    <aside
      className={cn("bg-[#F8F9FA] border-r border-[#E7E7E7] flex flex-col select-none", isMobile ? "w-[280px] h-full" : "h-screen fixed left-0 top-0 z-50")}
      style={isMobile ? undefined : { width }}
    >
      {/* Brand Logo + Nav (scrollable) */}
      <div className="p-6 md:p-8 pb-4 overflow-y-auto overflow-x-hidden flex-1 scrollbar-hide">
        <div className="flex items-center gap-3 mb-6 md:mb-8 min-w-[200px]">
          <button onClick={() => { navigate("/organization"); closeSidebar(); }} className="shrink-0 hover:opacity-80 transition-opacity" title={ko ? "조직 비전" : "Organization Vision"}>
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Zap size={20} fill="currentColor" />
              </div>
            )}
          </button>
          <div className={cn("transition-opacity duration-200", isCompact ? "opacity-0" : "opacity-100")}>
            <h1 className="font-bold text-lg text-gray-900 leading-tight whitespace-nowrap">Poten Manager</h1>
            {org && allOrgs.length > 1 ? (
              <button onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors whitespace-nowrap">
                <span className="truncate max-w-[140px]">{org.name}</span>
                <ChevronsUpDown size={10} className="shrink-0" />
              </button>
            ) : (
              <p className="text-xs text-gray-500 whitespace-nowrap">{org ? org.name : t("ai_assistant")}</p>
            )}
          </div>
          {isMobile && (
            <button onClick={closeSidebar} className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Organization Switcher Dropdown */}
        {orgSwitcherOpen && allOrgs.length > 1 && (
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOrgSwitcherOpen(false)} />
            <div className="absolute left-6 right-6 top-[70px] bg-white border border-gray-200 rounded-xl shadow-lg z-[71] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {allOrgs.map((o) => (
                <button
                  key={o.orgId}
                  onClick={() => {
                    if (o.orgId !== activeOrgId) switchOrg(o.orgId);
                    setOrgSwitcherOpen(false);
                  }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors", o.orgId === activeOrgId ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50")}
                >
                  <span className="truncate flex-1 text-left">{o.orgName}</span>
                  {o.orgId === activeOrgId && <Check size={14} className="text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {/* Dashboard — standalone at top */}
          <NavItem to="/dashboard" icon={<LayoutDashboard size={18} />} label={t("dashboard")} compact={isCompact} onClick={closeSidebar} />

          {/* Grouped sections */}
          {DEFAULT_GROUPS.map((group) => {
            const itemOrder = groupOrders[group.id] || group.itemIds;
            return (
              <div key={group.id}>
                {/* Group divider label */}
                {!isCompact ? (
                  <div className="flex items-center gap-2 px-4 pt-5 pb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ko ? group.labelKo : group.labelEn}</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>
                ) : (
                  <div className="mx-3 my-2 border-t border-gray-200" />
                )}

                {/* Group items */}
                <div className="space-y-0.5">
                  {itemOrder.map((itemId) => renderNavItem(itemId, group.id))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Profile + Team + Settings */}
      <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0 overflow-hidden shrink-0">
        <div className="pt-3 border-t border-gray-200 space-y-1">
          {/* User Profile */}
          <div
            onClick={() => { navigate("/mypage"); closeSidebar(); }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-gray-100 hover:shadow-sm overflow-hidden"
          >
            <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0" />
            {!isCompact && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{currentUser.role}</p>
                </div>
                <Settings size={16} className="text-gray-400 shrink-0" />
              </>
            )}
          </div>

          {/* Team members (always visible) */}
          {!isCompact && (
            <div className="space-y-0.5 pl-2">
              {members.filter(m => m.id !== currentUser.id).map((member) => (
                <NavLink
                  key={member.id}
                  to={`/team/${member.id}`}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 group/member",
                      isActive ? "bg-blue-50/80 text-blue-600 font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    )
                  }
                >
                  <div className="relative shrink-0">
                    <img src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full object-cover border border-gray-200 group-hover/member:border-blue-200 transition-colors" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 border border-white rounded-full" />
                  </div>
                  <span className="truncate text-[12px]">{member.name}</span>
                  {(() => {
                    const mColor = getUserColor(member.id);
                    return mColor ? <span className="w-2 h-2 rounded-full shrink-0 ml-auto" style={{ backgroundColor: mColor }} /> : null;
                  })()}
                </NavLink>
              ))}
            </div>
          )}

          {/* Settings row: language, trash, logout */}
          <div className="flex items-center gap-1 pt-2 border-t border-gray-100 mt-2">
            {!isCompact && (
              <div className="flex bg-gray-200 p-0.5 rounded-lg shrink-0">
                <button
                  onClick={() => setLanguage("ko")}
                  className={cn("px-2 py-0.5 text-[10px] rounded-md transition-all", language === "ko" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                >
                  한
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={cn("px-2 py-0.5 text-[10px] rounded-md transition-all", language === "en" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                >
                  EN
                </button>
              </div>
            )}
            <div className="flex-1" />
            <button
              onClick={() => { navigate("/trash"); closeSidebar(); }}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title={ko ? "휴지통" : "Trash"}
            >
              <Trash2 size={14} />
            </button>
            {!isCompact && (
              <button
                onClick={() => {
                  localStorage.removeItem("poten_onboarding_complete");
                  localStorage.setItem("poten_dev_mode", "true");
                  navigate("/onboarding");
                }}
                className="p-2 rounded-lg text-gray-300 hover:text-[#0079FF] hover:bg-blue-50 transition-colors"
                title={ko ? "온보딩 미리보기 (개발용)" : "Preview Onboarding (dev)"}
              >
                <FlaskConical size={14} />
              </button>
            )}
            <button
              onClick={async () => {
                localStorage.removeItem("poten_dev_mode");
                await signOut();
                navigate("/login", { replace: true });
              }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title={ko ? "로그아웃" : "Sign out"}
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Version */}
          {!isCompact && <p className="text-[10px] text-gray-300 text-center pt-1">v{APP_VERSION}</p>}
        </div>
      </div>

      {/* Resize Handle (desktop only) */}
      {!isMobile && (
        <div
          className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-[60] opacity-0 hover:opacity-100 active:opacity-100"
          onMouseDown={startResizing}
        />
      )}
    </aside>
  );

  // Mobile: bottom nav handles navigation, no sidebar needed
  if (isMobile) return null;

  // Desktop: fixed sidebar
  return sidebarContent;
}
