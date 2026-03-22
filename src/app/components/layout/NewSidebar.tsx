/**
 * NewSidebar — 개인/조직 모드 대응 사이드바
 *
 * 개인 모드: 내 업무, 캘린더, 자료실, 프로젝트, 도구
 * 조직 모드: + 채팅, 회의, 팀, 브랜딩, 비즈레이더
 */

import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router";
import {
  CheckSquare, Calendar, BookMarked, FolderKanban,
  MessageCircle, Video, Users, Palette, Radar, Crown,
  Wrench, ChevronDown, ChevronRight, Plus, Building2,
  User, Settings, Zap, LogOut,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";

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

  if (isMobile) return null;

  // ── Menu structure ──
  const personalItems: NavItem[] = [
    { id: "tasks", to: "/tasks", icon: <CheckSquare size={16} />, label: ko ? "내 업무" : "My Tasks" },
    { id: "calendar", to: "/calendar", icon: <Calendar size={16} />, label: ko ? "캘린더" : "Calendar" },
    { id: "library", to: "/library", icon: <BookMarked size={16} />, label: ko ? "자료실" : "Library" },
    { id: "projects", to: "/projects", icon: <FolderKanban size={16} />, label: ko ? "프로젝트" : "Projects" },
  ];

  const orgItems: NavItem[] = [
    { id: "branding", to: "/branding", icon: <Palette size={16} />, label: ko ? "브랜딩" : "Branding" },
    { id: "meetings", to: "/meetings", icon: <Video size={16} />, label: ko ? "회의/미팅" : "Meetings" },
    { id: "chat", to: "/chat", icon: <MessageCircle size={16} />, label: ko ? "채팅" : "Chat" },
    { id: "radar", to: "/radar", icon: <Radar size={16} />, label: ko ? "비즈 레이더" : "Biz Radar" },
    { id: "team", to: "/team", icon: <Users size={16} />, label: ko ? "팀" : "Team" },
  ];

  const toolItems: NavItem[] = [
    // 나중에 하나씩 추가
    // { id: "card-news", to: "/tools/card-news", icon: <Zap size={16} />, label: ko ? "카드뉴스 생성기" : "Card News" },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

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
              <div className="flex items-center group/nav">
                <NavLink
                  to="/tasks"
                  className={cn(
                    "flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                    isActive("/tasks")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="shrink-0 text-gray-500"><CheckSquare size={16} /></div>
                  <span>{ko ? "내 업무" : "My Tasks"}</span>
                </NavLink>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTasksExpanded(!tasksExpanded); }}
                  className="p-1 mr-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors opacity-0 group-hover/nav:opacity-100"
                >
                  {tasksExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
              {tasksExpanded && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  <NavLink to="/tasks?filter=today" className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("filter=today")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    {ko ? "오늘" : "Today"}
                  </NavLink>
                  <NavLink to="/tasks?filter=week" className={() => cn(
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
              <div className="flex items-center group/nav">
                <NavLink
                  to="/library"
                  className={cn(
                    "flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                    isActive("/library")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="shrink-0 text-gray-500"><BookMarked size={16} /></div>
                  <span>{ko ? "자료실" : "Library"}</span>
                </NavLink>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLibraryExpanded(!libraryExpanded); }}
                  className="p-1 mr-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors opacity-0 group-hover/nav:opacity-100"
                >
                  {libraryExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
              {libraryExpanded && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  <NavLink to="/library?tab=team" className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("tab=team")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    <Users size={13} />
                    {ko ? "팀 자료실" : "Team Library"}
                  </NavLink>
                  <NavLink to="/library?tab=my" className={() => cn(
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
              <div className="flex items-center group/nav">
                <NavLink
                  to="/projects"
                  className={cn(
                    "flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all duration-100",
                    isActive("/projects")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="shrink-0 text-gray-500"><FolderKanban size={16} /></div>
                  <span>{ko ? "프로젝트" : "Projects"}</span>
                </NavLink>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectsExpanded(!projectsExpanded); }}
                  className="p-1 mr-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors opacity-0 group-hover/nav:opacity-100"
                >
                  {projectsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
              {projectsExpanded && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  <NavLink to="/projects?type=internal" className={() => cn(
                    "flex items-center gap-2 px-2 py-1 rounded-md text-[13px] transition-all",
                    location.search.includes("type=internal")
                      ? "bg-gray-200/70 text-gray-900 font-semibold"
                      : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
                  )}>
                    <FolderKanban size={13} />
                    {ko ? "내부 프로젝트" : "Internal"}
                  </NavLink>
                  <NavLink to="/projects?type=external" className={() => cn(
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
              {orgItems.map((item) => (
                <NavLink
                  key={item.id}
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
              ))}
            </div>
          </div>
        )}

        {/* Tools Section */}
        <div>
          <button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full flex items-center justify-between px-2 mb-1"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {ko ? "도구" : "Tools"}
            </p>
            {toolsExpanded ? <ChevronDown size={10} className="text-gray-400" /> : <ChevronRight size={10} className="text-gray-400" />}
          </button>
          {toolsExpanded && (
            <div className="space-y-0.5">
              {toolItems.length === 0 ? (
                <p className="px-2 py-2 text-xs text-gray-400 italic">
                  {ko ? "곧 추가됩니다..." : "Coming soon..."}
                </p>
              ) : (
                toolItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[14px] transition-all",
                      isActive(item.to)
                        ? "bg-gray-200/70 text-gray-900 font-semibold"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <div className="shrink-0 text-gray-500">{item.icon}</div>
                    <span>{item.label}</span>
                  </NavLink>
                ))
              )}
            </div>
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
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <img
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email || 'U'}`}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자'}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
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
