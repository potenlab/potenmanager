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
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0 mt-1">
          <button
            onClick={() => setMyOnly(false)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              !myOnly
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Users size={13} />
            {ko ? "팀 전체" : "All Team"}
          </button>
          <button
            onClick={() => setMyOnly(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              myOnly
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <User size={13} />
            {ko ? "내 업무" : "My Tasks"}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <CalendarView taskFilter={myOnly ? myTaskFilter : undefined} />
      </div>
    </div>
  );
}
