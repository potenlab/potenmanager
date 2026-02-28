import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface TrashedItem {
  id: string;
  type: 'task' | 'meeting';
  title: string;
  data: any;
  deletedAt: string;
}

interface TrashContextType {
  items: TrashedItem[];
  moveToTrash: (item: TrashedItem) => void;
  restoreFromTrash: (id: string) => TrashedItem | undefined;
  permanentlyDelete: (id: string) => void;
  emptyTrash: () => void;
}

const TrashContext = createContext<TrashContextType>({
  items: [],
  moveToTrash: () => {},
  restoreFromTrash: () => undefined,
  permanentlyDelete: () => {},
  emptyTrash: () => {},
});

const STORAGE_KEY = 'poten_trash';

function loadTrash(): TrashedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTrash(items: TrashedItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function TrashProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<TrashedItem[]>(loadTrash);

  const moveToTrash = useCallback((item: TrashedItem) => {
    setItems(prev => {
      const next = [item, ...prev];
      saveTrash(next);
      return next;
    });
  }, []);

  const restoreFromTrash = useCallback((id: string) => {
    let restored: TrashedItem | undefined;
    setItems(prev => {
      restored = prev.find(i => i.id === id);
      const next = prev.filter(i => i.id !== id);
      saveTrash(next);
      return next;
    });
    return restored;
  }, []);

  const permanentlyDelete = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveTrash(next);
      return next;
    });
  }, []);

  const emptyTrash = useCallback(() => {
    setItems([]);
    saveTrash([]);
  }, []);

  return (
    <TrashContext.Provider value={{ items, moveToTrash, restoreFromTrash, permanentlyDelete, emptyTrash }}>
      {children}
    </TrashContext.Provider>
  );
}

export function useTrash() {
  return useContext(TrashContext);
}
