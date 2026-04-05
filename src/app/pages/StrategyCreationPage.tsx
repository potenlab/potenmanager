import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  ArrowLeft,
  Sparkles,
  Target,
  Calendar,
  BarChart3,
  Layers,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Copy,
  ChevronRight,
  RotateCcw,
  TrendingUp,
  Shield,
  Flag,
  Lightbulb,
  Milestone,
  ListChecks,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTeam } from "../context/TeamContext";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { useOrgPath } from "../hooks/useOrgPath";

// ─── Types ─────────────────────────────────────────────────────────────
type Role = "ai" | "user";

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface StepConfig {
  key: string;
  question: (answers: Record<string, string>) => string;
  chips: string[];
  placeholder: string;
  icon: React.ReactNode;
  label: string;
}

// ─── AI Strategy Response Type ──────────────────────────────────────────
interface AIStrategy {
  id?: string;
  title: string;
  summary?: string;
  timeline: string;
  kpi: string;
  currentAnalysis?: string;
  strengthAnalysis?: string;
  okrs: { objective: string; keyResults: string[] }[];
  phases: { phase: string; period: string; color: string; description?: string; tasks: string[] }[];
  risks: { risk: string; impact?: string; mitigation: string }[];
  weeklyActions?: string[];
  milestones?: { title: string; targetDate: string; criteria: string }[];
}

// ─── Conversation Steps ─────────────────────────────────────────────────
const STEPS: StepConfig[] = [
  {
    key: "goal",
    question: () =>
      "안녕하세요! 저는 포텐매니저 AI 전략 어시스턴트예요 \n\n어떤 목표를 달성하고 싶으신가요? 미션이나 비전을 자유롭게 말씀해 주세요.",
    chips: ["매출 목표 달성", "유료 사용자 확보", "신제품 출시", "시리즈 A 투자 유치", "브랜드 인지도 구축"],
    placeholder: "예: 연말까지 MRR $10K 달성하기",
    icon: <Target size={16} />,
    label: "핵심 목표",
  },
  {
    key: "timeline",
    question: (a) =>
      `"${a.goal}" — 멋진 목표네요!\n\n언제까지 달성하고 싶으신가요?`,
    chips: ["1개월", "3개월 (1분기)", "6개월", "1년", "2년 이상"],
    placeholder: "예: 6개월, 올해 4분기까지",
    icon: <Calendar size={16} />,
    label: "달성 기간",
  },
  {
    key: "metric",
    question: (a) =>
      `${a.timeline} 내에 달성하는 거군요!\n\n성공을 어떻게 측정할 건가요? 숫자로 표현할 수 있는 핵심 지표를 알려주세요.`,
    chips: ["MRR $10,000", "유료 고객 100명", "MAU 1,000명", "계약 10건", "앱 다운로드 5,000회"],
    placeholder: "예: MRR $10K, 유료 고객 100명",
    icon: <BarChart3 size={16} />,
    label: "성공 지표 (KPI)",
  },
  {
    key: "current",
    question: () =>
      `명확한 지표가 있으니 훨씬 좋아요!\n\n현재 어느 단계에 계신가요? 지금의 상황을 솔직하게 말씀해 주세요.`,
    chips: ["아이디어/기획 단계", "MVP 개발 중", "베타 테스트 중", "초기 매출 발생 중", "성장 단계 진입"],
    placeholder: "예: 베타 사용자 20명, 월 매출 $500 수준",
    icon: <Layers size={16} />,
    label: "현재 상황",
  },
  {
    key: "obstacle",
    question: () =>
      `현재 상황을 파악했어요!\n\n솔직하게 — 목표 달성에서 가장 큰 걱정이나 장애물은 무엇인가요?`,
    chips: ["자금/자본 부족", "팀원/인력 부족", "기술 역량 한계", "치열한 시장 경쟁", "고객 확보 어려움", "시간 부족"],
    placeholder: "예: 초기 고객을 어디서 어떻게 찾을지 모르겠다",
    icon: <AlertTriangle size={16} />,
    label: "핵심 장애물",
  },
  {
    key: "strength",
    question: () =>
      `장애물을 명확히 아는 것만으로도 절반은 이긴 거예요!\n\n반대로, 지금 가장 강점이나 활용할 수 있는 자원은 무엇인가요?`,
    chips: ["도메인 전문 지식", "업계 네트워크", "기술력/개발 역량", "팀의 실행력", "기존 고객 베이스", "차별화된 아이디어"],
    placeholder: "예: 해당 분야 10년 경력, 잠재 고객 네트워크 보유",
    icon: <Shield size={16} />,
    label: "핵심 강점",
  },
  {
    key: "action",
    question: () =>
      `완벽해요! 거의 다 왔어요\n\n마지막으로 — 이번 주 바로 실행할 수 있는 가장 중요한 액션 1가지는 무엇인가요?`,
    chips: ["고객 인터뷰 5건 진행", "랜딩 페이지 제작", "콜드 아웃리치 10건", "프로토타입 제작", "투자자 미팅 설정"],
    placeholder: "예: 잠재 고객 5명에게 직접 연락해서 인터뷰 잡기",
    icon: <Zap size={16} />,
    label: "즉시 실행 액션",
  },
];

// ─── Typing Indicator ───────────────────────────────────────────────────
function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-400 rounded-full"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      {label && <span className="text-xs text-gray-400 ml-1">{label}</span>}
    </div>
  );
}

// ─── Strategy Result Card (AI-powered) ──────────────────────────────────
function StrategyResultCard({ strategy, onReset, onSave }: {
  strategy: AIStrategy;
  onReset: () => void;
  onSave: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const okrText = strategy.okrs.map((okr, i) =>
      `Objective ${i + 1}: ${okr.objective}\n${okr.keyResults.map((kr, j) => `  KR${j + 1}: ${kr}`).join('\n')}`
    ).join('\n\n');

    const phaseText = strategy.phases.map(p =>
      `${p.phase} (${p.period})\n${p.tasks.map(t => `  - ${t}`).join('\n')}`
    ).join('\n\n');

    const text = `# 전략 문서: ${strategy.title}

## 요약
${strategy.summary || ''}

## 목표 & KPI
- 달성 기간: ${strategy.timeline}
- 핵심 지표: ${strategy.kpi}

## 현재 상황 분석
${strategy.currentAnalysis || ''}

## 강점 활용 방안
${strategy.strengthAnalysis || ''}

## OKR
${okrText}

## 실행 로드맵
${phaseText}

## 이번 주 즉시 실행
${(strategy.weeklyActions || []).map((a, i) => `${i + 1}. ${a}`).join('\n')}

## 리스크 & 대응
${strategy.risks.map(r => `- [${r.impact || 'medium'}] ${r.risk} → ${r.mitigation}`).join('\n')}

## 마일스톤
${(strategy.milestones || []).map(m => `- ${m.targetDate}: ${m.title} (기준: ${m.criteria})`).join('\n')}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const phaseColor: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  const phaseDot: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  const impactColor: Record<string, string> = {
    high: "bg-red-50 text-red-600 border-red-200",
    medium: "bg-amber-50 text-amber-600 border-amber-200",
    low: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">AI 전략 생성 완료</p>
          <h3 className="text-base font-bold text-gray-900 leading-tight">Gemini AI가 맞춤 전략을 완성했어요</h3>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? "복사됨" : "복사"}
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0079FF] hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Flag size={13} />
            전략으로 저장
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Mission Card with Summary */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">핵심 목표</span>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">{strategy.title}</p>
          {strategy.summary && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">{strategy.summary}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-white rounded-full border border-blue-200 text-blue-700">
              <Calendar size={11} /> {strategy.timeline}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-white rounded-full border border-purple-200 text-purple-700">
              <BarChart3 size={11} /> {strategy.kpi}
            </span>
          </div>
        </div>

        {/* Current Analysis & Strength Analysis */}
        {(strategy.currentAnalysis || strategy.strengthAnalysis) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategy.currentAnalysis && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">현재 상황 분석</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{strategy.currentAnalysis}</p>
              </div>
            )}
            {strategy.strengthAnalysis && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-emerald-600" />
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">강점 활용 방안</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{strategy.strengthAnalysis}</p>
              </div>
            )}
          </div>
        )}

        {/* OKR */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-purple-600" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">OKR</span>
          </div>
          {strategy.okrs.map((okr, i) => (
            <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-gray-100" : ""}>
              <div className="flex items-start gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-purple-700">O</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{okr.objective}</p>
              </div>
              <div className="ml-7 space-y-2">
                {okr.keyResults.map((kr, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-blue-600">KR</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-snug">{kr}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Actions */}
        {strategy.weeklyActions && strategy.weeklyActions.length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">이번 주 즉시 실행</span>
            </div>
            <div className="space-y-2.5">
              {strategy.weeklyActions.map((action, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white border border-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-700">{i + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-snug">{action}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roadmap */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={16} className="text-emerald-600" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">실행 로드맵</span>
          </div>
          <div className="space-y-3">
            {strategy.phases.map((phase, i) => (
              <div key={i} className={cn("rounded-xl border p-4", phaseColor[phase.color] || phaseColor.blue)}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-2 h-2 rounded-full", phaseDot[phase.color] || phaseDot.blue)} />
                  <span className="text-xs font-bold">{phase.phase}</span>
                  <span className="ml-auto text-[11px] opacity-70">{phase.period}</span>
                </div>
                {phase.description && (
                  <p className="text-xs text-gray-500 mb-2.5 ml-4">{phase.description}</p>
                )}
                <ul className="space-y-1.5">
                  {phase.tasks.map((task, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-700">
                      <ChevronRight size={12} className="shrink-0 mt-0.5 opacity-50" />
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        {strategy.milestones && strategy.milestones.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Milestone size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">마일스톤</span>
            </div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {strategy.milestones.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center shrink-0 z-10">
                      <span className="text-[9px] font-bold text-blue-700">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{m.title}</span>
                        <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">{m.targetDate}</span>
                      </div>
                      <p className="text-xs text-gray-500">{m.criteria}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risks */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">리스크 & 대응책</span>
          </div>
          <div className="space-y-3">
            {strategy.risks.map((r, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertTriangle size={10} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-800">{r.risk}</p>
                    {r.impact && (
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", impactColor[r.impact] || impactColor.medium)}>
                        {r.impact === 'high' ? '높음' : r.impact === 'medium' ? '보통' : '낮음'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">대응: {r.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset */}
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RotateCcw size={14} />
            다시 생성하기
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────
export function StrategyCreationPage() {
  const navigate = useNavigate();
  const p = useOrgPath();
  const { currentUser } = useTeam();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [strategy, setStrategy] = useState<AIStrategy | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isGenerating]);

  // Send initial AI message on mount
  useEffect(() => {
    const firstStep = STEPS[0];
    const aiMsg: Message = {
      id: `ai-0`,
      role: "ai",
      content: firstStep.question({}),
      timestamp: new Date(),
    };
    setMessages([aiMsg]);
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const addAIMessage = useCallback((content: string) => {
    return new Promise<void>((resolve) => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content,
            timestamp: new Date(),
          },
        ]);
        resolve();
      }, 900 + Math.random() * 600);
    });
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isTyping || isComplete || isGenerating) return;

    const step = STEPS[currentStep];

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: value,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const newAnswers = { ...answers, [step.key]: value };
    setAnswers(newAnswers);

    const nextStep = currentStep + 1;

    if (nextStep < STEPS.length) {
      // Ask next question
      const nextQ = STEPS[nextStep].question(newAnswers);
      await addAIMessage(nextQ);
      setCurrentStep(nextStep);
    } else {
      // All questions answered -> call Gemini AI
      await addAIMessage(
        "완벽해요! 지금까지 말씀해 주신 내용을 Gemini AI에게 전달하고 있어요. 맞춤 전략을 생성 중입니다..."
      );

      setIsGenerating(true);
      setAiError(null);

      try {
        const result = await api.generateStrategy({
          goal: newAnswers.goal,
          timeline: newAnswers.timeline,
          metric: newAnswers.metric,
          current: newAnswers.current,
          obstacle: newAnswers.obstacle,
          strength: newAnswers.strength,
          action: newAnswers.action,
        });

        setStrategy(result);
        setIsComplete(true);
        toast.success("AI 전략이 성공적으로 생성되었습니다!");
      } catch (err: any) {
        console.error("[AI Strategy] Generation failed:", err);
        setAiError(err.message || "AI 전략 생성에 실패했습니다.");
        // Add error message in chat
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-error-${Date.now()}`,
            role: "ai",
            content: `죄송해요, AI 전략 생성 중 오류가 발생했어요.\n\n오류: ${err.message || "알 수 없는 오류"}\n\n다시 시도하려면 아래 "다시 시도" 버튼을 눌러주세요.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [input, isTyping, isComplete, isGenerating, currentStep, answers, addAIMessage]);

  const handleRetryAI = useCallback(async () => {
    setAiError(null);
    setIsGenerating(true);

    try {
      const result = await api.generateStrategy({
        goal: answers.goal,
        timeline: answers.timeline,
        metric: answers.metric,
        current: answers.current,
        obstacle: answers.obstacle,
        strength: answers.strength,
        action: answers.action,
      });

      setStrategy(result);
      setIsComplete(true);
      toast.success("AI 전략이 성공적으로 생성되었습니다!");
    } catch (err: any) {
      console.error("[AI Strategy] Retry failed:", err);
      setAiError(err.message || "AI 전략 생성에 실패했습니다.");
      toast.error("AI 전략 생성에 다시 실패했습니다. 잠시 후 재시도해주세요.");
    } finally {
      setIsGenerating(false);
    }
  }, [answers]);

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setCurrentStep(0);
    setAnswers({});
    setIsTyping(false);
    setStrategy(null);
    setIsComplete(false);
    setIsGenerating(false);
    setAiError(null);
    const firstStep = STEPS[0];
    setMessages([
      {
        id: `ai-reset`,
        role: "ai",
        content: firstStep.question({}),
        timestamp: new Date(),
      },
    ]);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleSaveStrategy = () => {
    navigate(p("/organization"));
  };

  const progress = isComplete ? 100 : Math.round((currentStep / STEPS.length) * 100);
  const currentChips = !isComplete && !isGenerating ? STEPS[currentStep]?.chips ?? [] : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-4 pb-5 border-b border-gray-100">
        <button
          onClick={() => navigate(p("/organization"))}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Sparkles size={17} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">AI 전략 생성</h1>
            <p className="text-xs text-gray-500">Gemini AI가 맞춤 전략을 만들어드려요</p>
          </div>
        </div>

        {/* Progress */}
        <div className="ml-auto flex items-center gap-3">
          {!isComplete && !isGenerating && (
            <span className="text-xs font-medium text-gray-500">
              {currentStep + 1} / {STEPS.length}
            </span>
          )}
          {isGenerating && (
            <span className="text-xs font-medium text-blue-600 animate-pulse">
              AI 생성 중...
            </span>
          )}
          <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {isComplete && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={13} /> 완료
            </span>
          )}
        </div>
      </div>

      {/* ── Step Pills (not complete) ── */}
      {!isComplete && !isGenerating && (
        <div className="shrink-0 flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all",
                i < currentStep
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : i === currentStep
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "bg-gray-50 text-gray-400 border border-gray-200"
              )}
            >
              {i < currentStep ? (
                <CheckCircle2 size={11} />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">
                  {i + 1}
                </span>
              )}
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              {msg.role === "ai" ? (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200 mt-0.5">
                  <Sparkles size={14} className="text-white" />
                </div>
              ) : (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl object-cover shrink-0 border border-gray-200 mt-0.5"
                />
              )}

              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "ai"
                    ? "bg-white border border-gray-200 text-gray-800 shadow-sm"
                    : "bg-[#0079FF] text-white"
                )}
              >
                {msg.content.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < msg.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <TypingIndicator />
            </div>
          </motion.div>
        )}

        {/* AI Generating */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="bg-white border border-blue-200 rounded-2xl shadow-sm px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <Sparkles size={12} className="text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Gemini AI가 전략을 생성하고 있어요</p>
                  <p className="text-xs text-gray-500 mt-0.5">OKR, 로드맵, 리스크 분석을 포함한 맞춤 전략 작성 중...</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Error - Retry Button */}
        {aiError && !isGenerating && !isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <button
              onClick={handleRetryAI}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0079FF] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <RotateCcw size={15} />
              다시 시도
            </button>
          </motion.div>
        )}

        {/* Strategy Result */}
        {isComplete && strategy && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-blue-200 mt-0.5">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <StrategyResultCard
                strategy={strategy}
                onReset={handleReset}
                onSave={handleSaveStrategy}
              />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestion Chips ── */}
      <AnimatePresence>
        {!isComplete && !isTyping && !isGenerating && currentChips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="shrink-0 flex flex-wrap gap-2 pb-3"
          >
            {currentChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSend(chip)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
              >
                {chip}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ── */}
      {!isComplete && (
        <div className="shrink-0 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(); } }}
              placeholder={STEPS[currentStep]?.placeholder ?? "메시지를 입력하세요..."}
              className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
              disabled={isTyping || isGenerating}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping || isGenerating}
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                input.trim() && !isTyping && !isGenerating
                  ? "bg-[#0079FF] text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Send size={15} />
            </button>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">
            Enter로 전송 · 또는 위 버튼을 클릭해 빠르게 선택하세요
          </p>
        </div>
      )}
    </div>
  );
}
