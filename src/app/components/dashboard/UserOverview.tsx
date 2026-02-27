import { useMemo } from "react";
import { Users, Activity, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from "../../context/LanguageContext";
import { useTaskContext } from "../../context/TaskContext";
import { useTeam } from "../../context/TeamContext";
import { getTeamMetrics } from "../../../lib/dashboardMetrics";

export function UserOverview() {
  const { t, language } = useLanguage();
  const { tasks } = useTaskContext();
  const { members } = useTeam();

  const metrics = useMemo(() => getTeamMetrics(tasks, members), [tasks, members]);

  const workloadData = metrics.workloadByMember.map((m, i) => ({
    name: m.name.length > 6 ? m.name.slice(0, 6) + '…' : m.name,
    fullName: m.name,
    assigned: m.assigned,
    completed: m.completed,
  }));

  const hasWorkloadData = workloadData.some(w => w.assigned > 0 || w.completed > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          {t("team_overview" as any)}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Team Members */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
          <div className="text-sm text-blue-800 font-medium mb-1 flex items-center gap-1.5">
            <Users size={14} />
            {t("team_members_count" as any)}
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.memberCount}</div>
          <div className="text-xs text-blue-600 mt-2">
            {language === 'ko' ? '명' : 'members'}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
          <div className="text-sm text-indigo-800 font-medium mb-1 flex items-center gap-1.5">
            <Activity size={14} />
            {t("active_tasks" as any)}
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.activeTasks}</div>
          <div className="text-xs text-indigo-600 mt-2">
            {language === 'ko' ? '진행 중' : 'in progress'}
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
          <div className="text-sm text-emerald-800 font-medium mb-1 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {t("completion_rate" as any)}
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</div>
          <div className="text-xs text-emerald-600 mt-2">
            {metrics.completedTasks}/{metrics.totalTasks} {t("tasks_label" as any)}
          </div>
        </div>
      </div>

      {/* Workload Distribution Chart */}
      <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          {t("workload_distribution" as any)}
        </h4>
        {hasWorkloadData ? (
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'assigned'
                      ? (language === 'ko' ? '배정' : 'Assigned')
                      : (language === 'ko' ? '완료' : 'Completed')
                  ]}
                />
                <Bar dataKey="assigned" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#0079FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <span className="text-gray-400 text-sm">{t("no_team_data_yet" as any)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
