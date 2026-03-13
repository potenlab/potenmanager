import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Send,
  CalendarCheck,
  ListTodo,
  BarChart3,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTaskContext } from "../../context/TaskContext";
import { useMeetingContext } from "../../context/MeetingContext";
import { usePermission } from "../../context/PermissionContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSidebar } from "../../context/SidebarContext";
import { api } from "../../../lib/api";
import { format, isSameDay, isBefore } from "date-fns";

interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  {
    id: "today",
    labelKo: "오늘 뭐 해야 해?",
    labelEn: "What should I do today?",
    icon: CalendarCheck,
    color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
  },
  {
    id: "priority",
    labelKo: "우선순위 추천",
    labelEn: "Priority suggestions",
    icon: ListTodo,
    color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100",
  },
  {
    id: "analysis",
    labelKo: "업무 분석",
    labelEn: "Task analysis",
    icon: BarChart3,
    color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100",
  },
];

export function TaskAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { tasks } = useTaskContext();
  const { meetings } = useMeetingContext();
  const { currentUser } = usePermission();
  const { language } = useLanguage();
  const { isMobile } = useSidebar();

  const isKo = language === "ko";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Build context from user's current task/meeting data
  const buildContext = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, "yyyy-MM-dd");

    // My tasks only
    const myTasks = tasks.filter((t) => {
      const ids = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
      return ids.includes(currentUser.id);
    });

    const activeTasks = myTasks.filter(
      (t) => t.status !== "completed" && t.status !== "cancelled"
    );

    const todayTasks = activeTasks.filter(
      (t) => t.dueDate && isSameDay(new Date(t.dueDate), today)
    );

    const overdueTasks = activeTasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return isBefore(due, today);
    });

    const inProgress = activeTasks.filter((t) => t.status === "in-progress");
    const pending = activeTasks.filter((t) => t.status === "pending");

    const todayMeetings = meetings.filter(
      (m) =>
        isSameDay(new Date(m.date), today) && m.status !== "cancelled"
    );

    const upcomingMeetings = meetings.filter((m) => {
      const d = new Date(m.date);
      return d > today && d <= new Date(today.getTime() + 7 * 86400000) && m.status !== "cancelled";
    });

    const completedToday = myTasks.filter(
      (t) => t.status === "completed" && t.dueDate && isSameDay(new Date(t.dueDate), today)
    );

    const formatTask = (t: typeof tasks[0]) => {
      const title = t.titleKo || t.title;
      const due = t.dueDate ? format(new Date(t.dueDate), "M/d") : "미정";
      return `"${title}" [${t.priority || "medium"}, 마감:${due}, 상태:${t.status}]`;
    };

    return `날짜: ${todayStr}
사용자: ${currentUser.name}

[오늘 마감 업무 ${todayTasks.length}건]
${todayTasks.map(formatTask).join("\n") || "없음"}

[지연 업무 ${overdueTasks.length}건]
${overdueTasks.map(formatTask).join("\n") || "없음"}

[진행 중 ${inProgress.length}건]
${inProgress.slice(0, 8).map(formatTask).join("\n") || "없음"}

[대기 중 ${pending.length}건]
${pending.slice(0, 8).map(formatTask).join("\n") || "없음"}

[오늘 완료 ${completedToday.length}건]

[오늘 회의 ${todayMeetings.length}건]
${todayMeetings.map((m) => `"${m.title}" ${format(new Date(m.date), "HH:mm")} (${m.duration}분)`).join("\n") || "없음"}

[이번 주 예정 회의 ${upcomingMeetings.length}건]
${upcomingMeetings.slice(0, 5).map((m) => `"${m.title}" ${format(new Date(m.date), "M/d HH:mm")}`).join("\n") || "없음"}

전체 미완료 업무: ${activeTasks.length}건`;
  }, [tasks, meetings, currentUser]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        role: "user",
        text: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const context = buildContext();
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const res = await api.aiTaskAssistant({
          context,
          messages: apiMessages,
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: res.reply,
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: isKo
              ? "죄송합니다, 응답을 생성하지 못했습니다. 다시 시도해주세요."
              : "Sorry, I couldn't generate a response. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, buildContext, isKo]
  );

  const handleQuickAction = useCallback(
    (actionId: string) => {
      const action = QUICK_ACTIONS.find((a) => a.id === actionId);
      if (action) {
        sendMessage(isKo ? action.labelKo : action.labelEn);
      }
    },
    [sendMessage, isKo]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  // Simple markdown-like rendering for AI responses
  const renderMessageText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold
      let html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Inline code
      html = html.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>');
      // Numbered list
      if (/^\d+\.\s/.test(html)) {
        html = html.replace(/^(\d+\.)\s/, '<span class="font-semibold text-blue-600">$1</span> ');
      }
      // Bullet
      if (/^[-•]\s/.test(html)) {
        html = html.replace(/^[-•]\s/, "");
        return (
          <div key={i} className="flex gap-1.5 ml-1">
            <span className="text-blue-400 shrink-0 mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        );
      }
      if (html.trim() === "") return <div key={i} className="h-2" />;
      return <div key={i} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-[800] rounded-full shadow-lg transition-all duration-200",
          "w-12 h-12 flex items-center justify-center",
          "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
          "hover:shadow-xl hover:scale-105 active:scale-95",
          isMobile ? "bottom-20 right-4" : "bottom-6 right-6"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown size={22} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Sparkles size={20} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "fixed z-[801] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden",
              isMobile
                ? "bottom-[88px] right-3 left-3 max-h-[70vh]"
                : "bottom-[72px] right-6 w-[380px] max-h-[560px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span className="font-semibold text-sm">
                  {isKo ? "AI 업무 도우미" : "AI Task Assistant"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={resetChat}
                    className="text-white/70 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {isKo ? "새 대화" : "New chat"}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 ? (
                /* Welcome + Quick Actions */
                <div className="space-y-4">
                  <div className="text-center py-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={24} className="text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {isKo
                        ? `안녕하세요, ${currentUser.name}님!`
                        : `Hi, ${currentUser.name}!`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isKo
                        ? "업무에 대해 무엇이든 물어보세요"
                        : "Ask me anything about your tasks"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                          action.color
                        )}
                      >
                        <action.icon size={16} />
                        {isKo ? action.labelKo : action.labelEn}
                      </button>
                    ))}
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const myTasks = tasks.filter((t) => {
                        const ids = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
                        return ids.includes(currentUser.id);
                      });
                      const active = myTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
                      const todayCount = active.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), today)).length;
                      const overdueCount = active.filter((t) => {
                        if (!t.dueDate) return false;
                        const d = new Date(t.dueDate); d.setHours(0, 0, 0, 0);
                        return isBefore(d, today);
                      }).length;
                      const todayMeetings = meetings.filter(
                        (m) => isSameDay(new Date(m.date), today) && m.status !== "cancelled"
                      ).length;
                      return (
                        <>
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-blue-600">{todayCount}</div>
                            <div className="text-[10px] text-blue-500">{isKo ? "오늘 마감" : "Due today"}</div>
                          </div>
                          <div className={cn("rounded-lg p-2 text-center", overdueCount > 0 ? "bg-red-50" : "bg-gray-50")}>
                            <div className={cn("text-lg font-bold", overdueCount > 0 ? "text-red-600" : "text-gray-400")}>{overdueCount}</div>
                            <div className={cn("text-[10px]", overdueCount > 0 ? "text-red-500" : "text-gray-400")}>{isKo ? "지연" : "Overdue"}</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2 text-center">
                            <div className="text-lg font-bold text-purple-600">{todayMeetings}</div>
                            <div className="text-[10px] text-purple-500">{isKo ? "오늘 회의" : "Meetings"}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                /* Chat messages */
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-gray-100 text-gray-800 rounded-bl-md"
                      )}
                    >
                      {msg.role === "model"
                        ? renderMessageText(msg.text)
                        : msg.text}
                    </div>
                  </div>
                ))
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-100 p-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isKo
                      ? "업무에 대해 물어보세요..."
                      : "Ask about your tasks..."
                  }
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all max-h-[80px] overflow-y-auto"
                  style={{
                    height: "auto",
                    minHeight: "36px",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 80) + "px";
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    input.trim() && !isLoading
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                      : "bg-gray-100 text-gray-300"
                  )}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
