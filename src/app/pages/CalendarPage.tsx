import { CalendarView } from "../components/dashboard/CalendarView";
import { useLanguage } from "../context/LanguageContext";

export function CalendarPage() {
  const { t } = useLanguage();
  return (
    <div className="h-full flex flex-col">
      <header className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("calendar")}</h1>
        <p className="text-gray-500 text-sm">{t("manage_schedule")}</p>
      </header>
      
      <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <CalendarView />
      </div>
    </div>
  );
}
