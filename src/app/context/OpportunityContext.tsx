import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { api } from "../../lib/api";

export interface Opportunity {
  id: string;
  title: string;
  titleKo?: string;
  description: string;
  descriptionKo?: string;
  source: "Upwork" | "LinkedIn" | "Fiverr" | "Direct";
  budget: string;
  budgetKo?: string;
  matchScore: number; // 0-100
  tags: string[];
  postedAt: string;
  postedAtKo?: string;
}

interface OpportunityContextType {
  opportunities: Opportunity[];
  addOpportunity: (opp: Opportunity) => void;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void;
  removeOpportunity: (id: string) => void;
  isLoading: boolean;
  isSynced: boolean;
}

const defaultValue: OpportunityContextType = {
  opportunities: [],
  addOpportunity: () => {},
  updateOpportunity: () => {},
  removeOpportunity: () => {},
  isLoading: true,
  isSynced: false,
};

const OpportunityContext = createContext<OpportunityContextType>(defaultValue);

export function OpportunityProvider({ children }: { children: ReactNode }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);

  // Fetch from server on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const serverOpps = await api.getOpportunities();
        if (serverOpps && serverOpps.length > 0) {
          setOpportunities(serverOpps as Opportunity[]);
        }
        setIsSynced(true);
      } catch (err) {
        console.error("[OpportunityContext] Server sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const syncToServer = useCallback(async (
    action: 'create' | 'update' | 'delete',
    oppOrId: any,
    updates?: any
  ) => {
    try {
      switch (action) {
        case 'create':
          await api.createOpportunity(oppOrId);
          break;
        case 'update':
          await api.updateOpportunity(oppOrId, updates);
          break;
        case 'delete':
          await api.deleteOpportunity(oppOrId);
          break;
      }
    } catch (err) {
      console.error(`[OpportunityContext] Background sync failed (${action}):`, err);
    }
  }, []);

  const addOpportunity = useCallback((opp: Opportunity) => {
    setOpportunities((prev) => [...prev, opp]);
    syncToServer('create', opp);
  }, [syncToServer]);

  const updateOpportunity = useCallback((id: string, updates: Partial<Opportunity>) => {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    syncToServer('update', id, updates);
  }, [syncToServer]);

  const removeOpportunity = useCallback((id: string) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    syncToServer('delete', id);
  }, [syncToServer]);

  return (
    <OpportunityContext.Provider value={{
      opportunities,
      addOpportunity,
      updateOpportunity,
      removeOpportunity,
      isLoading,
      isSynced,
    }}>
      {children}
    </OpportunityContext.Provider>
  );
}

export function useOpportunityContext() {
  return useContext(OpportunityContext);
}
