import { Outlet, useNavigate, useLocation } from "react-router";
import { NewSidebar } from "./NewSidebar";
import { Bell, ChevronDown, ChevronLeft, ChevronRight, Flag, Plus, Settings, X, Zap, PanelLeft } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { useOrgPath } from "../../hooks/useOrgPath";
import { useGoalContext } from "../../context/GoalContext";
import { Toaster } from "sonner";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../../lib/utils";
import { OverdueTasksModal } from "./OverdueTasksModal";
import { TaskAssistant } from "./TaskAssistant";
import { useNotifications } from "../../context/NotificationContext";

// ─── Tab system ─────────────────────────────────────────────
interface Tab {
  path: string;
  label: string;
}

const TAB_STORAGE_KEY = "poten_open_tabs";
const MAX_TABS = 12;

// Map route paths to labels
function getTabLabel(path: string, ko: boolean): string {
  const base = path.split("?")[0];
  const segments = base.split("/").filter(Boolean);

  const labelMap: Record<string, [string, string]> = {
    dashboard: ["대시보드", "Dashboard"],
    tasks: ["업무", "Tasks"],
    calendar: ["캘린더", "Calendar"],
    library: ["자료실", "Library"],
    projects: ["프로젝트", "Projects"],
    branding: ["브랜딩", "Branding"],
    meetings: ["회의/미팅", "Meetings"],
    radar: ["비즈 레이더", "Biz Radar"],
    chat: ["채팅", "Chat"],
    team: ["팀", "Team"],
    organization: ["조직", "Organization"],
    notifications: ["알림", "Notifications"],
    trash: ["휴지통", "Trash"],
    mypage: ["마이페이지", "My Page"],
    "leader-board": ["리더 게시판", "Leader Board"],
    pages: ["페이지", "Page"],
    board: ["게시판", "Board"],
  };

  // Skip the org slug prefix: if first segment isn't a known page, treat it as slug
  let first = segments[0];
  if (first && !labelMap[first] && segments.length > 1) {
    first = segments[1]; // org slug is segments[0], page is segments[1]
  }

  const labels = labelMap[first || "dashboard"];
  let label = labels ? (ko ? labels[0] : labels[1]) : first || "Home";

  // Sub-route: append detail hint
  if (path.includes("filter=external")) return ko ? "외부 프로젝트" : "External Projects";
  if (path.includes("filter=internal")) return ko ? "내부 프로젝트" : "Internal Projects";

  return label;
}

function loadTabs(): Tab[] {
  try {
    const s = localStorage.getItem(TAB_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveTabs(tabs: Tab[]) {
  localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs));
}

// ─── Layout ─────────────────────────────────────────────────

export function Layout() {
  const { language } = useLanguage();
  const { width, isMobile, isCollapsed } = useSidebar();
  const sidebarWidth = isMobile ? 0 : (isCollapsed ? 48 : width);
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const p = useOrgPath();
  const ko = language === "ko";
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const [showGoalBanner, setShowGoalBanner] = useState(() => {
    try { return localStorage.getItem('poten_hide_goal_banner') !== 'true'; } catch { return true; }
  });

  useEffect(() => {
    const handler = () => setShowGoalBanner(localStorage.getItem('poten_hide_goal_banner') !== 'true');
    window.addEventListener('poten_settings_changed', handler);
    return () => window.removeEventListener('poten_settings_changed', handler);
  }, []);
  const mainRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>(loadTabs);

  // Track current path as a tab
  const currentPath = location.pathname + location.search;

  // Add a new tab for the current page (triggered by + button only)
  const addTab = useCallback(() => {
    if (location.pathname.startsWith("/login") || location.pathname.startsWith("/onboarding")) return;
    setTabs((prev) => {
      // Already pinned? Don't duplicate
      if (prev.some((t) => t.path === currentPath)) return prev;
      const label = getTabLabel(currentPath, ko);
      const next = [...prev, { path: currentPath, label }];
      const trimmed = next.length > MAX_TABS ? next.slice(next.length - MAX_TABS) : next;
      saveTabs(trimmed);
      return trimmed;
    });
  }, [currentPath, ko, location.pathname]);

  const closeTab = useCallback((path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      saveTabs(next);
      // If closing current tab, navigate to last remaining or dashboard
      if (path === currentPath && next.length > 0) {
        const idx = prev.findIndex((t) => t.path === path);
        const target = next[Math.min(idx, next.length - 1)];
        navigate(target.path);
      } else if (path === currentPath && next.length === 0) {
        navigate(p("/dashboard"));
      }
      return next;
    });
  }, [currentPath, navigate]);

  // Scroll main to top on route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [location.pathname]);

  const { goals } = useGoalContext();

  const annualGoal = goals.find(
    (g) => g.level === "Year" && g.startDate && new Date(g.startDate).getFullYear() === selectedYear
  ) || goals.find(
    (g) => g.level === "Year" && !g.parentId
  );
  const annualGoalTitle = annualGoal
    ? (ko ? annualGoal.titleKo || annualGoal.title : annualGoal.title)
    : (ko ? "목표 미설정" : "No goal set");

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(e.target as Node)) {
        setShowYearPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Tab scroll
  const scrollTabs = (dir: "left" | "right") => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  const TOP_BAR_H = 38;

  return (
    <div className="flex flex-col bg-[#F8F9FA] min-h-screen">
      <Toaster position="top-right" expand={false} richColors />
      <OverdueTasksModal />

      {/* ── Global fixed top bar (spans full width, above sidebar + content) ── */}
      {!isMobile && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center bg-[#F8F9FA] border-b border-gray-200 min-h-[38px]">
          {/* App logo + sidebar toggle — fixed width matching default sidebar */}
          <div className="flex items-center gap-1 px-2 shrink-0 border-r border-gray-200" style={{ width: 260 }}>
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
              <Zap size={13} fill="currentColor" />
            </div>
            <button
              onClick={() => {
                const evt = new CustomEvent("poten_toggle_sidebar");
                window.dispatchEvent(evt);
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-colors"
              title={ko ? "사이드바" : "Sidebar"}
            >
              <PanelLeft size={16} />
            </button>
          </div>
          {/* Tabs */}
          {tabs.length > 0 && (
            <button
              onClick={() => scrollTabs("left")}
              className="px-1 py-2 text-gray-400 hover:text-gray-600 shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <div
            ref={tabsRef}
            className="flex-1 flex items-end overflow-x-auto scrollbar-hide gap-0"
          >
            {tabs.map((tab) => {
              const isActive = tab.path === currentPath;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  onMouseDown={(e) => {
                    if (e.button === 1) { e.preventDefault(); closeTab(tab.path); }
                  }}
                  className={cn(
                    "group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150 border-r border-gray-200 max-w-[180px]",
                    isActive
                      ? "bg-white text-gray-900 rounded-t-lg border-r-gray-200 shadow-sm -mb-px"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  )}
                >
                  <span className="truncate">{tab.label}</span>
                  <span
                    onClick={(e) => closeTab(tab.path, e)}
                    className={cn(
                      "shrink-0 p-0.5 rounded hover:bg-gray-300 transition-colors",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <X size={10} />
                  </span>
                </button>
              );
            })}
            <button
              onClick={addTab}
              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded shrink-0 transition-colors"
              title={ko ? "현재 페이지를 탭에 추가" : "Pin current page as tab"}
            >
              <Plus size={14} />
            </button>
          </div>
            {tabs.length > 0 && (
              <button
                onClick={() => scrollTabs("right")}
                className="px-1 py-2 text-gray-400 hover:text-gray-600 shrink-0"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

      {/* ── Below top bar: sidebar + content side by side ── */}
      <div className="flex flex-1" style={!isMobile ? { paddingTop: TOP_BAR_H } : undefined}>
        <NewSidebar />
        <div
          className={cn(
            "flex-1 w-full min-h-screen flex flex-col transition-[margin-left] duration-75 ease-linear"
          )}
          style={isMobile ? undefined : { marginLeft: 260 }}
        >
        <main ref={mainRef} className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-white shadow-xl md:rounded-l-[32px] border-l border-gray-100 min-h-screen min-w-0">
          {(() => {
            const basePath = location.pathname.split("/").filter(Boolean)[0] || "dashboard";
            const showGoalHeader = showGoalBanner && (basePath === "dashboard" || basePath === "organization") && location.pathname.split("/").filter(Boolean).length <= 1;
            if (!showGoalHeader) return null;
            return true;
          })() && (
          <header className="flex flex-col md:flex-row justify-between md:items-center mb-6 md:mb-8 pb-4 border-b border-gray-100 gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 shrink-0">
                <Flag size={isMobile ? 16 : 20} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-2xl font-bold text-gray-900 truncate">
                  {selectedYear}{ko ? "년 목표" : " Goal"}
                  <span className="hidden sm:inline">
                    {" : "}
                    <span className="text-gray-600">{annualGoalTitle}</span>
                  </span>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div ref={yearPickerRef} className="relative">
                <button
                  onClick={() => setShowYearPicker(!showYearPicker)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
                >
                  <Flag size={14} className="text-purple-500" />
                  {selectedYear}{ko ? "년" : ""}
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {showYearPicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[120px] animate-in fade-in slide-in-from-top-1 duration-150">
                    {yearOptions.map((year) => (
                      <button
                        key={year}
                        onClick={() => { setSelectedYear(year); setShowYearPicker(false); }}
                        className={cn(
                          "w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors font-medium",
                          year === selectedYear ? "bg-blue-50 text-blue-600" : "text-gray-700"
                        )}
                      >
                        {year}{ko ? "년" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(p("/organization"))}
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title={ko ? "조직 설정" : "Organization Settings"}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => navigate(p("/notifications"))}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
            </div>
          </header>
          )}
          <div className="animate-fade-in pb-20 md:pb-8">
            <Outlet />
          </div>
        </main>
        </div>
      </div>
      <BottomNav />
      <TaskAssistant />
    </div>
  );
}
