import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  Target,
  CheckSquare,
  Users,
  Settings,
  Zap,
  Lightbulb,
  Video,
  Plus,
  Globe,
  ChevronDown,
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

export function Sidebar() {
  const { language, setLanguage, t } = useLanguage();
  const { width, startResizing, isMobile, isOpen, setIsOpen } = useSidebar();
  const { currentUser, members } = usePermission();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [teamExpanded, setTeamExpanded] = useState(true);

  const isCompact = !isMobile && width < 240;
  const isTeamActive = location.pathname.startsWith("/team");

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
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
            <Zap size={20} fill="currentColor" />
          </div>
          <div className={cn("transition-opacity duration-200", isCompact ? "opacity-0" : "opacity-100")}>
            <h1 className="font-bold text-lg text-gray-900 leading-tight whitespace-nowrap">Poten Manager</h1>
            <p className="text-xs text-gray-500 whitespace-nowrap">{t("ai_assistant")}</p>
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

        {/* Navigation */}
        <nav className="space-y-1">
          <NavItem to="/tasks" icon={<CheckSquare size={20} />} label={t("my_tasks")} compact={isCompact} onClick={closeSidebar} />
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label={t("dashboard")} compact={isCompact} onClick={closeSidebar} />
          <NavItem to="/goals" icon={<Target size={20} />} label={t("tab_goal")} compact={isCompact} onClick={closeSidebar} />
          <NavItem to="/strategy" icon={<Lightbulb size={20} />} label={t("goals_strategy")} compact={isCompact} onClick={closeSidebar} />
          <NavItem to="/calendar" icon={<Calendar size={20} />} label={t("calendar")} compact={isCompact} onClick={closeSidebar} />
          <NavItem to="/meetings" icon={<Video size={20} />} label={language === 'ko' ? '회의' : 'Meetings'} compact={isCompact} onClick={closeSidebar} />

          {/* Team with expandable sub-menu */}
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

  // Mobile: slide-out drawer with overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-[998] animate-in fade-in duration-200"
            onClick={closeSidebar}
          />
        )}
        {/* Drawer */}
        <div
          className={cn(
            "fixed left-0 top-0 h-full z-[999] transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
      </>
    );
  }

  // Desktop: fixed sidebar
  return sidebarContent;
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