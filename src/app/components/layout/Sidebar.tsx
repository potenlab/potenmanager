import { useState, useCallback, useRef, ReactNode } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
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
  MessageCircle,
  Users,
  ChevronDown,
  ChevronRight,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Plus,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { getUserColor } from "../../../lib/mockData";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { usePermission } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { useInvite } from "../../context/InviteContext";
import { usePresence } from "../../context/PresenceContext";
import { useChat } from "../../context/ChatContext";

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
  { id: "org", labelKo: "관리", labelEn: "Management", itemIds: ["projects", "branding", "team"] },
  { id: "tools", labelKo: "도구", labelEn: "Tools", itemIds: ["chat", "meetings", "radar"] },
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
  const missing = defaults.filter(id => !stored.includes(id));
  return [...stored.filter(id => defaults.includes(id)), ...missing];
}

// ─── Components ────────────────────────────────────────────────

function DraggableNavItem({
  id, groupId, moveItem, children,
}: {
  id: string; groupId: string;
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

// ─── Icon Rail Item ────────────────────────────────────────────

function RailIcon({ to, icon, label, isActive, badge, onClick }: {
  to: string; icon: React.ReactNode; label: string; isActive: boolean; badge?: number; onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150",
        isActive ? "bg-gray-200/80 text-gray-900" : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
      )}
      title={label}
    >
      {icon}
      {badge != null && badge > 0 && (
        <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1">
          <span className="text-[8px] font-bold text-white">{badge > 9 ? "9+" : badge}</span>
        </div>
      )}
    </NavLink>
  );
}

// ─── Main Sidebar ──────────────────────────────────────────────

export function Sidebar() {
  const { language, setLanguage, t } = useLanguage();
  const { width, startResizing, isMobile, isOpen, setIsOpen, isCollapsed, toggleCollapse } = useSidebar();
  const { currentUser, members } = usePermission();
  const { signOut } = useAuth();
  const { org, allOrgs, activeOrgId, switchOrg } = useInvite();
  const { isOnline } = usePresence();
  const { totalUnread, startDM, openRoom } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const ko = language === "ko";
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [teamExpanded, setTeamExpanded] = useState(() => {
    try { return localStorage.getItem('poten_sidebar_team_expanded') !== 'false'; } catch { return true; }
  });
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // Custom project groups (persisted per org)
  const projectGroupsKey = `poten_project_groups_${activeOrgId || 'default'}`;
  const [projectGroups, setProjectGroups] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem(projectGroupsKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ id: 'default', name: ko ? '프로젝트' : 'Projects' }];
  });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const groupInputRef = useRef<HTMLInputElement>(null);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; menuId: string; groupId?: string } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, menuId: string, groupId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, menuId, groupId });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const saveProjectGroups = useCallback((groups: { id: string; name: string }[]) => {
    setProjectGroups(groups);
    localStorage.setItem(projectGroupsKey, JSON.stringify(groups));
  }, [projectGroupsKey]);

  const addProjectGroup = useCallback(() => {
    const newGroup = { id: `group-${Date.now()}`, name: ko ? '새 그룹' : 'New Group' };
    saveProjectGroups([...projectGroups, newGroup]);
    setEditingGroupId(newGroup.id);
    setEditingGroupName(newGroup.name);
  }, [projectGroups, saveProjectGroups, ko]);

  const renameProjectGroup = useCallback((groupId: string, name: string) => {
    if (!name.trim()) return;
    saveProjectGroups(projectGroups.map(g => g.id === groupId ? { ...g, name: name.trim() } : g));
    setEditingGroupId(null);
  }, [projectGroups, saveProjectGroups]);

  const removeProjectGroup = useCallback((groupId: string) => {
    if (projectGroups.length <= 1) return;
    saveProjectGroups(projectGroups.filter(g => g.id !== groupId));
  }, [projectGroups, saveProjectGroups]);

  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    DEFAULT_GROUPS.forEach((g) => { result[g.id] = getGroupItemOrder(g.id, g.itemIds); });
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

  const navItemMap: Record<string, { to: string; icon: ReactNode; label: string }> = {
    dashboard: { to: "/dashboard", icon: <LayoutDashboard size={16} />, label: t("dashboard") },
    tasks: { to: "/tasks", icon: <CheckSquare size={16} />, label: t("my_tasks") },
    calendar: { to: "/calendar", icon: <Calendar size={16} />, label: t("calendar") },
    library: { to: "/library", icon: <BookMarked size={16} />, label: ko ? "아카이빙" : "Archive" },
    projects: { to: "/projects", icon: <FolderKanban size={16} />, label: ko ? "프로젝트" : "Projects" },
    branding: { to: "/branding", icon: <Palette size={16} />, label: ko ? "브랜딩" : "Branding" },
    meetings: { to: "/meetings", icon: <Video size={16} />, label: ko ? "회의/미팅" : "Meetings" },
    radar: { to: "/radar", icon: <Radar size={16} />, label: ko ? "비즈 레이더" : "Biz Radar" },
    chat: { to: "/chat", icon: <MessageCircle size={16} />, label: ko ? "채팅" : "Chat" },
    team: { to: "/team", icon: <Users size={16} />, label: ko ? "팀" : "Team" },
  };

  const closeSidebar = () => { if (isMobile) setIsOpen(false); };

  const getContextMenuItems = useCallback((menuId: string, groupId?: string) => {
    const items: { label: string; action: () => void; danger?: boolean }[] = [];
    const navItem = navItemMap[menuId];
    if (navItem) {
      items.push({ label: ko ? '새 탭에서 열기' : 'Open in new tab', action: () => { window.open(window.location.origin + navItem.to, '_blank'); } });
      items.push({ label: ko ? '링크 복사' : 'Copy link', action: () => { navigator.clipboard.writeText(window.location.origin + navItem.to); } });
    }
    if (menuId === 'projects') {
      items.push({ label: ko ? '프로젝트 추가' : 'Add project', action: () => { navigate('/projects'); setTimeout(() => document.querySelector<HTMLButtonElement>('[data-add-card]')?.click(), 100); } });
      items.push({ label: ko ? '그룹 추가' : 'Add group', action: addProjectGroup });
    }
    if (menuId === 'project-group' && groupId) {
      const pg = projectGroups.find(g => g.id === groupId);
      items.push({ label: ko ? '이름 변경' : 'Rename', action: () => { setEditingGroupId(groupId); setEditingGroupName(pg?.name || ''); } });
      items.push({ label: ko ? '프로젝트 추가' : 'Add project', action: () => { navigate(`/projects?filter=${encodeURIComponent(groupId)}`); setTimeout(() => document.querySelector<HTMLButtonElement>('[data-add-card]')?.click(), 100); } });
      if (projectGroups.length > 1) {
        items.push({ label: ko ? '그룹 삭제' : 'Delete group', action: () => removeProjectGroup(groupId), danger: true });
      }
    }
    if (menuId === 'tasks') {
      items.push({ label: ko ? '업무 추가' : 'Add task', action: () => navigate('/tasks') });
    }
    if (menuId === 'calendar') {
      items.push({ label: ko ? '일정 추가' : 'Add event', action: () => navigate('/calendar') });
    }
    if (menuId === 'meetings') {
      items.push({ label: ko ? '회의 추가' : 'Add meeting', action: () => navigate('/meetings') });
    }
    if (menuId === 'branding') {
      items.push({ label: ko ? '에셋 추가' : 'Add asset', action: () => navigate('/branding') });
    }
    if (menuId === 'team-member' && groupId) {
      items.push({ label: ko ? '프로필 보기' : 'View profile', action: () => navigate(`/team/${groupId}`) });
      items.push({ label: ko ? '메시지 보내기' : 'Send message', action: () => { startDM(groupId); navigate('/chat'); } });
    }
    return items;
  }, [ko, navItemMap, navigate, addProjectGroup, projectGroups, removeProjectGroup, startDM]);

  const isNavActive = (to: string) => {
    const base = to.split("?")[0];
    return location.pathname === base || location.pathname.startsWith(base + "/");
  };

  const railItems = [
    "dashboard",
    ...DEFAULT_GROUPS.flatMap((g) => groupOrders[g.id] || g.itemIds),
  ];

  // ─── COLLAPSED: Icon Rail ─────────────────────────────────
  if (!isMobile && isCollapsed) {
    return (
      <aside className="h-screen fixed left-0 top-0 z-50 w-[48px] bg-[#F7F7F5] border-r border-[#E8E8E4] flex flex-col items-center select-none">
        {/* Logo + Expand (horizontal) */}
        <div className="pt-3 pb-1 flex items-center gap-1">
          <button onClick={() => navigate("/organization")} className="hover:opacity-80 transition-opacity shrink-0">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt="logo" className="w-5 h-5 rounded object-cover" />
            ) : (
              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white">
                <Zap size={10} fill="currentColor" />
              </div>
            )}
          </button>
          <button
            onClick={toggleCollapse}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors shrink-0"
            title={ko ? "펼치기" : "Expand"}
          >
            <PanelLeftOpen size={12} />
          </button>
        </div>

        {/* Nav Icons */}
        <nav className="flex-1 flex flex-col items-center gap-0.5 py-2 overflow-y-auto scrollbar-hide">
          {railItems.map((id) => {
            const item = navItemMap[id];
            if (!item) return null;
            return (
              <RailIcon
                key={id} to={item.to} icon={item.icon} label={item.label}
                isActive={isNavActive(item.to)}
                badge={id === "chat" ? totalUnread : undefined}
              />
            );
          })}
        </nav>

        {/* Bottom: Profile */}
        <div className="pb-3 pt-2 flex flex-col items-center border-t border-[#E8E8E4]">
          <button onClick={() => navigate(`/team/${currentUser.id}`)} className="mt-1.5 hover:opacity-80 transition-opacity" title={currentUser.name}>
            <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full object-cover border border-gray-200" />
          </button>
        </div>
      </aside>
    );
  }

  // ─── Mobile: no sidebar ────────────────────────────────────
  if (isMobile) return null;

  // ─── EXPANDED: Notion-style Sidebar ────────────────────────

  const renderNavItem = (id: string, groupId: string) => {
    const item = navItemMap[id];
    if (!item) return null;
    const badge = id === "chat" && totalUnread > 0 ? totalUnread : 0;

    // Projects with expandable submenu
    if (id === "projects") {
      return (
        <DraggableNavItem key={id} id={id} groupId={groupId} moveItem={moveItem}>
          <div>
            <div className="flex items-center group/nav">
              <NavLink
                to={item.to}
                onClick={closeSidebar}
                onContextMenu={(e) => handleContextMenu(e, 'projects')}
                className={({ isActive }) =>
                  cn(
                    "flex-1 flex items-center gap-2.5 px-2 py-1 rounded-md text-[15px] transition-all duration-100",
                    isActive && !location.search
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                  )
                }
              >
                <div className="shrink-0 text-gray-500">{item.icon}</div>
                <span>{item.label}</span>
              </NavLink>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectsExpanded(!projectsExpanded); }}
                className="p-0.5 mr-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors opacity-0 group-hover/nav:opacity-100"
              >
                {projectsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            </div>
            {projectsExpanded && (
              <div className="ml-7 mt-0.5 space-y-0.5">
                {projectGroups.map((pg) => (
                  <div key={pg.id} className="flex items-center group/pg">
                    {editingGroupId === pg.id ? (
                      <input
                        ref={groupInputRef}
                        autoFocus
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onBlur={() => renameProjectGroup(pg.id, editingGroupName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameProjectGroup(pg.id, editingGroupName);
                          if (e.key === 'Escape') setEditingGroupId(null);
                        }}
                        className="flex-1 px-2 py-0.5 text-[14px] bg-white border border-blue-300 rounded outline-none"
                      />
                    ) : (
                      <NavLink
                        to={`/projects?filter=${encodeURIComponent(pg.id)}`}
                        onClick={closeSidebar}
                        onContextMenu={(e) => handleContextMenu(e, 'project-group', pg.id)}
                        className={() =>
                          cn(
                            "flex-1 flex items-center gap-2 px-2 py-1 rounded-md text-[14px] transition-all",
                            location.pathname === "/projects" && location.search.includes(`filter=${pg.id}`)
                              ? "bg-gray-200/70 text-gray-900 font-semibold"
                              : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                          )
                        }
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          setEditingGroupId(pg.id);
                          setEditingGroupName(pg.name);
                        }}
                      >
                        <FolderKanban size={13} />
                        {pg.name}
                      </NavLink>
                    )}
                    {projectGroups.length > 1 && (
                      <button
                        onClick={() => removeProjectGroup(pg.id)}
                        className="p-0.5 rounded text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/pg:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addProjectGroup}
                  className="flex items-center gap-2 px-2 py-1 rounded-md text-[13px] text-gray-400 hover:text-gray-600 hover:bg-gray-200/40 transition-all"
                >
                  <Plus size={12} />
                  {ko ? "그룹 추가" : "Add group"}
                </button>
              </div>
            )}
          </div>
        </DraggableNavItem>
      );
    }

    return (
      <DraggableNavItem key={id} id={id} groupId={groupId} moveItem={moveItem}>
        <div className="relative">
          <NavLink
            to={item.to}
            onClick={closeSidebar}
            onContextMenu={(e) => handleContextMenu(e, id)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2 py-1 rounded-md text-[15px] transition-all duration-100 whitespace-nowrap",
                isActive
                  ? "bg-gray-200/70 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
              )
            }
          >
            <div className="shrink-0 text-gray-500">{item.icon}</div>
            <span>{item.label}</span>
            {badge > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
                <span className="text-[9px] font-bold text-white">{badge > 9 ? "9+" : badge}</span>
              </span>
            )}
          </NavLink>
        </div>
      </DraggableNavItem>
    );
  };

  return (
    <aside
      className="bg-[#F7F7F5] border-r border-[#E8E8E4] flex flex-col select-none h-screen fixed left-0 top-0 z-50"
      style={{ width }}
    >
      {/* Header: Notion-style two rows */}
      <div className="px-3 pt-2.5 pb-1 overflow-x-hidden shrink-0 space-y-1.5">
        {/* Row 1: App logo + sidebar controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
              <Zap size={11} fill="currentColor" />
            </div>
            <span className="text-[11px] font-medium text-gray-400 tracking-wide">POTEN</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleCollapse}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
              title={ko ? "접기" : "Collapse"}
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>
        {/* Row 2: Org logo + Org name */}
        <div className="flex items-center gap-2">
          <button onClick={() => { navigate("/organization"); closeSidebar(); }} className="shrink-0 hover:opacity-80 transition-opacity">
            {org?.logoUrl ? (
              <img src={org.logoUrl} alt="org" className="w-6 h-6 rounded-md object-cover" />
            ) : (
              <div className="w-6 h-6 bg-gray-200 rounded-md flex items-center justify-center text-gray-600 text-[11px] font-bold">
                {(org?.name || "P").charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            {org && allOrgs.length > 1 ? (
              <button onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)} className="flex items-center gap-1 text-[14px] font-semibold text-gray-800 hover:text-gray-900 transition-colors whitespace-nowrap">
                <span className="truncate max-w-[140px]">{org.name}</span>
                <ChevronsUpDown size={12} className="text-gray-400 shrink-0" />
              </button>
            ) : (
              <span className="text-[14px] font-semibold text-gray-800 whitespace-nowrap truncate">{org ? org.name : "Poten Manager"}</span>
            )}
          </div>
          <button
            onClick={() => navigate("/organization")}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors shrink-0"
            title={ko ? "편집" : "Edit"}
          >
            <SquarePen size={13} />
          </button>
        </div>
      </div>

      {/* Organization Switcher */}
      {orgSwitcherOpen && allOrgs.length > 1 && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setOrgSwitcherOpen(false)} />
          <div className="absolute left-3 right-3 top-[40px] bg-white border border-gray-200 rounded-lg shadow-lg z-[71] py-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {allOrgs.map((o) => (
              <button
                key={o.orgId}
                onClick={() => { if (o.orgId !== activeOrgId) switchOrg(o.orgId); setOrgSwitcherOpen(false); }}
                className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[15px] transition-colors", o.orgId === activeOrgId ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50")}
              >
                <span className="truncate flex-1 text-left">{o.orgName}</span>
                {o.orgId === activeOrgId && <Check size={13} className="text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Navigation (scrollable) */}
      <div className="px-2 pt-2 pb-4 overflow-y-auto overflow-x-hidden flex-1 scrollbar-hide">
        <nav className="space-y-0.5">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2 py-1 rounded-md text-[15px] transition-all duration-100",
                isActive
                  ? "bg-gray-200/70 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
              )
            }
          >
            <LayoutDashboard size={16} className="text-gray-500" />
            <span>{t("dashboard")}</span>
          </NavLink>

          {/* Grouped sections */}
          {DEFAULT_GROUPS.map((group) => {
            const itemOrder = groupOrders[group.id] || group.itemIds;
            return (
              <div key={group.id} className="pt-4">
                <div className="px-2 pb-1">
                  <span className="text-[13px] font-medium text-gray-400">{ko ? group.labelKo : group.labelEn}</span>
                </div>
                <div className="space-y-0.5">
                  {itemOrder.map((itemId) => renderNavItem(itemId, group.id))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Profile + Team + Settings */}
      <div className="px-2 pb-3 pt-0 overflow-hidden shrink-0">
        <div className="pt-2 border-t border-[#E8E8E4] space-y-0.5">
          {/* User Profile */}
          <div
            onClick={() => { navigate(`/team/${currentUser.id}`); closeSidebar(); }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-200/50 cursor-pointer transition-colors"
          >
            <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full object-cover border border-gray-200 shrink-0" />
            <span className="text-[15px] font-medium text-gray-700 truncate flex-1">{currentUser.name}</span>
            <Settings size={13} className="text-gray-400 shrink-0" />
          </div>

          {/* Team members */}
          {members.filter(m => m.id !== currentUser.id).length > 0 && (
            <div>
              <button
                onClick={() => {
                  const next = !teamExpanded;
                  setTeamExpanded(next);
                  try { localStorage.setItem('poten_sidebar_team_expanded', String(next)); } catch {}
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-200/40 transition-colors"
              >
                {teamExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <span>{ko ? "팀 멤버" : "Team"}</span>
                <span className="text-[12px] text-gray-300 ml-auto">{members.filter(m => m.id !== currentUser.id).length}</span>
              </button>
              {teamExpanded && (
                <div className="space-y-0.5 pl-1">
                  {members.filter(m => m.id !== currentUser.id).map((member) => (
                    <button
                      key={member.id}
                      onClick={async () => {
                        closeSidebar();
                        const roomId = await startDM(member.id);
                        openRoom(roomId);
                        navigate("/chat");
                      }}
                      onContextMenu={(e) => handleContextMenu(e, 'team-member', member.id)}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[14px] transition-all group/member text-gray-500 hover:bg-gray-200/40 hover:text-gray-700"
                    >
                      <div className="relative shrink-0">
                        <img src={member.avatar} alt={member.name} className="w-4 h-4 rounded-full object-cover border border-gray-200" />
                        <div className={cn("absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border border-[#F7F7F5] rounded-full", isOnline(member.id) ? "bg-green-500" : "bg-gray-300")} />
                      </div>
                      <span className="truncate">{member.name}</span>
                      {(() => {
                        const mColor = getUserColor(member.id);
                        return mColor ? <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto" style={{ backgroundColor: mColor }} /> : null;
                      })()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings row */}
          <div className="flex items-center gap-0.5 pt-1.5 border-t border-[#E8E8E4] mt-1.5">
            <div className="flex bg-gray-200/60 p-0.5 rounded shrink-0">
              <button onClick={() => setLanguage("ko")} className={cn("px-1.5 py-0.5 text-[9px] rounded transition-all", language === "ko" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}>
                한
              </button>
              <button onClick={() => setLanguage("en")} className={cn("px-1.5 py-0.5 text-[9px] rounded transition-all", language === "en" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500")}>
                EN
              </button>
            </div>
            <div className="flex-1" />
            <button onClick={() => { navigate("/trash"); closeSidebar(); }} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors" title={ko ? "휴지통" : "Trash"}>
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => { localStorage.removeItem("poten_onboarding_complete"); localStorage.setItem("poten_dev_mode", "true"); navigate("/onboarding"); }}
              className="p-1.5 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors" title={ko ? "온보딩 (개발용)" : "Onboarding (dev)"}
            >
              <FlaskConical size={13} />
            </button>
            <button
              onClick={async () => { localStorage.removeItem("poten_dev_mode"); await signOut(); navigate("/login", { replace: true }); }}
              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title={ko ? "로그아웃" : "Sign out"}
            >
              <LogOut size={13} />
            </button>
          </div>

          <p className="text-[9px] text-gray-300 text-center pt-0.5">v{APP_VERSION}</p>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500 transition-colors z-[60] opacity-0 hover:opacity-100"
        onMouseDown={startResizing}
      />

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[80]" onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[81] py-1 min-w-[180px] animate-in fade-in slide-in-from-top-1 duration-100"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {getContextMenuItems(contextMenu.menuId, contextMenu.groupId).map((item, i) => (
              <button
                key={i}
                onClick={() => { item.action(); closeContextMenu(); }}
                className={cn(
                  "w-full flex items-center px-3 py-1.5 text-[13px] text-left transition-colors",
                  item.danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
