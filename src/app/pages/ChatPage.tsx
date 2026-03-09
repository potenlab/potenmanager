import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle, Send, ArrowLeft, Search, Circle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { useChat, ChatMessage } from "../context/ChatContext";
import { usePresence } from "../context/PresenceContext";

export function ChatPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const { currentUser, members } = useTeam();
  const { rooms, currentRoomId, messages, isLoadingMessages, openRoom, closeRoom, startDM, sendMessage, refreshRooms } = useChat();
  const { isOnline } = usePresence();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [chatTab, setChatTab] = useState<'conversations' | 'members'>('conversations');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when room opens
  useEffect(() => {
    if (currentRoomId) setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentRoomId]);

  const getMemberName = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m?.name || "Unknown";
  };
  const getMemberAvatar = (id: string) => {
    const m = members.find((m) => m.id === id);
    return m?.avatar || "";
  };

  // Get the other participant in a DM room
  const getOtherUserId = (room: { participants: string[] }) => {
    return room.participants.find((p) => p !== currentUser.id) || "";
  };

  // Members not yet in any room (for new conversation)
  const otherMembers = useMemo(() => {
    return members.filter((m) => m.id !== currentUser.id);
  }, [members, currentUser.id]);

  const filteredMembers = useMemo(() => {
    if (!search) return otherMembers;
    const q = search.toLowerCase();
    return otherMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [otherMembers, search]);

  const handleStartDM = async (userId: string) => {
    const roomId = await startDM(userId);
    openRoom(roomId);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format time for message
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(ko ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return ko ? "오늘" : "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return ko ? "어제" : "Yesterday";
    return d.toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const date = new Date(msg.createdAt).toDateString();
      if (date !== lastDate) {
        groups.push({ date, messages: [msg] });
        lastDate = date;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  // ─── Chat Room View ─────────────────────────────────────
  if (currentRoomId) {
    const room = rooms.find((r) => r.id === currentRoomId);
    const otherUserId = room ? getOtherUserId(room) : "";
    const otherName = getMemberName(otherUserId);
    const otherAvatar = getMemberAvatar(otherUserId);
    const online = isOnline(otherUserId);

    return (
      <div className="h-full min-h-[400px] flex flex-col bg-white max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button
            onClick={closeRoom}
            className="p-1.5 -ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative">
            {otherAvatar ? (
              <img src={otherAvatar} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {otherName[0]}
              </div>
            )}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
              online ? "bg-green-500" : "bg-gray-300"
            )} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{otherName}</p>
            <p className="text-[11px] text-gray-400">
              {online ? (ko ? "접속 중" : "Online") : (ko ? "오프라인" : "Offline")}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1 scrollbar-hide">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <MessageCircle size={32} className="mb-3 text-gray-300" />
              <p className="text-sm">{ko ? "첫 메시지를 보내보세요" : "Send the first message"}</p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 border-t border-gray-100" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">
                    {formatDate(group.messages[0].createdAt)}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
                {group.messages.map((msg, i) => {
                  const isMine = msg.senderId === currentUser.id;
                  const showAvatar = !isMine && (i === 0 || group.messages[i - 1].senderId !== msg.senderId);
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex gap-2 mb-1", isMine ? "justify-end" : "justify-start")}
                    >
                      {!isMine && (
                        <div className="w-7 shrink-0">
                          {showAvatar && otherAvatar ? (
                            <img src={otherAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : showAvatar ? (
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                              {otherName[0]}
                            </div>
                          ) : null}
                        </div>
                      )}
                      <div className={cn("max-w-[70%]")}>
                        <div
                          className={cn(
                            "px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                            isMine
                              ? "bg-blue-500 text-white rounded-br-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                          )}
                        >
                          {msg.text}
                        </div>
                        <p className={cn("text-[10px] text-gray-400 mt-0.5 px-1", isMine && "text-right")}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ko ? "메시지를 입력하세요..." : "Type a message..."}
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                input.trim()
                  ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed"
              )}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Room List View ─────────────────────────────────────
  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full">
      <header className="mb-4 shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <MessageCircle size={22} className="text-blue-500" />
          {ko ? "채팅" : "Chat"}
        </h1>
        <p className="text-gray-500 text-xs">
          {ko ? "팀원과 1:1 대화" : "1:1 conversations with team"}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-4 shrink-0">
        <button
          onClick={() => { setChatTab('conversations'); setSearch(''); }}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
            chatTab === 'conversations' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          {ko ? "대화" : "Conversations"}
          {rooms.length > 0 && <span className="ml-1 text-[10px] text-gray-400">{rooms.length}</span>}
        </button>
        <button
          onClick={() => setChatTab('members')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
            chatTab === 'members' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          {ko ? "팀원" : "Members"}
          <span className="ml-1 text-[10px] text-gray-400">{filteredMembers.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 shrink-0">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ko ? (chatTab === 'members' ? "팀원 검색..." : "대화 검색...") : "Search..."}
          className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Existing conversations */}
        {chatTab === 'conversations' && rooms.length > 0 && (
          <div className="mb-4">
            <div className="space-y-1">
              {rooms.map((room) => {
                const otherId = getOtherUserId(room);
                const name = getMemberName(otherId);
                const avatar = getMemberAvatar(otherId);
                const online = isOnline(otherId);
                return (
                  <button
                    key={room.id}
                    onClick={() => openRoom(room.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="relative shrink-0">
                      {avatar ? (
                        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {name[0]}
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                        online ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                        {room.lastMessageAt && (
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                            {formatDate(room.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      {room.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {room.lastMessage.senderId === currentUser.id ? (ko ? "나: " : "Me: ") : ""}
                          {room.lastMessage.text}
                        </p>
                      )}
                    </div>
                    {(room.unreadCount || 0) > 0 && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-white">{room.unreadCount}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversations empty state */}
        {chatTab === 'conversations' && rooms.length === 0 && !search && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {ko ? "아직 대화가 없습니다. 팀원 탭에서 대화를 시작하세요." : "No conversations yet. Start one from the Members tab."}
          </div>
        )}

        {/* All team members */}
        {chatTab === 'members' && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
            {ko ? "팀원" : "Team Members"}
          </p>
          {filteredMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              {ko ? "팀원이 없습니다" : "No team members"}
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredMembers.map((member) => {
                const online = isOnline(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => handleStartDM(member.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="relative shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {member.name[0]}
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                        online ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{member.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {online ? (ko ? "접속 중" : "Online") : (ko ? "오프라인" : "Offline")}
                      </p>
                    </div>
                    <MessageCircle size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
