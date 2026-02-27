import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { GoalItem } from "../../lib/mockData";
import { api } from "../../lib/api";
import { notificationBus } from "../../lib/notificationEvents";

interface GoalContextType {
  /** All strategic goals (Year, Quarter, Month, Week) */
  goals: GoalItem[];
  /** Urgent goals (isUrgent === true) */
  urgentGoals: GoalItem[];
  /** All goals combined */
  allGoals: GoalItem[];
  /** Add a new goal */
  addGoal: (goal: GoalItem) => void;
  /** Update an existing goal */
  updateGoal: (goalId: string, updates: Partial<GoalItem>) => void;
  /** Remove a goal */
  removeGoal: (goalId: string) => void;
  /** Get a goal by ID */
  getGoal: (goalId: string) => GoalItem | undefined;
  /** Set goals directly (for backward compat) */
  setGoals: React.Dispatch<React.SetStateAction<GoalItem[]>>;
  /** Loading state */
  isLoading: boolean;
  /** Whether data is synced with server */
  isSynced: boolean;
}

const defaultValue: GoalContextType = {
  goals: [],
  urgentGoals: [],
  allGoals: [],
  addGoal: () => {},
  updateGoal: () => {},
  removeGoal: () => {},
  getGoal: () => undefined,
  setGoals: () => {},
  isLoading: true,
  isSynced: false,
};

const GoalContext = createContext<GoalContextType>(defaultValue);

export function GoalProvider({ children }: { children: ReactNode }) {
  const [allGoals, setAllGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  // Derived: split into regular and urgent
  const goals = allGoals.filter((g) => !g.isUrgent);
  const urgentGoals = allGoals.filter((g) => g.isUrgent);

  // ─── Server Sync: Fetch goals on mount ───────────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        // Wait briefly for TaskContext to potentially finish seeding
        await new Promise((r) => setTimeout(r, 500));

        const serverGoals = await api.getGoals();
        if (serverGoals && serverGoals.length > 0) {
          setAllGoals(serverGoals as GoalItem[]);
          console.log(`[GoalContext] Loaded ${serverGoals.length} goals from server.`);
        } else {
          console.log("[GoalContext] No goals on server. Starting empty.");
        }
        setIsSynced(true);
      } catch (err) {
        console.error("[GoalContext] Server sync failed, keeping empty state:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // ─── Background sync helper ──────────────────────────────────────
  const syncToServer = useCallback(async (
    action: 'create' | 'update' | 'delete',
    goalOrId: any,
    updates?: any
  ) => {
    try {
      switch (action) {
        case 'create':
          await api.createGoal(goalOrId);
          break;
        case 'update':
          await api.updateGoal(goalOrId, updates);
          break;
        case 'delete':
          await api.deleteGoal(goalOrId);
          break;
      }
    } catch (err) {
      console.error(`[GoalContext] Background sync failed (${action}):`, err);
    }
  }, []);

  const addGoal = useCallback((goal: GoalItem) => {
    setAllGoals((prev) => [...prev, goal]);
    notificationBus.emit({
      type: 'goal.created',
      data: { goalId: goal.id, title: goal.title, titleKo: goal.titleKo },
    });
    syncToServer('create', goal);
  }, [syncToServer]);

  const updateGoal = useCallback((goalId: string, updates: Partial<GoalItem>) => {
    setAllGoals((prev) => {
      const goal = prev.find(g => g.id === goalId);
      if (goal && typeof updates.progress === 'number' && updates.progress !== goal.progress) {
        // Emit progress notification
        if (updates.progress >= 100 || updates.status === 'completed') {
          notificationBus.emit({
            type: 'goal.completed',
            data: { goalId, title: goal.title, titleKo: goal.titleKo, progress: updates.progress },
          });
        } else {
          notificationBus.emit({
            type: 'goal.progress_updated',
            data: { goalId, title: goal.title, titleKo: goal.titleKo, progress: updates.progress },
          });
        }
      }
      return prev.map((g) => (g.id === goalId ? { ...g, ...updates } : g));
    });
    syncToServer('update', goalId, updates);
  }, [syncToServer]);

  const removeGoal = useCallback((goalId: string) => {
    setAllGoals((prev) => prev.filter((g) => g.id !== goalId));
    syncToServer('delete', goalId);
  }, [syncToServer]);

  const getGoal = useCallback(
    (goalId: string) => allGoals.find((g) => g.id === goalId),
    [allGoals]
  );

  // setGoals wraps setAllGoals for backward compat
  const setGoals: React.Dispatch<React.SetStateAction<GoalItem[]>> = setAllGoals;

  return (
    <GoalContext.Provider value={{
      goals,
      urgentGoals,
      allGoals,
      addGoal,
      updateGoal,
      removeGoal,
      getGoal,
      setGoals,
      isLoading,
      isSynced,
    }}>
      {children}
    </GoalContext.Provider>
  );
}

export function useGoalContext() {
  return useContext(GoalContext);
}