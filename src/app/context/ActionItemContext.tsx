import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamContext";

export interface ActionItemRecord {
  id: string;
  orgId: string;
  projectId?: string;
  meetingId?: string;
  task: string;
  assigneeId?: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed';
  linkedTaskId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActionItemContextType {
  actionItems: ActionItemRecord[];
  isLoading: boolean;
  isSynced: boolean;
  addActionItem: (item: Partial<ActionItemRecord>) => void;
  updateActionItem: (id: string, updates: Partial<ActionItemRecord>) => void;
  removeActionItem: (id: string) => void;
  getByProject: (projectId: string) => ActionItemRecord[];
  getByMeeting: (meetingId: string) => ActionItemRecord[];
  refreshActionItems: () => Promise<void>;
}

const defaultValue: ActionItemContextType = {
  actionItems: [],
  isLoading: true,
  isSynced: false,
  addActionItem: () => {},
  updateActionItem: () => {},
  removeActionItem: () => {},
  getByProject: () => [],
  getByMeeting: () => [],
  refreshActionItems: async () => {},
};

const ActionItemContext = createContext<ActionItemContextType>(defaultValue);

export function ActionItemProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [actionItems, setActionItems] = useState<ActionItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  const fetchActionItems = useCallback(async () => {
    try {
      const data = await api.getActionItems();
      if (data) {
        setActionItems(data as ActionItemRecord[]);
      }
      setIsSynced(true);
    } catch (err) {
      console.error("[ActionItemContext] fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchActionItems();
  }, [fetchActionItems]);

  const syncToServer = useCallback(async (action: string, idOrData: any, extra?: any) => {
    try {
      switch (action) {
        case 'create': await api.createActionItem(idOrData); break;
        case 'update': await api.updateActionItem(idOrData, extra); break;
        case 'delete': await api.deleteActionItem(idOrData); break;
      }
    } catch (err) {
      console.error(`[ActionItemContext] sync ${action} failed:`, err);
    }
  }, []);

  const addActionItem = useCallback((item: Partial<ActionItemRecord>) => {
    const newItem = {
      ...item,
      id: item.id || crypto.randomUUID(),
      status: item.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ActionItemRecord;
    setActionItems(prev => [...prev, newItem]);
    syncToServer('create', item);
  }, [syncToServer]);

  const updateActionItem = useCallback((id: string, updates: Partial<ActionItemRecord>) => {
    setActionItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    ));
    syncToServer('update', id, updates);
  }, [syncToServer]);

  const removeActionItem = useCallback((id: string) => {
    setActionItems(prev => prev.filter(item => item.id !== id));
    syncToServer('delete', id);
  }, [syncToServer]);

  const getByProject = useCallback((projectId: string) => {
    return actionItems.filter(item => item.projectId === projectId);
  }, [actionItems]);

  const getByMeeting = useCallback((meetingId: string) => {
    return actionItems.filter(item => item.meetingId === meetingId);
  }, [actionItems]);

  return (
    <ActionItemContext.Provider value={{
      actionItems,
      isLoading,
      isSynced,
      addActionItem,
      updateActionItem,
      removeActionItem,
      getByProject,
      getByMeeting,
      refreshActionItems: fetchActionItems,
    }}>
      {children}
    </ActionItemContext.Provider>
  );
}

export function useActionItems() {
  return useContext(ActionItemContext);
}
