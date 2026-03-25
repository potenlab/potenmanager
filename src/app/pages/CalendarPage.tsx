import { useCallback, useState } from "react";
import { CalendarView, CalendarColorMode } from "../components/dashboard/CalendarView";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { Task, getAllAssigneeIds } from "../../lib/mockData";
import { Users, User } from "lucide-react";
import { cn } from "../../lib/utils";

export function CalendarPage() {
  const { t, language } = useLanguage();
  const ko = language === "ko";
  const { currentUser } = useTeam();
  const [myOnly, _setMyOnly] = useState(() => {
    try { return localStorage.getItem('poten_cal_myonly') === 'true'; } catch { return false; }
  });
  const setMyOnly = (v: boolean | ((prev: boolean) => boolean)) => {
    _setMyOnly((prev) => { const next = typeof v === 'function' ? v(prev) : v; localStorage.setItem('poten_cal_myonly', String(next)); return next; });
  };
  const [colorMode, setColorMode] = useState<CalendarColorMode>(() => {
    try { return (localStorage.getItem('poten_cal_color') as CalendarColorMode) || 'status'; } catch { return 'status'; }
  });
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());

  const handleCategoryToggle = useCallback((cat: string) => {
    if (cat === '__all__') {
      setCategoryFilter(new Set());
      return;
    }
    setCategoryFilter(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const myTaskFilter = useCallback(
    (task: Task) => getAllAssigneeIds(task).includes(currentUser.id),
    [currentUser.id]
  );

  return (
    <div className="h-full flex flex-col">
      <header className="mb-4 md:mb-6 shrink-0 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("calendar")}</h1>
          <p className="text-gray-500 text-sm">{t("manage_schedule")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMyOnly(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                !myOnly ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Users size={13} />
              {ko ? "팀 전체" : "All Team"}
            </button>
            <button
              onClick={() => setMyOnly(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                myOnly ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <User size={13} />
              {ko ? "내 업무" : "My Tasks"}
            </button>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => { setColorMode('status'); setCategoryFilter(new Set()); localStorage.setItem('poten_cal_color', 'status'); }}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                colorMode === 'status' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {ko ? "상태별" : "Status"}
            </button>
            <button
              onClick={() => { setColorMode('category'); localStorage.setItem('poten_cal_color', 'category'); }}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                colorMode === 'category' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {ko ? "업무별" : "Category"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <CalendarView
          taskFilter={myOnly ? myTaskFilter : undefined}
          colorMode={colorMode}
          categoryFilter={categoryFilter}
          onCategoryToggle={handleCategoryToggle}
        />
      </div>
    </div>
  );
}
