import { useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Target, CheckCircle2, Flame } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useTaskContext } from "../../context/TaskContext";
import { useGoalContext } from "../../context/GoalContext";
import { getProjectMetrics } from "../../../lib/dashboardMetrics";
import { RevenueChart } from "./RevenueChart";

export function RevenueOverview() {
  const { t, language } = useLanguage();
  const { tasks } = useTaskContext();
  const { allGoals } = useGoalContext();

  const metrics = useMemo(() => getProjectMetrics(tasks, allGoals), [tasks, allGoals]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 size={18} className="text-emerald-600" />
          {t("project_performance" as any)}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Completion Rate */}
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
          <div className="text-sm text-emerald-800 font-medium mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {t("completion_rate" as any)}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.completionRate}%
          </div>
          <div className="text-xs text-emerald-600 mt-2">
            {metrics.completedTasks}/{metrics.totalTasks} {t("tasks_label" as any)}
          </div>
        </div>

        {/* Completed This Month */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="text-sm text-blue-800 font-medium mb-1 flex items-center gap-1.5">
            <Flame size={14} />
            {t("completed_this_month" as any)}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.thisMonthCompleted}
          </div>
          {metrics.monthlyChange !== null ? (
            <div className={`flex items-center gap-1 text-xs mt-2 ${metrics.monthlyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.monthlyChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{metrics.monthlyChange >= 0 ? '+' : ''}{metrics.monthlyChange}% {t("vs_last_month")}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-2">
              {language === 'ko' ? '지난달 데이터 없음' : 'No last month data'}
            </div>
          )}
        </div>

        {/* Goal Progress */}
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
          <div className="text-sm text-purple-800 font-medium mb-1 flex items-center gap-1.5">
            <Target size={14} />
            {t("goal_progress" as any)}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.avgGoalProgress}%
          </div>
          <div className="text-xs text-purple-600 mt-2">
            {metrics.activeGoals} {language === 'ko' ? '개 활성 목표' : 'active goals'}
          </div>
        </div>
      </div>

      <RevenueChart />
    </div>
  );
}
