import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamContext";

export interface TimelineMilestone {
  id: string;
  orgId: string;
  projectId: string;
  meetingId?: string;
  milestone: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimelineContextType {
  milestones: TimelineMilestone[];
  isLoading: boolean;
  isSynced: boolean;
  addMilestone: (m: Partial<TimelineMilestone>) => void;
  updateMilestone: (id: string, updates: Partial<TimelineMilestone>) => void;
  removeMilestone: (id: string) => void;
  getMilestonesByProject: (projectId: string) => TimelineMilestone[];
  refreshMilestones: () => Promise<void>;
}

const defaultValue: TimelineContextType = {
  milestones: [],
  isLoading: true,
  isSynced: false,
  addMilestone: () => {},
  updateMilestone: () => {},
  removeMilestone: () => {},
  getMilestonesByProject: () => [],
  refreshMilestones: async () => {},
};

const TimelineContext = createContext<TimelineContextType>(defaultValue);

export function TimelineProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  const fetchMilestones = useCallback(async () => {
    try {
      const data = await api.getTimelines();
      if (data) {
        setMilestones(data as TimelineMilestone[]);
      }
      setIsSynced(true);
    } catch (err) {
      console.error("[TimelineContext] fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchMilestones();
  }, [fetchMilestones]);

  const syncToServer = useCallback(async (action: string, idOrData: any, extra?: any) => {
    try {
      switch (action) {
        case 'create': await api.createTimeline(idOrData); break;
        case 'update': await api.updateTimeline(idOrData, extra); break;
        case 'delete': await api.deleteTimeline(idOrData); break;
      }
    } catch (err) {
      console.error(`[TimelineContext] sync ${action} failed:`, err);
    }
  }, []);

  const addMilestone = useCallback((m: Partial<TimelineMilestone>) => {
    const newMilestone = {
      ...m,
      id: m.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as TimelineMilestone;
    setMilestones(prev => [...prev, newMilestone]);
    syncToServer('create', m);
  }, [syncToServer]);

  const updateMilestone = useCallback((id: string, updates: Partial<TimelineMilestone>) => {
    setMilestones(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
    ));
    syncToServer('update', id, updates);
  }, [syncToServer]);

  const removeMilestone = useCallback((id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
    syncToServer('delete', id);
  }, [syncToServer]);

  const getMilestonesByProject = useCallback((projectId: string) => {
    return milestones.filter(m => m.projectId === projectId);
  }, [milestones]);

  return (
    <TimelineContext.Provider value={{
      milestones,
      isLoading,
      isSynced,
      addMilestone,
      updateMilestone,
      removeMilestone,
      getMilestonesByProject,
      refreshMilestones: fetchMilestones,
    }}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  return useContext(TimelineContext);
}
