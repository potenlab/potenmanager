import { useState, useRef, useEffect, useMemo } from "react";
import { Bot, Send, Plus, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { api } from "../../../lib/api";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ProjectAIChatProps {
  projectId: string;
  orgId: string;
}

const SUGGESTED_QUESTIONS_EN = [
  "What are the pending action items?",
  "Summarize the last meeting",
  "What decisions have been made so far?",
  "What milestones are coming up?",
  "Who is responsible for what?",
];

const SUGGESTED_QUESTIONS_KO = [
  "대기 중인 액션 아이템은?",
  "마지막 회의 요약해줘",
  "지금까지 어떤 결정이 있었나요?",
  "다가오는 마일스톤은?",
  "누가 무엇을 담당하고 있나요?",
];

export function ProjectAIChat({ projectId, orgId }: ProjectAIChatProps) {
  const { language } = useLanguage();
  const ko = language === "ko";

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const data = await api.getAIChatSessions(projectId);
        setSessions(data as ChatSession[]);
        if (data.length > 0) {
          setActiveSessionId((data[0] as any).id);
        }
      } catch (err) {
        console.error("[ProjectAIChat] load sessions error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, [projectId]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const data = await api.getAIChatMessages(activeSessionId);
        setMessages(data as ChatMessage[]);
      } catch (err) {
        console.error("[ProjectAIChat] load messages error:", err);
      }
    };
    loadMessages();
  }, [activeSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewSession = async () => {
    try {
      const session = await api.createAIChatSession({
        projectId,
        title: ko ? "새 대화" : "New Chat",
      });
      setSessions(prev => [session as ChatSession, ...prev]);
      setActiveSessionId((session as any).id);
      setMessages([]);
    } catch (err) {
      console.error("[ProjectAIChat] create session error:", err);
    }
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // Create session if none exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await api.createAIChatSession({
          projectId,
          title: messageText.slice(0, 50),
        });
        setSessions(prev => [session as ChatSession, ...prev]);
        sessionId = (session as any).id;
        setActiveSessionId(sessionId);
      } catch (err) {
        console.error("[ProjectAIChat] auto-create session error:", err);
        return;
      }
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      // Save user message to Supabase
      await api.createAIChatMessage({
        sessionId,
        role: 'user',
        content: messageText,
      });

      // Try calling the local backend proxy (which calls Claude CLI)
      let answerText: string;
      try {
        const res = await fetch("http://localhost:8000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: orgId,
            project_id: projectId,
            session_id: sessionId,
            question: messageText,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          answerText = data.answer || JSON.stringify(data);
        } else {
          throw new Error("Backend unavailable");
        }
      } catch {
        // Backend not running — save fallback message
        answerText = ko
          ? `백엔드 서버가 실행 중이지 않습니다.\n\n시작 방법:\n\`\`\`\ncd backend\npip install -r requirements.txt\nuvicorn app.main:app --port 8000\n\`\`\`\n\n또는 터미널에서 직접:\n\`\`\`\nclaude /chat-project ${orgId} ${projectId} "${messageText}"\n\`\`\``
          : `Backend server is not running.\n\nTo start:\n\`\`\`\ncd backend\npip install -r requirements.txt\nuvicorn app.main:app --port 8000\n\`\`\`\n\nOr run directly:\n\`\`\`\nclaude /chat-project ${orgId} ${projectId} "${messageText}"\n\`\`\``;
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answerText,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to Supabase
      await api.createAIChatMessage({
        sessionId,
        role: 'assistant',
        content: answerText,
      });
    } catch (err) {
      console.error("[ProjectAIChat] send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.deleteAIChatSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(sessions.length > 1 ? sessions.find(s => s.id !== id)?.id || null : null);
      }
    } catch (err) {
      console.error("[ProjectAIChat] delete session error:", err);
    }
  };

  const suggestedQuestions = ko ? SUGGESTED_QUESTIONS_KO : SUGGESTED_QUESTIONS_EN;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Bot size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-700">
          {ko ? "AI 채팅" : "AI Chat"}
        </h3>
        <span className="text-xs text-gray-400">
          {ko ? "프로젝트에 대해 질문하세요" : "Ask about this project"}
        </span>
      </div>

      <div className="flex gap-3 h-[400px]">
        {/* Session sidebar */}
        <div className="w-48 shrink-0 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border-b border-gray-100 transition-colors"
          >
            <Plus size={12} />
            {ko ? "새 대화" : "New Chat"}
          </button>
          <div className="flex-1 overflow-y-auto">
            {sessions.map(session => (
              <div
                key={session.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer group transition-colors",
                  activeSessionId === session.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-600"
                )}
                onClick={() => setActiveSessionId(session.id)}
              >
                <MessageSquare size={10} className="shrink-0" />
                <span className="truncate flex-1">{session.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && !isLoading && (
              <div className="text-center py-6 text-gray-300 text-[10px]">
                {ko ? "대화 없음" : "No chats yet"}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 border border-gray-200 rounded-lg flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-4">
                <Bot size={32} className="mx-auto text-gray-200" />
                <p className="text-xs text-gray-400">
                  {ko ? "프로젝트 회의, 결정, 타임라인에 대해 질문하세요" : "Ask about project meetings, decisions, and timelines"}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="text-[10px] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-indigo-600" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === 'user'
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-700"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Loader2 size={12} className="text-indigo-600 animate-spin" />
                </div>
                <span className="text-xs">{ko ? "생각 중..." : "Thinking..."}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={ko ? "질문을 입력하세요..." : "Ask a question..."}
              className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-200 focus:border-indigo-400 focus:outline-none"
              disabled={isSending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              className="p-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
