import { Outlet, useNavigate, useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { Bell, ChevronDown, Flag, Settings } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { useGoalContext } from "../../context/GoalContext";
import { Toaster } from "sonner";
import { useState, useRef, useEffect } from "react";
import { cn } from "../../../lib/utils";
import { OverdueTasksModal } from "./OverdueTasksModal";
import { TaskAssistant } from "./TaskAssistant";
import { useNotifications } from "../../context/NotificationContext";

export function Layout() {
  const { language } = useLanguage();
  const { width, isMobile } = useSidebar();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Scroll main to top on route change
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [location.pathname]);

  // *** Use GoalContext (server-synced) instead of static import ***
  const { goals } = useGoalContext();

  // Find annual goal — prefer matching startDate year, fallback to any Year-level core goal
  const annualGoal = goals.find(
    (g) => g.level === "Year" && g.startDate && new Date(g.startDate).getFullYear() === selectedYear
  ) || goals.find(
    (g) => g.level === "Year" && !g.parentId
  );
  const annualGoalTitle = annualGoal
    ? (language === "ko" ? annualGoal.titleKo || annualGoal.title : annualGoal.title)
    : (language === "ko" ? "\uBAA9\uD45C \uBBF8\uC124\uC815" : "No goal set");

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

  return (
    <div className="flex bg-[#F8F9FA] min-h-screen">
      <Toaster position="top-right" expand={false} richColors />
      <OverdueTasksModal />
      <Sidebar />
      <div 
        className={cn(
          "flex-1 w-full min-h-screen flex flex-col transition-[margin-left] duration-75 ease-linear"
        )}
        style={isMobile ? undefined : { marginLeft: width }}
      >
        <main ref={mainRef} className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-white shadow-xl md:rounded-l-[32px] border-l border-gray-100 min-h-screen min-w-0">
          {location.pathname === "/mypage" ? null : (
          <header className={cn(
            "flex flex-col md:flex-row justify-between md:items-center mb-6 md:mb-8 pb-4 border-b border-gray-100 gap-3 md:gap-4",
            // Hide header on detail pages (sub-routes) and notifications
            (location.pathname.split("/").filter(Boolean).length > 1 || location.pathname === "/notifications") && "hidden"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 shrink-0">
                <Flag size={isMobile ? 16 : 20} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base md:text-2xl font-bold text-gray-900 truncate">
                  {selectedYear}{language === "ko" ? "\uB144 \uBAA9\uD45C" : " Goal"}
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
                  {selectedYear}{language === "ko" ? "\uB144" : ""}
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
                        {year}{language === "ko" ? "\uB144" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/organization")}
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title={language === "ko" ? "조직 설정" : "Organization Settings"}
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => navigate("/notifications")}
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
          <div className="animate-fade-in pb-40">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
      <TaskAssistant />
    </div>
  );
}