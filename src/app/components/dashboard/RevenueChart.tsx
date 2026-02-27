import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from "../../context/LanguageContext";
import { useTaskContext } from "../../context/TaskContext";
import { getMonthlyTaskActivity } from "../../../lib/dashboardMetrics";
import { BarChart3 } from "lucide-react";

export function RevenueChart() {
  const { t, language } = useLanguage();
  const { tasks } = useTaskContext();

  const monthlyData = useMemo(() => getMonthlyTaskActivity(tasks), [tasks]);
  const currentMonth = new Date().getMonth();

  const chartData = monthlyData.map((m, i) => ({
    name: language === 'ko' ? m.nameKo : m.name,
    value: m.completed,
    isCurrent: i === currentMonth,
  }));

  const totalCompletedYTD = monthlyData.reduce((sum, m) => sum + m.completed, 0);
  const hasData = totalCompletedYTD > 0;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <BarChart3 size={14} className="text-blue-600" />
          {t("task_activity" as any)}
        </h4>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">{totalCompletedYTD}</p>
          <p className="text-[10px] text-gray-500">{t("tasks_completed_ytd" as any)}</p>
        </div>
      </div>

      {hasData ? (
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: '#F9FAFB' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                formatter={(value: number) => [value, language === 'ko' ? '완료' : 'Completed']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isCurrent ? '#0079FF' : '#E5E7EB'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center">
          <span className="text-gray-400 text-sm">{t("no_completed_tasks_yet" as any)}</span>
        </div>
      )}
    </div>
  );
}
