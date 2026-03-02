import { useState, useCallback, useRef, ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  Settings,
  Zap,
  Video,
  Radar,
  BookMarked,
  Globe,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Building2,
  X,
  LogOut,
  FlaskConical,
  Trash2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { usePermission } from "../../context/PermissionContext";
import { useAuth } from "../../context/AuthContext";
import { useInvite } from "../../context/InviteContext";

const APP_VERSION = __APP_VERSION__;

const NAV_ORDER_KEY = "poten_nav_order";
const SIDEBAR_NAV_TYPE = "SIDEBAR_NAV_ITEM";

interface NavItemData {
  id: string;
  to: string;
  icon: ReactNode;
  label: string;
}

function getDefaultNavIds() {
  return ["tasks", "dashboard", "organization", "calendar", "meetings", "radar", "library", "team"];
}

function loadNavOrder(): string[] {
  try {
    const stored = localStorage.getItem(NAV_ORDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const defaults = getDefaultNavIds();
      // 새로 추가된 메뉴가 있으면 끝에 추가
      const missing = defaults.filter(id => !parsed.includes(id));
      return [...parsed.filter(id => defaults.includes(id)), ...missing];
    }
  } catch { /* ignore */ }
  return getDefaultNavIds();
}

function saveNavOrder(order: string[]) {
  localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
}

export function Sidebar() {
  const { language, setLanguage, t } = useLanguage();
  const { width, startResizing, isMobile, isOpen, setIsOpen } = useSidebar();
  const { currentUser, members } = usePermission();
  const { signOut } = useAuth();
  const { org, allOrgs, activeOrgId, switchOrg } = useInvite();
  const location = useLocation();
  const navigate = useNavigate();
  const [teamExpanded, setTeamExpanded] = useState(true);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [navOrder, setNavOrder] = useState<string[]>(loadNavOrder);

  const isCompact = !isMobile && width < 240;
  const isTeamActive = location.pathname.startsWith("/team");

  const moveNavItem = useCallback((fromId: string, toId: string) => {
    setNavOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(fromId);
      const toIdx = next.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, fromId);
      saveNavOrder(next);
      return next;
    });
  }, []);

  const navItemDefs: NavItemData[] = [
    { id: "tasks", to: "/tasks", icon: <CheckSquare size={20} />, label: t("my_tasks") },
    { id: "dashboard", to: "/", icon: <LayoutDashboard size={20} />, label: t("dashboard") },
    { id: "organization", to: "/organization", icon: <Building2 size={20} />, label: t("tab_goal") },
    { id: "calendar", to: "/calendar", icon: <Calendar size={20} />, label: t("calendar") },
    { id: "meetings", to: "/meetings", icon: <Video size={20} />, label: language === 'ko' ? '회의' : 'Meetings' },
    { id: "radar", to: "/radar", icon: <Radar size={20} />, label: language === 'ko' ? '비즈 레이더' : 'Biz Radar' },
    { id: "library", to: "/library", icon: <BookMarked size={20} />, label: language === 'ko' ? '자료모음집' : 'Library' },
  ];

  const navItemMap = new Map(navItemDefs.map(item => [item.id, item]));
  const sortedNavIds = navOrder.filter(id => id === "team" || navItemMap.has(id));

  const closeSidebar = () => {
    if (isMobile) setIsOpen(false);
  };

  const sidebarContent = (
    <aside 
      className={cn(
        "bg-[#F8F9FA] border-r border-[#E7E7E7] flex flex-col select-none",
        isMobile
          ? "w-[280px] h-full"
          : "h-screen fixed left-0 top-0 z-50"
      )}
      style={isMobile ? undefined : { width }}
    >
      {/* Brand Logo */}
      <div className="p-6 md:p-8 pb-4 overflow-hidden">
        <div className="flex items-center gap-3 mb-6 md:mb-8 min-w-[200px]">
          {org?.logoUrl ? (
            <img src={org.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <Zap size={20} fill="currentColor" />
            </div>
          )}
          <div className={cn("transition-opacity duration-200", isCompact ? "opacity-0" : "opacity-100")}>
            <h1 className="font-bold text-lg text-gray-900 leading-tight whitespace-nowrap">Poten Manager</h1>
            {org && allOrgs.length > 1 ? (
              <button
                onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                <span className="truncate max-w-[140px]">{org.name}</span>
                <ChevronsUpDown size={10} className="shrink-0" />
              </button>
            ) : (
              <p className="text-xs text-gray-500 whitespace-nowrap">{org ? org.name : t("ai_assistant")}</p>
            )}
          </div>
          {isMobile && (
            <button
              onClick={closeSidebar}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
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
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                    o.orgId === activeOrgId
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
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
          {sortedNavIds.map((id) => {
            if (id === "team") {
              return (
                <DraggableNavWrapper key="team" id="team" moveItem={moveNavItem}>
                  <div>
                    <div className="flex items-center">
                      <NavLink
                        to="/team"
                        end
                        onClick={closeSidebar}
                        className={({ isActive }) => cn(
                          "flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden whitespace-nowrap",
                          isTeamActive
                            ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
                        )}
                        title={isCompact ? t("team") : undefined}
                      >
                        <div className="shrink-0"><Users size={20} /></div>
                        <span className={cn("transition-opacity duration-200 flex-1", isCompact ? "opacity-0 w-0" : "opacity-100")}>{t("team")}</span>
                      </NavLink>
                      {!isCompact && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTeamExpanded(!teamExpanded);
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-all mr-1 shrink-0",
                            isTeamActive
                              ? "text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          <ChevronDown
                            size={14}
                            className={cn(
                              "transition-transform duration-200",
                              !teamExpanded && "-rotate-90"
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {/* Team members sub-items */}
                    {!isCompact && teamExpanded && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-200 pl-3 animate-in slide-in-from-top-1 fade-in duration-200">
                        {members.map((member) => (
                          <NavLink
                            key={member.id}
                            to={`/team/${member.id}`}
                            onClick={closeSidebar}
                            className={({ isActive }) => cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 group/member",
                              isActive
                                ? "bg-blue-50/80 text-blue-600 font-medium"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            )}
                          >
                            <div className="relative shrink-0">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-6 h-6 rounded-full object-cover border border-gray-200 group-hover/member:border-blue-200 transition-colors"
                              />
                              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-[1.5px] border-white rounded-full" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="truncate text-[13px]">
                                  {member.name}
                                </span>
                                {member.id === currentUser.id && (
                                  <span className="text-[10px] text-blue-400 font-medium shrink-0">
                                    {language === "ko" ? "(나)" : "(me)"}
                                  </span>
                                )}
                              </div>
                              {member.jobTitle && (
                                <span className="text-[11px] text-gray-400 truncate block leading-tight">
                                  {member.jobTitle}
                                </span>
                              )}
                            </div>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                </DraggableNavWrapper>
              );
            }

            const item = navItemMap.get(id);
            if (!item) return null;
            return (
              <DraggableNavWrapper key={item.id} id={item.id} moveItem={moveNavItem}>
                <NavItem to={item.to} icon={item.icon} label={item.label} compact={isCompact} onClick={closeSidebar} />
              </DraggableNavWrapper>
            );
          })}
        </nav>
      </div>

      <div className="flex-1" />

      {/* Language Toggle & User Profile */}
      <div className="p-6 md:p-8 pt-0 overflow-hidden">
        <div className="pt-4 border-t border-gray-200 space-y-2">
           {!isCompact && (
             <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <Globe size={14} />
                <span>Language</span>
              </div>
              <div className="flex bg-gray-200 p-0.5 rounded-lg">
                <button 
                  onClick={() => setLanguage("ko")}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded-md transition-all",
                    language === "ko" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  한
                </button>
                <button 
                  onClick={() => setLanguage("en")}
                  className={cn(
                    "px-2 py-0.5 text-[10px] rounded-md transition-all",
                    language === "en" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  EN
                </button>
              </div>
             </div>
           )}

          <div
            onClick={() => { navigate("/mypage"); closeSidebar(); }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-gray-100 hover:shadow-sm overflow-hidden"
          >
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
            />
            {!isCompact && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
                </div>
                <Settings size={18} className="text-gray-400 shrink-0" />
              </>
            )}
          </div>

          {/* 로그아웃 버튼 */}
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                localStorage.removeItem('poten_dev_mode');
                await signOut();
                navigate('/login', { replace: true });
              }}
              className={cn(
                "flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors",
                isCompact && "justify-center"
              )}
            >
              <LogOut size={16} className="shrink-0" />
              {!isCompact && <span>{language === 'ko' ? '로그아웃' : 'Sign out'}</span>}
            </button>
            {!isCompact && (
              <button
                onClick={() => {
                  localStorage.removeItem('poten_onboarding_complete');
                  localStorage.setItem('poten_dev_mode', 'true');
                  navigate('/onboarding');
                }}
                className="p-2 rounded-xl text-gray-300 hover:text-[#0079FF] hover:bg-blue-50 transition-colors shrink-0"
                title={language === 'ko' ? '온보딩 미리보기 (개발용)' : 'Preview Onboarding (dev)'}
              >
                <FlaskConical size={14} />
              </button>
            )}
          </div>

          {/* 휴지통 */}
          <button
            onClick={() => { navigate("/trash"); closeSidebar(); }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors w-full",
              isCompact && "justify-center"
            )}
          >
            <Trash2 size={14} className="shrink-0" />
            {!isCompact && <span className="text-xs">{language === 'ko' ? '휴지통' : 'Trash'}</span>}
          </button>

          {/* Version */}
          {!isCompact && (
            <p className="text-[10px] text-gray-300 text-center pt-2">v{APP_VERSION}</p>
          )}
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

function DraggableNavWrapper({ id, moveItem, children }: { id: string; moveItem: (fromId: string, toId: string) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: SIDEBAR_NAV_TYPE,
    item: { id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: SIDEBAR_NAV_TYPE,
    hover(dragItem: { id: string }) {
      if (dragItem.id !== id) {
        moveItem(dragItem.id, id);
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

function NavItem({ to, icon, label, compact, onClick }: { to: string; icon: React.ReactNode; label: string; compact: boolean; onClick?: () => void }) {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden whitespace-nowrap",
        isActive 
          ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" 
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
      )}
      title={compact ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>
      <span className={cn("transition-opacity duration-200", compact ? "opacity-0 w-0" : "opacity-100")}>{label}</span>
    </NavLink>
  );
}