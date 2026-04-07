import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";

const AUTO_PM_API = "http://localhost:8000";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const SUGGESTED_EN = [
  "What are the pending action items across all projects?",
  "Summarize the latest meetings",
  "What milestones are coming up this month?",
  "Show me overdue action items",
  "What key decisions were made recently?",
  "Who is responsible for what?",
];

const SUGGESTED_KO = [
  "모든 프로젝트의 대기 중인 액션 아이템은?",
  "최근 회의를 요약해줘",
  "이번 달 다가오는 마일스톤은?",
  "기한 초과된 액션 아이템 보여줘",
  "최근에 어떤 결정이 있었나요?",
  "누가 무엇을 담당하고 있나요?",
];

export function AIChatPage() {
  const { language } = useLanguage();
  const { org } = useInvite();
  const ko = language === "ko";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || !org?.id) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    let answerText: string;
    try {
      const res = await fetch(`${AUTO_PM_API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: org.id,
          project_id: "",
          session_id: "global",
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
      answerText = ko
        ? "백엔드 서버가 실행 중이지 않습니다.\n\n시작 방법:\n```\ncd backend\nsource venv/bin/activate\nuvicorn app.main:app --port 8000\n```"
        : "Backend server is not running.\n\nTo start:\n```\ncd backend\nsource venv/bin/activate\nuvicorn app.main:app --port 8000\n```";
    }

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: answerText,
      createdAt: new Date().toISOString(),
    }]);
    setIsSending(false);
  };

  const suggested = ko ? SUGGESTED_KO : SUGGESTED_EN;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Bot size={20} className="text-indigo-500" />
          {ko ? "AI 채팅" : "AI Chat"}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {ko ? "모든 프로젝트의 회의, 결정, 타임라인에 대해 질문하세요" : "Ask about meetings, decisions, and timelines across all projects"}
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 border border-gray-200 rounded-xl flex flex-col overflow-hidden bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-5">
              <div className="w-16 h-16 mx-auto bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Bot size={32} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {ko ? "무엇이든 물어보세요" : "Ask me anything"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {ko ? "모든 프로젝트의 회의록, 타임라인, 액션 아이템 데이터를 기반으로 답변합니다" : "I answer based on all meeting transcripts, timelines, and action items"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {suggested.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
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
              className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} className="text-indigo-600" />
                </div>
              )}
              <div className={cn(
                "max-w-[75%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                msg.role === 'user'
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-700"
              )}>
                {msg.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Loader2 size={16} className="text-indigo-600 animate-spin" />
              </div>
              <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                <span className="text-sm text-gray-400">{ko ? "생각 중..." : "Thinking..."}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={ko ? "질문을 입력하세요..." : "Ask a question..."}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
            disabled={isSending}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
