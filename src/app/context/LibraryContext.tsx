import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";
import { api } from "../../lib/api";
import { useTeam } from "./TeamContext";

export type LibraryItemType = 'url' | 'note';
export type LibraryVisibility = 'private' | 'published';

export interface OgMetadata {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  favicon?: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  type: LibraryItemType;
  url?: string;
  content?: string;
  description?: string;
  tags?: string[];
  category?: string;
  visibility: LibraryVisibility;
  ogMetadata?: OgMetadata;
  ownerId: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
}

interface LibraryContextType {
  items: LibraryItem[];
  myItems: LibraryItem[];
  teamItems: LibraryItem[];
  addItem: (item: LibraryItem) => void;
  updateItem: (id: string, updates: Partial<LibraryItem>) => void;
  removeItem: (id: string) => void;
  getItem: (id: string) => LibraryItem | undefined;
  publishItem: (id: string) => void;
  unpublishItem: (id: string) => void;
  fetchOgMetadata: (url: string) => Promise<OgMetadata | null>;
  isLoading: boolean;
  isSynced: boolean;
}

const defaultValue: LibraryContextType = {
  items: [],
  myItems: [],
  teamItems: [],
  addItem: () => {},
  updateItem: () => {},
  removeItem: () => {},
  getItem: () => undefined,
  publishItem: () => {},
  unpublishItem: () => {},
  fetchOgMetadata: async () => null,
  isLoading: true,
  isSynced: false,
};

const LibraryContext = createContext<LibraryContextType>(defaultValue);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const initRef = useRef(false);
  const { currentUser } = useTeam();

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      try {
        const serverItems = await api.getLibraryItems();
        if (serverItems && serverItems.length > 0) {
          setItems(serverItems as LibraryItem[]);
        }
        setIsSynced(true);
      } catch (err) {
        console.error("[LibraryContext] Server sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const myItems = useMemo(
    () => items.filter(i => i.ownerId === currentUser.id),
    [items, currentUser.id]
  );

  const teamItems = useMemo(
    () => items.filter(i => i.visibility === 'published'),
    [items]
  );

  const syncToServer = useCallback(async (
    action: 'create' | 'update' | 'delete',
    itemOrId: any,
    updates?: any
  ) => {
    try {
      switch (action) {
        case 'create':
          await api.createLibraryItem(itemOrId);
          break;
        case 'update':
          await api.updateLibraryItem(itemOrId, updates);
          break;
        case 'delete':
          await api.deleteLibraryItem(itemOrId);
          break;
      }
    } catch (err) {
      console.error(`[LibraryContext] Background sync failed (${action}):`, err);
    }
  }, []);

  const addItem = useCallback((item: LibraryItem) => {
    setItems(prev => [...prev, item]);
    syncToServer('create', item);
  }, [syncToServer]);

  const updateItem = useCallback((id: string, updates: Partial<LibraryItem>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)));
    syncToServer('update', id, updates);
  }, [syncToServer]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    syncToServer('delete', id);
  }, [syncToServer]);

  const getItem = useCallback((id: string) => {
    return items.find(i => i.id === id);
  }, [items]);

  const publishItem = useCallback((id: string) => {
    updateItem(id, { visibility: 'published' });
  }, [updateItem]);

  const unpublishItem = useCallback((id: string) => {
    updateItem(id, { visibility: 'private' });
  }, [updateItem]);

  const fetchOgMetadata = useCallback(async (url: string): Promise<OgMetadata | null> => {
    try {
      const data = await api.fetchOgMetadata(url);
      return data as OgMetadata;
    } catch {
      return null;
    }
  }, []);

  return (
    <LibraryContext.Provider value={{
      items,
      myItems,
      teamItems,
      addItem,
      updateItem,
      removeItem,
      getItem,
      publishItem,
      unpublishItem,
      fetchOgMetadata,
      isLoading,
      isSynced,
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
