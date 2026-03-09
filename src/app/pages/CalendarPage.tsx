import { useCallback, useState } from "react";
import { CalendarView } from "../components/dashboard/CalendarView";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { Task, getAllAssigneeIds } from "../../lib/mockData";
import { Users, User } from "lucide-react";
import { cn } from "../../lib/utils";

export function CalendarPage() {
  const { t, language } = useLanguage();
  const ko = language === "ko";
  const { currentUser } = useTeam();
  const [myOnly, setMyOnly] = useState(false);

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
        <button
          onClick={() => setMyOnly((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all shrink-0 mt-1",
            myOnly
              ? "bg-blue-50 text-blue-600 border-blue-200"
              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
          )}
        >
          {myOnly ? <User size={13} /> : <Users size={13} />}
          {myOnly ? (ko ? "내 업무만" : "My Tasks") : (ko ? "팀 전체" : "All Team")}
        </button>
      </header>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <CalendarView taskFilter={myOnly ? myTaskFilter : undefined} />
      </div>
    </div>
  );
}
