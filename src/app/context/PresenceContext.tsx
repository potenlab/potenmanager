import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./AuthContext";
import { useTeam } from "./TeamContext";

interface PageViewer {
  userId: string;
  name: string;
  avatar?: string;
}

interface PresenceContextType {
  onlineUserIds: string[];
  isOnline: (userId: string) => boolean;
  /** Set which page the current user is viewing */
  setCurrentPage: (pageId: string | null) => void;
  /** Get list of users viewing a specific page */
  getPageViewers: (pageId: string) => PageViewer[];
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: [],
  isOnline: () => false,
  setCurrentPage: () => {},
  getPageViewers: () => [],
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [pageViewerMap, setPageViewerMap] = useState<Record<string, PageViewer[]>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentPageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser.id) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: currentUser.id } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOnlineUserIds(ids);

        // Build page viewer map from presence state
        const newMap: Record<string, PageViewer[]> = {};
        for (const [userId, presences] of Object.entries(state)) {
          const p = (presences as any[])?.[0];
          if (p?.pageId) {
            if (!newMap[p.pageId]) newMap[p.pageId] = [];
            // Don't include current user in the viewers list
            if (userId !== currentUser.id) {
              newMap[p.pageId].push({
                userId,
                name: p.name || userId,
                avatar: p.avatar,
              });
            }
          }
        }
        setPageViewerMap(newMap);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
            pageId: currentPageRef.current,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [currentUser.id]);

  const setCurrentPage = useCallback(
    (pageId: string | null) => {
      currentPageRef.current = pageId;
      if (channelRef.current) {
        channelRef.current.track({
          userId: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          pageId,
          onlineAt: new Date().toISOString(),
        });
      }
    },
    [currentUser.id, currentUser.name, currentUser.avatar]
  );

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.includes(userId),
    [onlineUserIds]
  );

  const getPageViewers = useCallback(
    (pageId: string) => pageViewerMap[pageId] || [],
    [pageViewerMap]
  );

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isOnline, setCurrentPage, getPageViewers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}

/** Hook for detail pages: tracks page view and returns viewers */
export function usePagePresence(pageId: string | undefined) {
  const { setCurrentPage, getPageViewers } = usePresence();

  useEffect(() => {
    if (pageId) {
      setCurrentPage(pageId);
    }
    return () => {
      setCurrentPage(null);
    };
  }, [pageId, setCurrentPage]);

  return pageId ? getPageViewers(pageId) : [];
}
