import { useCallback } from "react";
import { CalendarView } from "../components/dashboard/CalendarView";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { Task, getAllAssigneeIds } from "../../lib/mockData";

export function CalendarPage() {
  const { t } = useLanguage();
  const { currentUser } = useTeam();
  const myTaskFilter = useCallback(
    (task: Task) => getAllAssigneeIds(task).includes(currentUser.id),
    [currentUser.id]
  );
  return (
    <div className="h-full flex flex-col">
      <header className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("calendar")}</h1>
        <p className="text-gray-500 text-sm">{t("manage_schedule")}</p>
      </header>

      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <CalendarView taskFilter={myTaskFilter} />
      </div>
    </div>
  );
}
