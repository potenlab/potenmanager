import { Task, GoalItem, User } from './mockData';

// ─── Project Performance Metrics ─────────────────────────────────────

export interface ProjectMetrics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number; // 0-100
  thisMonthCompleted: number;
  lastMonthCompleted: number;
  monthlyChange: number | null; // % change, null if no data last month
  avgGoalProgress: number; // 0-100
  activeGoals: number;
}

export function getProjectMetrics(tasks: Task[], goals: GoalItem[]): ProjectMetrics {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Tasks completed this month (by endDate or dueDate if completed)
  const thisMonthCompleted = completedTasks.filter(t => {
    const d = t.endDate ?? t.dueDate;
    return d && d >= thisMonthStart;
  }).length;

  const lastMonthCompleted = completedTasks.filter(t => {
    const d = t.endDate ?? t.dueDate;
    return d && d >= lastMonthStart && d <= lastMonthEnd;
  }).length;

  const monthlyChange = lastMonthCompleted > 0
    ? Math.round(((thisMonthCompleted - lastMonthCompleted) / lastMonthCompleted) * 100)
    : null;

  // Goal metrics
  const nonUrgentGoals = goals.filter(g => !g.isUrgent);
  const activeGoals = nonUrgentGoals.filter(g => g.status !== 'completed').length;
  const avgGoalProgress = nonUrgentGoals.length > 0
    ? Math.round(nonUrgentGoals.reduce((sum, g) => sum + g.progress, 0) / nonUrgentGoals.length)
    : 0;

  return {
    totalTasks,
    completedTasks: completedTasks.length,
    completionRate,
    thisMonthCompleted,
    lastMonthCompleted,
    monthlyChange,
    avgGoalProgress,
    activeGoals,
  };
}

// ─── Monthly Task Activity ───────────────────────────────────────────

export interface MonthlyActivity {
  name: string;
  nameKo: string;
  completed: number;
  created: number;
}

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function getMonthlyTaskActivity(tasks: Task[]): MonthlyActivity[] {
  const now = new Date();
  const year = now.getFullYear();

  const result: MonthlyActivity[] = MONTH_NAMES_EN.map((name, i) => ({
    name,
    nameKo: MONTH_NAMES_KO[i],
    completed: 0,
    created: 0,
  }));

  for (const t of tasks) {
    // Count completed by endDate or dueDate
    if (t.status === 'completed') {
      const d = t.endDate ?? t.dueDate;
      if (d && d.getFullYear() === year) {
        result[d.getMonth()].completed++;
      }
    }
    // Count created by startDate
    if (t.startDate && t.startDate.getFullYear() === year) {
      result[t.startDate.getMonth()].created++;
    }
  }

  return result;
}

// ─── Team Metrics ────────────────────────────────────────────────────

export interface MemberWorkload {
  id: string;
  name: string;
  assigned: number;
  completed: number;
}

export interface TeamMetrics {
  memberCount: number;
  activeTasks: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  workloadByMember: MemberWorkload[];
}

export function getTeamMetrics(tasks: Task[], members: User[]): TeamMetrics {
  const activeTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const workloadByMember: MemberWorkload[] = members.map(m => {
    const memberTasks = tasks.filter(t =>
      t.assigneeId === m.id || t.assigneeIds?.includes(m.id)
    );
    return {
      id: m.id,
      name: m.name,
      assigned: memberTasks.length,
      completed: memberTasks.filter(t => t.status === 'completed').length,
    };
  });

  return {
    memberCount: members.length,
    activeTasks,
    completedTasks,
    totalTasks,
    completionRate,
    workloadByMember,
  };
}
