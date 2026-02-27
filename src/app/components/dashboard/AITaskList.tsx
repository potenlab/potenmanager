import { useLanguage } from "../../context/LanguageContext";
import { CheckCircle2, Bot, Calendar, ArrowRight } from "lucide-react";

const tasks = [
  {
    id: 1,
    title: "Review Q1 Financial Report",
    reason: "Due tomorrow based on quarterly schedule",
    priority: "high",
    time: "2h"
  },
  {
    id: 2,
    title: "Update Team on 'Project Alpha' Progress",
    reason: "Team hasn't been updated in 3 days",
    priority: "medium",
    time: "30m"
  },
  {
    id: 3,
    title: "Schedule Meeting with New Client",
    reason: "Client responded to email 2 hours ago",
    priority: "high",
    time: "15m"
  },
  {
    id: 4,
    title: "Analyze Competitor's New Feature",
    reason: "Mentioned in recent industry news",
    priority: "low",
    time: "1h"
  }
];

export function AITaskList() {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="text-blue-600" size={18} />
          {t("ai_recommended_tasks" as any)}
        </h3>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
          {tasks.length} New
        </span>
      </div>

      <div className="p-0 flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-50">
          {tasks.map((task) => (
            <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors group">
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {task.title}
                </h4>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide font-medium ${
                  task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  {task.priority}
                </span>
              </div>
              
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                <Bot size={12} className="text-purple-500" />
                {task.reason}
              </p>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Today
                  </span>
                  <span>{task.time}</span>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                    {t("decline_task" as any)}
                  </button>
                  <button className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
                    {t("accept_task" as any)}
                    <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 rounded-b-xl text-center">
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 mx-auto">
          View all recommendations
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
