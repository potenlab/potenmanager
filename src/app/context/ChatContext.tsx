import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "./AuthContext";
import { useTeam } from "./TeamContext";
import { api } from "../../lib/api";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface ChatRoom {
  id: string;
  participants: string[];
  createdAt: string;
  lastMessage: { text: string; senderId: string } | null;
  lastMessageAt: string | null;
  unreadCount?: number;
}

interface ChatContextType {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  messages: ChatMessage[];
  isLoadingRooms: boolean;
  isLoadingMessages: boolean;
  totalUnread: number;
  openRoom: (roomId: string) => void;
  closeRoom: () => void;
  startDM: (otherUserId: string) => Promise<string>;
  sendMessage: (text: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  rooms: [],
  currentRoomId: null,
  messages: [],
  isLoadingRooms: false,
  isLoadingMessages: false,
  totalUnread: 0,
  openRoom: () => {},
  closeRoom: () => {},
  startDM: async () => "",
  sendMessage: async () => {},
  refreshRooms: async () => {},
});

export function ChatProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useTeam();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load rooms
  const refreshRooms = useCallback(async () => {
    if (!currentUser.id) return;
    setIsLoadingRooms(true);
    try {
      const data = await api.getChatRooms(currentUser.id);
      // Calculate unread count per room
      const withUnread = data.map((room: any) => ({
        ...room,
        unreadCount: 0, // Will be calculated when messages load
      }));
      setRooms(withUnread);
    } catch (e) {
      console.error("Failed to load chat rooms:", e);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (currentUser.id) refreshRooms();
  }, [currentUser.id]);

  // Load messages when room changes
  useEffect(() => {
    if (!currentRoomId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setIsLoadingMessages(true);
    api.getChatMessages(currentRoomId, 100).then((data) => {
      if (!cancelled) {
        setMessages(data);
        setIsLoadingMessages(false);
        // Mark as read
        if (currentUser.id) {
          api.markChatRead(currentRoomId, currentUser.id).catch(() => {});
        }
      }
    }).catch(() => {
      if (!cancelled) setIsLoadingMessages(false);
    });
    return () => { cancelled = true; };
  }, [currentRoomId, currentUser.id]);

  // Realtime broadcast channel for instant messaging
  useEffect(() => {
    if (!currentUser.id) return;

    const channel = supabase.channel("chat-broadcast", {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "new-message" }, (payload) => {
        const msg = payload.payload as ChatMessage;
        // If we're in that room, add it to messages
        if (msg.roomId === currentRoomId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read since we're viewing
          api.markChatRead(msg.roomId, currentUser.id).catch(() => {});
        }
        // Update room's lastMessage
        setRooms((prev) =>
          prev.map((r) =>
            r.id === msg.roomId
              ? {
                  ...r,
                  lastMessage: { text: msg.text, senderId: msg.senderId },
                  lastMessageAt: msg.createdAt,
                  unreadCount: msg.roomId === currentRoomId ? 0 : (r.unreadCount || 0) + 1,
                }
              : r
          ).sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""))
        );
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [currentUser.id, currentRoomId]);

  const openRoom = useCallback((roomId: string) => {
    setCurrentRoomId(roomId);
  }, []);

  const closeRoom = useCallback(() => {
    setCurrentRoomId(null);
    setMessages([]);
  }, []);

  const startDM = useCallback(async (otherUserId: string): Promise<string> => {
    const room = await api.createChatRoom([currentUser.id, otherUserId]);
    // Add to rooms if not exists
    setRooms((prev) => {
      if (prev.some((r) => r.id === room.id)) return prev;
      return [room, ...prev];
    });
    return room.id;
  }, [currentUser.id]);

  const sendMessage = useCallback(async (text: string) => {
    if (!currentRoomId || !text.trim()) return;
    const msg = await api.sendChatMessage(currentRoomId, currentUser.id, text.trim());
    // Add to local messages
    setMessages((prev) => [...prev, msg]);
    // Update room
    setRooms((prev) =>
      prev.map((r) =>
        r.id === currentRoomId
          ? { ...r, lastMessage: { text: msg.text, senderId: msg.senderId }, lastMessageAt: msg.createdAt }
          : r
      ).sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""))
    );
    // Broadcast to others
    channelRef.current?.send({
      type: "broadcast",
      event: "new-message",
      payload: msg,
    });
  }, [currentRoomId, currentUser.id]);

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

  return (
    <ChatContext.Provider
      value={{
        rooms,
        currentRoomId,
        messages,
        isLoadingRooms,
        isLoadingMessages,
        totalUnread,
        openRoom,
        closeRoom,
        startDM,
        sendMessage,
        refreshRooms,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
