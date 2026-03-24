/**
 * NewSidebar — 개인/조직 모드 대응 사이드바
 *
 * 개인 모드: 내 업무, 캘린더, 자료실, 프로젝트, 도구
 * 조직 모드: + 채팅, 회의, 팀, 브랜딩, 비즈레이더
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  CheckSquare, Calendar, BookMarked, FolderKanban,
  MessageCircle, Video, Users, Palette, Radar, Crown,
  Wrench, ChevronDown, ChevronRight, Plus, Building2,
  User, Settings, Zap, LogOut, DollarSign, FileText, BarChart3,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import { useTeam } from "../../context/TeamContext";
import { api } from "../../../lib/api";
import { getEnabledTools } from "../../pages/ToolsPage";

interface NavItem {
  id: string;
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

// ─── Drag & Drop for sidebar menu reordering ──────────────────
const SIDEBAR_DND_TYPE = "SIDEBAR_NAV_ITEM";
const NAV_ORDER_KEY = "pm_sidebar_nav_order";

function loadNavOrder(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(NAV_ORDER_KEY) || '{}'); } catch { return {}; }
}
function saveNavOrder(orders: Record<string, string[]>) {
  localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(orders));
}
function getOrderedItems(groupId: string, items: NavItem[]): NavItem[] {
  const stored = loadNavOrder()[groupId];
  if (!stored) return items;
  const itemMap = new Map(items.map(i => [i.id, i]));
  const ordered = stored.filter(id => itemMap.has(id)).map(id => itemMap.get(id)!);
  const missing = items.filter(i => !stored.includes(i.id));
  return [...ordered, ...missing];
}

function DraggableNavItem({ id, groupId, moveItem, children }: {
  id: string; groupId: string;
  moveItem: (fromId: string, toId: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: `${SIDEBAR_DND_TYPE}_${groupId}`,
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const [, drop] = useDrop({
    accept: `${SIDEBAR_DND_TYPE}_${groupId}`,
    hover(dragItem: { id: string }) {
      if (dragItem.id !== id) moveItem(dragItem.id, id);
    },
  });
  drag(drop(ref));
  return (
    <div ref={ref} className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}>
      {children}
    </div>
  );
}

export function NewSidebar() {
  const { language } = useLanguage();
  const { mode, currentOrg, orgs, switchToPersonal, switchToOrg, isPersonal } = useWorkspace();
  const { signOut, user } = useAuth();
  const { isMobile, isCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const ko = language === "ko";

  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [teamExpanded, setTeamExpanded] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [sidebarMembers, setSidebarMembers] = useState<any[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>(() => getEnabledTools());

  const { members: teamMembers } = useTeam();

  // Load team members + attendance for sidebar
  useEffect(() => {
    if (isPersonal || !currentOrg) { setSidebarMembers([]); return; }
    // Fetch members directly for sidebar (in case TeamContext hasn't loaded yet)
    api.getTeamMembers().then(m => setSidebarMembers(m || [])).catch(() => {});
    const today = new Date().toISOString().split('T')[0];
    api.getAttendance(today).then(setTodayAttendance).catch(() => {});
    const interval = setInterval(() => {
      api.getAttendance(today).then(setTodayAttendance).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [isPersonal, currentOrg]);

  // Sync from TeamContext when it loads
  useEffect(() => {
    if (teamMembers.length > 0) setSidebarMembers(teamMembers);
  }, [teamMembers]);

  // Listen for attendance changes (immediate update)
  useEffect(() => {
    const handler = () => {
      const today = new Date().toISOString().split('T')[0];
      api.getAttendance(today).then(setTodayAttendance).catch(() => {});
    };
    window.addEventListener('attendance-changed', handler);
    return () => window.removeEventListener('attendance-changed', handler);
  }, []);

  // Listen for tools changes
  useEffect(() => {
    const handler = () => setEnabledTools(getEnabledTools());
    window.addEventListener('tools-changed', handler);
    return () => window.removeEventListener('tools-changed', handler);
  }, []);

  const members = sidebarMembers;

  if (isMobile) return null;

  // ── Path prefix: personal = "/" , org = "/:slug/" ──
  const slug = currentOrg?.slug;
  const p = (path: string) => isPersonal ? path : `/${slug}${path}`;

  // ── Menu structure ──
  const personalItemsDef: NavItem[] = [
    { id: "tasks", to: p("/tasks"), icon: <CheckSquare size={16} />, label: ko ? "내 업무" : "My Tasks" },
    { id: "calendar", to: p("/calendar"), icon: <Calendar size={16} />, label: ko ? "캘린더" : "Calendar" },
    { id: "library", to: p("/library"), icon: <BookMarked size={16} />, label: ko ? "자료실" : "Library" },
    { id: "projects", to: p("/projects"), icon: <FolderKanban size={16} />, label: ko ? "프로젝트" : "Projects" },
  ];

  const orgItemsDef: NavItem[] = [
    { id: "branding", to: p("/branding"), icon: <Palette size={16} />, label: ko ? "브랜딩" : "Branding" },
    { id: "meetings", to: p("/meetings"), icon: <Video size={16} />, label: ko ? "회의/미팅" : "Meetings" },
    { id: "chat", to: p("/chat"), icon: <MessageCircle size={16} />, label: ko ? "채팅" : "Chat" },
    { id: "team", to: p("/team"), icon: <Users size={16} />, label: ko ? "팀" : "Team" },
  ];

  const [personalItems, setPersonalItems] = useState(() => getOrderedItems("personal", personalItemsDef));
  const [orgItems, setOrgItems] = useState(() => getOrderedItems("org", orgItemsDef));

  // Re-sync when language/org changes
  useEffect(() => { setPersonalItems(getOrderedItems("personal", personalItemsDef)); }, [ko, isPersonal, currentOrg?.slug]);
  useEffect(() => { setOrgItems(getOrderedItems("org", orgItemsDef)); }, [ko, isPersonal, currentOrg?.slug]);

  const moveItem = useCallback((groupId: string, fromId: string, toId: string) => {
    const setter = groupId === "personal" ? setPersonalItems : setOrgItems;
    setter(prev => {
      const items = [...prev];
      const fromIdx = items.findIndex(i => i.id === fromId);
      const toIdx = items.findIndex(i => i.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      // Save order
      const orders = loadNavOrder();
      orders[groupId] = items.map(i => i.id);
      saveNavOrder(orders);
      return items;
    });
  }, []);

  const toolItems: NavItem[] = [
    // 나중에 하나씩 추가
    // { id: "card-news", to: "/tools/card-news", icon: <Zap size={16} />, label: ko ? "카드뉴스 생성기" : "Card News" },
  ];

  const isActive = (path: string) => {
    // Strip query params for comparison
    const clean = path.split("?")[0];
    return location.pathname === clean || location.pathname.startsWith(clean + "/");
  };

  // ── Render ──
  return (
    <aside className="fixed inset-y-0 left-0 z-[70] flex w-[260px] flex-col bg-[#FBFBFA] border-r border-gray-200">
      {/* Workspace Switcher */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
            {isPersonal ? <User size={12} /> : <Building2 size={12} />}
          </div>
          <span className="text-sm font-semibold text-gray-900 truncate flex-1 text-left">
            {isPersonal ? (ko ? "개인 워크스페이스" : "Personal") : currentOrg?.name}
          </span>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </button>

        {/* Workspace Switcher Dropdown */}
        {orgSwitcherOpen && (
          <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
            <button
              onClick={() => { switchToPersonal(); setOrgSwitcherOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                isPersonal && "bg-blue-50 text-blue-600 font-semibold"
              )}
            >
              <User size={14} />
              {ko ? "개인 워크스페이스" : "Personal Workspace"}
            </button>

            {orgs.length > 0 && <div className="border-t border-gray-100 my-1" />}

            {orgs.map(({ org }) => (
              <button
                key={org.id}
                onClick={() => { switchToOrg(org.id); setOrgSwitcherOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                  currentOrg?.id === org.id && "bg-blue-50 text-blue-600 font-semibold"
                )}
              >
                <Building2 size={14} />
                {org.name}
              </button>
            ))}

            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { setOrgSwitcherOpen(false); navigate("/org/new"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <Plus size={14} />
              {ko ? "조직 만들기" : "Create Organization"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-hide">
        {/* Personal Section (always visible) */}
        <div>
          <p className="px-2 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {ko ? "개인" : "Personal"}
          </p>
          <div className="space-y-0.5">
            {/* 내 업무 — with submenu */}
            <div>
              <button
                onClick={() => { setTasksExpanded(!tasksExpanded); navigate(p("/tasks")); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                  isActive("/tasks")
                    ? "bg-gray-200/70 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="shrink-0 text-gray-500"><CheckSquare size={16} /></div>
                <span className="flex-1 text-left">{ko ? "내 업무" : "My Tasks"}</span>
                {tasksExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
              </button>
              {tasksExpanded && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  <NavLink to={p("/tasks?filter=today")} className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("filter=today")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    {ko ? "오늘" : "Today"}
                  </NavLink>
                  <NavLink to={p("/tasks?filter=week")} className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("filter=week")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    {ko ? "이번 주" : "This Week"}
                  </NavLink>
                </div>
              )}
            </div>

            {/* 캘린더 — no submenu */}
            <NavLink
              to="/calendar"
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                isActive("/calendar")
                  ? "bg-gray-200/70 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <div className="shrink-0 text-gray-500"><Calendar size={16} /></div>
              <span>{ko ? "캘린더" : "Calendar"}</span>
            </NavLink>

            {/* 자료실 — with submenu */}
            <div>
              <button
                onClick={() => { setLibraryExpanded(!libraryExpanded); navigate(p("/library")); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                  isActive("/library")
                    ? "bg-gray-200/70 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="shrink-0 text-gray-500"><BookMarked size={16} /></div>
                <span className="flex-1 text-left">{ko ? "자료실" : "Library"}</span>
                {libraryExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
              </button>
              {libraryExpanded && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  <NavLink to={p("/library?tab=team")} className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("tab=team")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    <Users size={13} />
                    {ko ? "팀 자료실" : "Team Library"}
                  </NavLink>
                  <NavLink to={p("/library?tab=my")} className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("tab=my")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    <BookMarked size={13} />
                    {ko ? "내 자료실" : "My Library"}
                  </NavLink>
                </div>
              )}
            </div>

            {/* 프로젝트 — with submenu */}
            <div>
              <button
                onClick={() => { setProjectsExpanded(!projectsExpanded); navigate(p("/projects")); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                  isActive("/projects")
                    ? "bg-gray-200/70 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="shrink-0 text-gray-500"><FolderKanban size={16} /></div>
                <span className="flex-1 text-left">{ko ? "프로젝트" : "Projects"}</span>
                {projectsExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
              </button>
              {projectsExpanded && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  <NavLink to={p("/projects?type=internal")} className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("type=internal")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    <FolderKanban size={13} />
                    {ko ? "내부 프로젝트" : "Internal"}
                  </NavLink>
                  <NavLink to={p("/projects?type=external")} className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("type=external")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    <Building2 size={13} />
                    {ko ? "외부 프로젝트" : "External"}
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Org Section (only when org mode) */}
        {!isPersonal && currentOrg && (
          <div>
            <p className="px-2 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {currentOrg.name}
            </p>
            <div className="space-y-0.5">
              {/* 영업/세일즈 — with submenu */}
              <div>
                <button
                  onClick={() => { setSalesExpanded(!salesExpanded); navigate(p("/sales")); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                    isActive(p("/sales"))
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="shrink-0 text-gray-500"><DollarSign size={16} /></div>
                  <span className="flex-1 text-left">{ko ? "고객관리" : "Sales"}</span>
                  {salesExpanded ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                </button>
                {salesExpanded && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    <NavLink to={p("/sales/clients")} className={() => cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                      location.pathname.includes("/sales/clients")
                        ? "bg-gray-200/70 text-gray-900 font-semibold"
                        : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                    )}>
                      <Users size={13} />
                      {ko ? "클라이언트 관리" : "Clients"}
                    </NavLink>
                    <NavLink to={p("/sales/estimates")} className={() => cn(
                      "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                      location.pathname.includes("/sales/estimates")
                        ? "bg-gray-200/70 text-gray-900 font-semibold"
                        : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                    )}>
                      <FileText size={13} />
                      {ko ? "견적서/계약" : "Estimates"}
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Other org items (draggable) */}
              {orgItems.map((item) => (
                <DraggableNavItem key={item.id} id={item.id} groupId="org" moveItem={(fromId, toId) => moveItem("org", fromId, toId)}>
                  {item.id === 'team' ? (
                    <>
                      <button
                        onClick={() => { setTeamExpanded(!teamExpanded); navigate(item.to); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                          isActive(item.to)
                            ? "bg-gray-200/70 text-gray-900 font-semibold"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        <div className="shrink-0 text-gray-500">{item.icon}</div>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown size={14} className={cn("text-gray-400 transition-transform", !teamExpanded && "-rotate-90")} />
                      </button>
                      {teamExpanded && members.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {members.map(m => {
                            const att = todayAttendance.find((a: any) => a.userId === m.id);
                            const status = att?.currentStatus || (att?.checkOut ? 'off' : att?.checkIn ? 'working' : null);
                            return (
                              <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-md text-[13px] text-gray-500">
                                <div className={cn("w-2 h-2 rounded-full shrink-0",
                                  status === 'working' ? "bg-green-500" :
                                  status === 'break' ? "bg-amber-400" :
                                  status === 'off' ? "bg-gray-300" : "bg-gray-200"
                                )} />
                                <span className="truncate">{m.name || m.email?.split('@')[0]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : (
                    <NavLink
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                        isActive(item.to)
                          ? "bg-gray-200/70 text-gray-900 font-semibold"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <div className="shrink-0 text-gray-500">{item.icon}</div>
                      <span>{item.label}</span>
                    </NavLink>
                  )}
                </DraggableNavItem>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        <div>
          <NavLink
            to="/tools"
            className={cn(
              "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
              isActive("/tools")
                ? "bg-gray-200/70 text-gray-900 font-semibold"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <div className="shrink-0 text-gray-500"><Wrench size={16} /></div>
            <span>{ko ? "도구" : "Tools"}</span>
          </NavLink>
          {/* Dynamic tool items */}
          {enabledTools.includes('revenue') && (
            <NavLink to={p("/revenue")} className={cn(
              "flex items-center gap-2 ml-4 px-2 py-1 rounded-md text-[13px] transition-all",
              isActive("/revenue") ? "bg-gray-200/70 text-gray-900 font-semibold" : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
            )}>
              <BarChart3 size={13} />
              {ko ? "매출 관리" : "Revenue"}
            </NavLink>
          )}
        </div>

        {/* Upgrade to Org (personal mode only) */}
        {isPersonal && orgs.length === 0 && (
          <div className="px-2">
            <button
              onClick={() => navigate("/org/new")}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Zap size={14} />
              {ko ? "조직으로 확장하기" : "Upgrade to Organization"}
            </button>
          </div>
        )}
      </nav>

      {/* Bottom: Profile & Settings */}
      <div className="border-t border-gray-200 px-3 py-3 space-y-1">
        {/* User Profile */}
        {user && (
          <NavLink to="/mypage" className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg hover:bg-gray-100 transition-all cursor-pointer group">
            <img
              src={user.user_metadata?.avatar_url || user.user_metadata?.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || 'U'}`}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 group-hover:ring-2 group-hover:ring-blue-200"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            </div>
          </NavLink>
        )}
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all",
            isActive("/settings")
              ? "bg-gray-200/70 text-gray-900 font-semibold"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          <Settings size={16} />
          {ko ? "설정" : "Settings"}
        </NavLink>
        <button
          onClick={async () => { await signOut(); navigate("/login"); }}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
        >
          <LogOut size={16} />
          {ko ? "로그아웃" : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
