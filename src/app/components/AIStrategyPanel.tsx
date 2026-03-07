import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, Target, Calendar, BarChart3, Layers, Shield,
  TrendingUp, Zap, ChevronRight, RotateCcw, AlertTriangle,
  Milestone, Copy, CheckCircle2, ChevronDown, Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api";
import { useLanguage } from "../context/LanguageContext";

interface AIStrategy {
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

interface AIStrategyPanelProps {
  name: string;
  description?: string;
  context?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    client?: string;
    category?: string;
    budget?: string;
    url?: string;
  };
  type: "project" | "brand";
}

export function AIStrategyPanel({ name, description, context, type }: AIStrategyPanelProps) {
  const { language } = useLanguage();
  const ko = language === "ko";
  const [expanded, setExpanded] = useState(false);
  const [strategy, setStrategy] = useState<AIStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError(ko ? "이름을 먼저 입력해주세요" : "Please enter a name first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const goal = type === "project"
        ? `${name} 프로젝트 성공적 완수${context?.client ? ` (클라이언트: ${context.client})` : ""}`
        : `${name} 브랜드/채널 성장 전략`;

      const timeline = context?.startDate && context?.endDate
        ? `${context.startDate} ~ ${context.endDate}`
        : "3개월";

      const metric = type === "project"
        ? `${name} 프로젝트 핵심 성과지표 달성`
        : `${name} 채널 성장 및 영향력 확대`;

      const current = [
        context?.status ? `상태: ${context.status}` : "",
        context?.category ? `카테고리: ${context.category}` : "",
        context?.budget ? `예산: ${context.budget}` : "",
        description ? `설명: ${description.slice(0, 200)}` : "",
      ].filter(Boolean).join(", ") || undefined;

      const res = await api.generateStrategy({
        goal,
        timeline,
        metric,
        current,
        strength: type === "brand" && context?.url ? `채널 URL: ${context.url}` : undefined,
      });

      if (res.strategy) {
        setStrategy(res.strategy);
      } else {
        setError(ko ? "전략 생성에 실패했습니다" : "Failed to generate strategy");
      }
    } catch (e: any) {
      setError(e.message || (ko ? "오류가 발생했습니다" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!strategy) return;
    const okrText = strategy.okrs.map((okr, i) =>
      `Objective ${i + 1}: ${okr.objective}\n${okr.keyResults.map((kr, j) => `  KR${j + 1}: ${kr}`).join('\n')}`
    ).join('\n\n');
    const phaseText = strategy.phases.map(p =>
      `${p.phase} (${p.period})\n${p.tasks.map(t => `  - ${t}`).join('\n')}`
    ).join('\n\n');
    const text = `# ${strategy.title}\n\n${strategy.summary || ''}\n\n## OKR\n${okrText}\n\n## 로드맵\n${phaseText}`;
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
    <div className="border-t border-gray-100 pt-5 mt-2">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="flex items-center gap-2 w-full text-left group mb-3"
      >
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Sparkles size={14} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
          {ko ? "AI 전략 추천" : "AI Strategy"}
        </span>
        <ChevronDown size={14} className={cn("text-gray-400 transition-transform ml-auto", expanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {!strategy ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  {ko
                    ? `${type === "project" ? "프로젝트" : "브랜드"} 정보를 기반으로 AI가 맞춤 전략을 생성합니다.`
                    : `AI generates a custom strategy based on your ${type} info.`}
                </p>
                {error && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full justify-center",
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-200"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {ko ? "AI가 전략을 생성하고 있어요..." : "Generating strategy..."}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {ko ? "AI 전략 생성하기" : "Generate AI Strategy"}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied ? (ko ? "복사됨" : "Copied") : (ko ? "복사" : "Copy")}
                  </button>
                  <button
                    onClick={() => { setStrategy(null); setError(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RotateCcw size={13} />
                    {ko ? "다시 생성" : "Regenerate"}
                  </button>
                </div>

                {/* Mission Card */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{ko ? "핵심 목표" : "Goal"}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1.5">{strategy.title}</p>
                  {strategy.summary && <p className="text-xs text-gray-600 leading-relaxed">{strategy.summary}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-white rounded-full border border-blue-200 text-blue-700">
                      <Calendar size={10} /> {strategy.timeline}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-white rounded-full border border-purple-200 text-purple-700">
                      <BarChart3 size={10} /> {strategy.kpi}
                    </span>
                  </div>
                </div>

                {/* Analysis */}
                {(strategy.currentAnalysis || strategy.strengthAnalysis) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {strategy.currentAnalysis && (
                      <div className="bg-white rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Layers size={12} className="text-blue-600" />
                          <span className="text-[10px] font-bold text-gray-700 uppercase">{ko ? "현재 상황" : "Current"}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{strategy.currentAnalysis}</p>
                      </div>
                    )}
                    {strategy.strengthAnalysis && (
                      <div className="bg-white rounded-xl border border-gray-200 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Shield size={12} className="text-emerald-600" />
                          <span className="text-[10px] font-bold text-gray-700 uppercase">{ko ? "강점 활용" : "Strengths"}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{strategy.strengthAnalysis}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* OKR */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} className="text-purple-600" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">OKR</span>
                  </div>
                  {strategy.okrs.map((okr, i) => (
                    <div key={i} className={i > 0 ? "mt-3 pt-3 border-t border-gray-100" : ""}>
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[8px] font-bold text-purple-700">O</span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900">{okr.objective}</p>
                      </div>
                      <div className="ml-6 space-y-1.5">
                        {okr.keyResults.map((kr, j) => (
                          <div key={j} className="flex items-start gap-1.5">
                            <div className="w-3.5 h-3.5 rounded bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[7px] font-bold text-blue-600">KR</span>
                            </div>
                            <p className="text-xs text-gray-600">{kr}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Actions */}
                {strategy.weeklyActions && strategy.weeklyActions.length > 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={14} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{ko ? "즉시 실행" : "Quick Actions"}</span>
                    </div>
                    <div className="space-y-2">
                      {strategy.weeklyActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-md bg-white border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[9px] font-bold text-amber-700">{i + 1}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-800">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roadmap */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{ko ? "실행 로드맵" : "Roadmap"}</span>
                  </div>
                  <div className="space-y-2">
                    {strategy.phases.map((phase, i) => (
                      <div key={i} className={cn("rounded-lg border p-3", phaseColor[phase.color] || phaseColor.blue)}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", phaseDot[phase.color] || phaseDot.blue)} />
                          <span className="text-[11px] font-bold">{phase.phase}</span>
                          <span className="ml-auto text-[10px] opacity-70">{phase.period}</span>
                        </div>
                        {phase.description && <p className="text-[10px] text-gray-500 mb-2 ml-3.5">{phase.description}</p>}
                        <ul className="space-y-1">
                          {phase.tasks.map((task, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                              <ChevronRight size={10} className="shrink-0 mt-0.5 opacity-50" />
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
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Milestone size={14} className="text-blue-600" />
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{ko ? "마일스톤" : "Milestones"}</span>
                    </div>
                    <div className="relative">
                      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />
                      <div className="space-y-3">
                        {strategy.milestones.map((m, i) => (
                          <div key={i} className="flex items-start gap-2.5 relative">
                            <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center shrink-0 z-10">
                              <span className="text-[8px] font-bold text-blue-700">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-900">{m.title}</span>
                                <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">{m.targetDate}</span>
                              </div>
                              <p className="text-[10px] text-gray-500">{m.criteria}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Risks */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{ko ? "리스크 & 대응" : "Risks"}</span>
                  </div>
                  <div className="space-y-2.5">
                    {strategy.risks.map((r, i) => (
                      <div key={i} className="flex gap-2.5">
                        <div className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                          <AlertTriangle size={8} className="text-red-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-semibold text-gray-800">{r.risk}</p>
                            {r.impact && (
                              <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded-full border", impactColor[r.impact] || impactColor.medium)}>
                                {r.impact === 'high' ? '높음' : r.impact === 'medium' ? '보통' : '낮음'}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500">{ko ? "대응" : "Response"}: {r.mitigation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
