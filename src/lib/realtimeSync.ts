import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../app/context/AuthContext";

/**
 * Supabase Realtime broadcast hook for syncing data across clients.
 *
 * - channelName: unique channel (e.g. "kanban-projects-orgId")
 * - userId: current user's id (to ignore own broadcasts)
 * - handlers: map of event names → callbacks
 */
export function useRealtimeBroadcast(
  channelName: string | null,
  userId: string,
  handlers: Record<string, (payload: any) => void>,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!channelName || !userId) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Listen for all registered events
    for (const event of Object.keys(handlersRef.current)) {
      channel.on("broadcast", { event }, ({ payload }) => {
        // Ignore own broadcasts
        if (payload?._senderId === userId) return;
        handlersRef.current[event]?.(payload);
      });
    }

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, userId]);

  const broadcast = useCallback(
    (event: string, payload: any) => {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event,
        payload: { ...payload, _senderId: userId },
      });
    },
    [userId],
  );

  return broadcast;
}
