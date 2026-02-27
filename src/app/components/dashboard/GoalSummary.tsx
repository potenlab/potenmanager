import { useLanguage } from "../../context/LanguageContext";
import { Flag, Milestone, Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "../../../lib/utils";

const goals = [
  {
    type: "YEAR",
    title: "Achieve $10M ARR & Market Leadership",
    progress: 45,
    status: "ontrack",
    target: "$10M ARR",
    achieved: "$4.5M",
    daysLeft: 245,
  },
  {
    type: "QUARTER",
    title: "Q1: Launch Enterprise Beta & Secure 50 Customers",
    progress: 80,
    status: "ontrack",
    target: "50 Customers",
    achieved: "40",
    daysLeft: 25,
  },
  {
    type: "MONTH",
    title: "March: Finalize Core Features & Security Audit",
    progress: 65,
    status: "atrisk",
    target: "Security Audit",
    achieved: "In Progress",
    daysLeft: 5,
  },
];

export function GoalSummary() {
  const { t, language } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {goals.map((goal, index) => (
        <GoalCard key={index} goal={goal} />
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: any }) {
  const { t } = useLanguage();

  const getIcon = (type: string) => {
    switch (type) {
      case "YEAR": return <Flag className="text-purple-600" size={20} />;
      case "QUARTER": return <Milestone className="text-blue-600" size={20} />;
      case "MONTH": return <Target className="text-emerald-600" size={20} />;
      default: return <Target size={20} />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "YEAR": return t("goal_yearly" as any);
      case "QUARTER": return t("goal_quarterly" as any);
      case "MONTH": return t("goal_monthly" as any);
      default: return type;
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            goal.type === "YEAR" ? "bg-purple-50" : 
            goal.type === "QUARTER" ? "bg-blue-50" : "bg-emerald-50"
          )}>
            {getIcon(goal.type)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {getLabel(goal.type)}
            </h4>
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border mt-1 inline-block",
              goal.status === "ontrack" ? "bg-green-50 text-green-700 border-green-200" :
              goal.status === "atrisk" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-gray-50 text-gray-700 border-gray-200"
            )}>
              {goal.status === "ontrack" ? t("status_ontrack" as any) : t("status_atrisk" as any)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-gray-400">{goal.daysLeft} days left</span>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-4 line-clamp-2 h-[48px]">
        {goal.title}
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{t("progress" as any)}</span>
          <span className="font-medium text-gray-900">{goal.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              goal.progress >= 80 ? "bg-emerald-500" :
              goal.progress >= 50 ? "bg-blue-500" : "bg-amber-500"
            )}
            style={{ width: `${goal.progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-4">
          <div className="text-xs text-gray-500">
            <span className="block mb-0.5">{t("target" as any)}</span>
            <span className="font-medium text-gray-900">{goal.target}</span>
          </div>
          <div className="text-right text-xs text-gray-500">
            <span className="block mb-0.5">{t("achieved" as any)}</span>
            <span className="font-medium text-gray-900">{goal.achieved}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
