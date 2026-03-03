import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";
import { api } from "../../lib/api";

export type BizStage = 'discovered' | 'reviewing' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type BizType = 'project' | 'funding' | 'partnership' | 'investment' | 'other';
export type BizCategory = 'sales' | 'connection';

// Connection-specific type options
export type ConnectionType = 'agent' | 'distributor' | 'supplier' | 'partner' | 'client' | 'other';

export interface BizActionItem {
  id: string;
  title: string;
  assigneeId?: string;
  done: boolean;
  linkedTaskId?: string;
  category?: import("../../lib/mockData").TaskCategory;
}

export interface BizRadarItem {
  id: string;
  title: string;
  description?: string;
  category: BizCategory;     // 'sales' or 'connection'
  type: BizType;
  connectionType?: ConnectionType;  // used when category === 'connection'
  stage: BizStage;
  value?: number;
  probability?: number;       // 0-100
  source?: string;
  contactName?: string;
  contactCompany?: string;
  deadline?: string;
  assigneeId?: string;
  tags?: string[];
  notes?: string;
  actionItems: BizActionItem[];
  createdAt: string;
  updatedAt: string;
}

interface BizRadarContextType {
  items: BizRadarItem[];
  addItem: (item: BizRadarItem) => void;
  updateItem: (id: string, updates: Partial<BizRadarItem>) => void;
  removeItem: (id: string) => void;
  getItem: (id: string) => BizRadarItem | undefined;
  isLoading: boolean;
  isSynced: boolean;
}

const defaultValue: BizRadarContextType = {
  items: [],
  addItem: () => {},
  updateItem: () => {},
  removeItem: () => {},
  getItem: () => undefined,
  isLoading: true,
  isSynced: false,
};

const BizRadarContext = createContext<BizRadarContextType>(defaultValue);

export function BizRadarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BizRadarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const serverItems = await api.getRadarItems();
        if (serverItems && serverItems.length > 0) {
          setItems(serverItems as BizRadarItem[]);
        }
        setIsSynced(true);
      } catch (err) {
        console.error("[BizRadarContext] Server sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const syncToServer = useCallback(async (
    action: 'create' | 'update' | 'delete',
    itemOrId: any,
    updates?: any
  ) => {
    const attempt = async (retries: number): Promise<boolean> => {
      try {
        switch (action) {
          case 'create':
            await api.createRadarItem(itemOrId);
            break;
          case 'update':
            await api.updateRadarItem(itemOrId, updates);
            break;
          case 'delete':
            await api.deleteRadarItem(itemOrId);
            break;
        }
        return true;
      } catch (err) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          return attempt(retries - 1);
        }
        console.error(`[BizRadarContext] Sync failed after retries (${action}):`, err);
        return false;
      }
    };

    const success = await attempt(2);
    if (!success) {
      try {
        const serverItems = await api.getRadarItems();
        if (serverItems) {
          setItems(serverItems as BizRadarItem[]);
          console.warn("[BizRadarContext] Restored state from server after sync failure.");
        }
      } catch {
        console.error("[BizRadarContext] Failed to restore state from server.");
      }
    }
  }, []);

  const addItem = useCallback((item: BizRadarItem) => {
    setItems((prev) => [...prev, item]);
    syncToServer('create', item);
  }, [syncToServer]);

  const updateItem = useCallback((id: string, updates: Partial<BizRadarItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)));
    syncToServer('update', id, updates);
  }, [syncToServer]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    syncToServer('delete', id);
  }, [syncToServer]);

  const getItem = useCallback((id: string) => {
    return items.find(i => i.id === id);
  }, [items]);

  const value = useMemo<BizRadarContextType>(() => ({
    items, addItem, updateItem, removeItem, getItem, isLoading, isSynced,
  }), [items, addItem, updateItem, removeItem, getItem, isLoading, isSynced]);

  return (
    <BizRadarContext.Provider value={value}>
      {children}
    </BizRadarContext.Provider>
  );
}

export function useBizRadar() {
  return useContext(BizRadarContext);
}
