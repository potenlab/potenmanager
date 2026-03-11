import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";
import { Task } from "../../lib/mockData";
import { api } from "../../lib/api";
import { useTeam } from "./TeamContext";
import { notificationBus } from "../../lib/notificationEvents";

export interface TaskActivityLog {
  id: string;
  taskId: string;
  entityId?: string;
  actorId: string;
  actorName: string;
  action: 'created' | 'updated' | 'status_changed' | 'assignee_changed' | 'deleted';
  details: string;
  detailsKo: string;
  timestamp: Date;
}

interface TaskContextType {
  tasks: Task[];
  activityLogs: TaskActivityLog[];
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  getTask: (taskId: string) => Task | undefined;
  getTaskLogs: (taskId: string) => TaskActivityLog[];
  isLoading: boolean;
  isSynced: boolean;
}

const defaultValue: TaskContextType = {
  tasks: [],
  activityLogs: [],
  addTask: () => {},
  updateTask: () => {},
  removeTask: () => {},
  setTasks: () => {},
  getTask: () => undefined,
  getTaskLogs: () => [],
  isLoading: true,
  isSynced: false,
};

const TaskContext = createContext<TaskContextType>(defaultValue);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLogs, setActivityLogs] = useState<TaskActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  // ─── Server Sync: Fetch tasks on mount ───────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        // Wait for orgId to be available (InviteContext may not have loaded yet)
        const isDemo = localStorage.getItem('poten_demo_mode') === 'true';
        if (!isDemo) {
          for (let i = 0; i < 20; i++) {
            if (localStorage.getItem('poten_active_org_id')) break;
            await new Promise((r) => setTimeout(r, 150));
          }
        }

        // Check if server has been seeded
        const { seeded } = await api.checkSeeded();

        if (!seeded) {
          // First run: mark server as initialized (no mock data)
          console.log("[TaskContext] First run. Initializing empty server state.");
          await api.seed({ tasks: [], goals: [], members: [] });
        }

        // Fetch tasks from server
        const serverTasks = await api.getTasks();
        if (serverTasks && serverTasks.length > 0) {
          // Filter out demo tasks when not in demo mode
          const filtered = isDemo
            ? serverTasks
            : serverTasks.filter((t: any) => !t.id?.startsWith('t-demo-'));
          setTasks(filtered as Task[]);
          console.log(`[TaskContext] Loaded ${filtered.length} tasks from server${!isDemo && filtered.length < serverTasks.length ? ` (filtered ${serverTasks.length - filtered.length} demo tasks)` : ''}.`);
        }
        setIsSynced(true);
      } catch (err) {
        console.error("[TaskContext] Server sync failed, keeping empty state:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // ─── Auto-delay: mark overdue tasks as 'delayed' on load & daily ──
  useEffect(() => {
    if (!isSynced) return;
    const markDelayed = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setTasks((prev) =>
        prev.map((task) => {
          if (task.status === 'completed' || task.status === 'routine' || task.status === 'cancelled') return task;
          if (task.priority === 'delayed') return task;
          if (!task.dueDate) return task;
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            api.updateTask(task.id, { priority: 'delayed' }).catch(() => {});
            return { ...task, priority: 'delayed' as const };
          }
          return task;
        })
      );
    };
    markDelayed();
    // Re-check at midnight
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => { markDelayed(); }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, [isSynced]);

  // ─── Background sync helper with retry ─────────────────────────
  const syncToServer = useCallback(async (
    action: 'create' | 'update' | 'delete',
    taskOrId: any,
    updates?: any
  ) => {
    const attempt = async (retries: number): Promise<boolean> => {
      try {
        switch (action) {
          case 'create':
            await api.createTask(taskOrId);
            break;
          case 'update':
            await api.updateTask(taskOrId, updates);
            break;
          case 'delete':
            await api.deleteTask(taskOrId);
            break;
        }
        return true;
      } catch (err) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          return attempt(retries - 1);
        }
        console.error(`[TaskContext] Sync failed after retries (${action}):`, err);
        return false;
      }
    };

    const success = await attempt(2);
    if (!success) {
      try {
        const serverTasks = await api.getTasks();
        if (serverTasks) {
          setTasks(serverTasks as Task[]);
          console.warn("[TaskContext] Restored state from server after sync failure.");
        }
      } catch {
        console.error("[TaskContext] Failed to restore state from server.");
      }
    }
  }, []);

  // ─── Local activity log ──────────────────────────────────────────
  const addLog = useCallback((log: Omit<TaskActivityLog, 'id' | 'timestamp'>) => {
    const newLog: TaskActivityLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    // Also persist to server
    api.createLog({
      ...log,
      entityId: log.taskId,
      entityType: 'task',
    }).catch((err) => console.error("[TaskContext] Failed to persist log:", err));
  }, []);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [...prev, task]);
    addLog({
      taskId: task.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'created',
      details: `Created task: ${task.title}`,
      detailsKo: `태스크 생성: ${task.titleKo || task.title}`,
    });
    // Emit notification event
    notificationBus.emit({
      type: 'task.created',
      data: { taskId: task.id, title: task.title, titleKo: task.titleKo },
    });
    // Background sync
    syncToServer('create', task);
  }, [addLog, syncToServer, currentUser]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    // Read current task BEFORE updating state (for logging & notifications)
    let taskSnapshot: Task | undefined;
    setTasks((prev) => {
      taskSnapshot = prev.find(t => t.id === taskId);
      return prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
    });

    // Side effects OUTSIDE the state updater
    if (taskSnapshot) {
      if (updates.status && updates.status !== taskSnapshot.status) {
        addLog({
          taskId,
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'status_changed',
          details: `Changed status to ${updates.status}`,
          detailsKo: `상태를 ${updates.status === 'completed' ? '완료' : updates.status === 'in-progress' ? '진행 중' : '할 일'}로 변경`,
        });
        if (updates.status === 'completed') {
          notificationBus.emit({
            type: 'task.completed',
            data: { taskId, title: taskSnapshot.title, titleKo: taskSnapshot.titleKo },
          });
        }
      } else {
        addLog({
          taskId,
          actorId: currentUser.id,
          actorName: currentUser.name,
          action: 'updated',
          details: `Updated task properties`,
          detailsKo: `태스크 정보 수정`,
        });
      }
    }

    // Background sync
    syncToServer('update', taskId, updates);
  }, [addLog, syncToServer, currentUser]);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    // Background sync
    syncToServer('delete', taskId);
  }, [syncToServer]);

  const getTask = useCallback(
    (taskId: string) => tasks.find((t) => t.id === taskId),
    [tasks]
  );

  const getTaskLogs = useCallback(
    (taskId: string) => activityLogs.filter((log) => log.taskId === taskId),
    [activityLogs]
  );

  const value = useMemo<TaskContextType>(() => ({
    tasks, activityLogs, addTask, updateTask, removeTask, setTasks,
    getTask, getTaskLogs, isLoading, isSynced,
  }), [tasks, activityLogs, addTask, updateTask, removeTask, getTask, getTaskLogs, isLoading, isSynced]);

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  return useContext(TaskContext);
}
