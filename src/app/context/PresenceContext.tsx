import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./AuthContext";
import { useTeam } from "./TeamContext";

interface PresenceContextType {
  onlineUserIds: string[];
  isOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: [],
  isOnline: () => false,
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser.id) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUser.id,
            name: currentUser.name,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser.id]);

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.includes(userId),
    [onlineUserIds]
  );

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isOnline }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
