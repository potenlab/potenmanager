// ─── AI Assistant Sidebar ─────────────────────────────────────────────
// Right sidebar for detail pages. Provides AI features like decompose,
// describe, recommend, and resource search.

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Layers,
  AlignLeft,
  Flag,
  Link2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Globe,
  FileText,
  BookOpen,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api";
import { useLibrary, LibraryItem } from "../context/LibraryContext";
import { TASK_CATEGORY_CONFIG } from "../../lib/jobRoles";
import { TaskCategory } from "../../lib/mockData";

// ─── Types ───────────────────────────────────────────────────────────
type AIFeature = "decompose" | "describe" | "recommend" | "resources" | null;

interface SubtaskResult {
  title: string;
  titleEn: string;
  estimatedMinutes: number;
  priority: string;
  checked: boolean;
}
interface RecommendResult {
  priority: string;
  category: string;
  reasoning: string;
}
interface ExternalResource {
  title: string;
  description: string;
  type: string;
  suggestedUrl?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; labelKo: string; color: string; bg: string }> = {
  low: { label: "Low", labelKo: "낮음", color: "text-blue-600", bg: "bg-blue-50" },
  medium: { label: "Medium", labelKo: "보통", color: "text-amber-600", bg: "bg-amber-50" },
  high: { label: "High", labelKo: "높음", color: "text-red-600", bg: "bg-red-50" },
};

// ─── Feature configs ─────────────────────────────────────────────────
const ALL_FEATURES: {
  key: Exclude<AIFeature, null>;
  label: string;
  labelKo: string;
  icon: React.ReactNode;
  description: string;
  descriptionKo: string;
}[] = [
  { key: "decompose", label: "Decompose", labelKo: "업무 분해", icon: <Layers size={14} />, description: "Break into subtasks", descriptionKo: "하위 작업으로 분해" },
  { key: "describe", label: "Description", labelKo: "설명 작성", icon: <AlignLeft size={14} />, description: "Generate description", descriptionKo: "설명 자동 생성" },
  { key: "recommend", label: "Recommend", labelKo: "추천", icon: <Flag size={14} />, description: "Priority & category", descriptionKo: "우선순위 & 카테고리" },
  { key: "resources", label: "Resources", labelKo: "관련 자료", icon: <Link2 size={14} />, description: "Find related resources", descriptionKo: "관련 자료 검색" },
];

// ─── Props ────────────────────────────────────────────────────────────
export interface AiSidebarProps {
  /** Entity title for AI context */
  title: string;
  /** Existing description */
  description?: string;
  /** Entity type determines which features are available */
  entityType: "task" | "goal" | "radar" | "library" | "meeting";
  /** Language */
  language: string;
  /** Which features to show. If omitted, inferred from entityType */
  enabledFeatures?: Exclude<AIFeature, null>[];

  // ── Task-specific ──
  taskCategory?: string;
  taskPriority?: string;
  onAddSubtasks?: (subtasks: SubtaskResult[]) => void;
  onApplyDescription?: (desc: string) => void;
  onApplyPriority?: (p: string) => void;
  onApplyCategory?: (c: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────
export function AiAssistantSidebar(props: AiSidebarProps) {
  const {
    title, description = "", entityType, language,
    taskCategory, taskPriority,
    onAddSubtasks, onApplyDescription, onApplyPriority, onApplyCategory,
  } = props;

  const { items: libraryItems } = useLibrary();
  const ko = language === "ko";

  const [isOpen, setIsOpen] = useState(true);
  const [activeFeature, setActiveFeature] = useState<AIFeature>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [subtasks, setSubtasks] = useState<SubtaskResult[] | null>(null);
  const [generatedDesc, setGeneratedDesc] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [libraryMatches, setLibraryMatches] = useState<LibraryItem[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [externalSearchEnabled, setExternalSearchEnabled] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);

  // Determine enabled features
  const enabledFeatures = props.enabledFeatures || getDefaultFeatures(entityType);
  const features = ALL_FEATURES.filter(f => enabledFeatures.includes(f.key));

  // ── Handlers ──
  const handleFeatureClick = async (feature: Exclude<AIFeature, null>) => {
    if (feature === activeFeature) { setActiveFeature(null); return; }
    setActiveFeature(feature);
    setError(null);

    if (feature === "resources") {
      const keywords = title.toLowerCase().split(/[\s,./·\-_]+/).filter(w => w.length > 1);
      const matches = libraryItems.filter(item => {
        const text = `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
        return keywords.some(kw => text.includes(kw));
      }).slice(0, 8);
      setLibraryMatches(matches);
      setExternalResources([]);
      return;
    }

    if (!title.trim()) return;
    setIsLoading(true);
    try {
      if (feature === "decompose") {
        const res = await api.aiDecomposeTask({
          taskTitle: title,
          taskDescription: description || undefined,
          taskCategory: taskCategory,
        });
        setSubtasks((res.subtasks || []).map(s => ({ ...s, checked: true })));
      } else if (feature === "describe") {
        const res = await api.aiDescribeTask({
          taskTitle: title,
          taskCategory: taskCategory,
          taskPriority: taskPriority,
          existingDescription: description || undefined,
        });
        setGeneratedDesc(res.description);
      } else if (feature === "recommend") {
        const res = await api.aiRecommendTask({
          taskTitle: title,
          taskDescription: description || undefined,
          availableCategories: Object.keys(TASK_CATEGORY_CONFIG),
        });
        setRecommendation(res);
      }
    } catch (e: any) {
      setError(e.message || "AI request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExternalSearch = useCallback(async () => {
    setExternalLoading(true);
    try {
      const res = await api.aiSearchExternal({ query: title, language });
      setExternalResources(res.resources || []);
    } catch { /* ignore */ } finally {
      setExternalLoading(false);
    }
  }, [title, language]);

  useEffect(() => {
    if (externalSearchEnabled && activeFeature === "resources") handleExternalSearch();
  }, [externalSearchEnabled]);

  const toggleSubtask = (idx: number) => {
    setSubtasks(prev => prev?.map((s, i) => i === idx ? { ...s, checked: !s.checked } : s) || null);
  };

  if (!title.trim()) return null;

  // ── Collapsed state: floating toggle ──
  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center pt-8">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          title={ko ? "AI 어시스턴트 열기" : "Open AI Assistant"}
        >
          <Sparkles size={18} />
        </button>
        <span className="text-[10px] text-gray-400 mt-2 font-medium writing-mode-vertical hidden xl:block"
          style={{ writingMode: 'vertical-rl' }}>
          AI
        </span>
      </div>
    );
  }

  // ── Expanded sidebar ──
  return (
    <div className="hidden lg:block w-[300px] shrink-0">
      <div className="sticky top-6">
        <div className="rounded-2xl border border-blue-100/80 bg-gradient-to-b from-blue-50/60 to-indigo-50/30 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-blue-100/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100/80">
                <Sparkles size={14} className="text-blue-600" />
              </div>
              <span className="text-xs font-bold text-blue-700">
                {ko ? "AI 어시스턴트" : "AI Assistant"}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition-colors"
              title={ko ? "사이드바 닫기" : "Close sidebar"}
            >
              <PanelRightClose size={16} />
            </button>
          </div>

          {/* Feature buttons */}
          <div className="p-3 space-y-1.5">
            {features.map(f => (
              <button
                key={f.key}
                onClick={() => handleFeatureClick(f.key)}
                disabled={isLoading && activeFeature !== f.key}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                  activeFeature === f.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white/60 text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100",
                  isLoading && activeFeature !== f.key && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg shrink-0",
                  activeFeature === f.key ? "bg-blue-500" : "bg-gray-100"
                )}>
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{ko ? f.labelKo : f.label}</div>
                  <div className={cn("text-[10px] truncate", activeFeature === f.key ? "text-blue-200" : "text-gray-400")}>
                    {ko ? f.descriptionKo : f.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Result panel */}
          <AnimatePresence>
            {activeFeature && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 pt-1 border-t border-blue-100/60">
                  {isLoading ? (
                    <div className="flex items-center gap-2 py-8 justify-center text-blue-500">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-xs font-medium">{ko ? "AI 분석 중..." : "Analyzing..."}</span>
                    </div>
                  ) : error ? (
                    <div className="py-4 space-y-2">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle size={14} />
                        <span className="text-xs flex-1">{error}</span>
                      </div>
                      <button
                        onClick={() => handleFeatureClick(activeFeature)}
                        className="w-full text-xs text-blue-600 hover:bg-white/60 py-1.5 rounded-lg transition-colors"
                      >
                        {ko ? "재시도" : "Retry"}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Decompose */}
                      {activeFeature === "decompose" && subtasks && (
                        <DecomposeResults
                          subtasks={subtasks}
                          ko={ko}
                          onToggle={toggleSubtask}
                          onRegenerate={() => handleFeatureClick("decompose")}
                          onApply={() => {
                            onAddSubtasks?.(subtasks.filter(s => s.checked));
                            setActiveFeature(null);
                          }}
                        />
                      )}

                      {/* Describe */}
                      {activeFeature === "describe" && generatedDesc && (
                        <DescribeResults
                          description={generatedDesc}
                          hasExisting={!!description}
                          ko={ko}
                          onRegenerate={() => handleFeatureClick("describe")}
                          onApply={() => {
                            onApplyDescription?.(generatedDesc);
                            setActiveFeature(null);
                          }}
                        />
                      )}

                      {/* Recommend */}
                      {activeFeature === "recommend" && recommendation && (
                        <RecommendResults
                          recommendation={recommendation}
                          ko={ko}
                          onApply={() => {
                            onApplyPriority?.(recommendation.priority);
                            if (recommendation.category) onApplyCategory?.(recommendation.category);
                            setActiveFeature(null);
                          }}
                        />
                      )}

                      {/* Resources */}
                      {activeFeature === "resources" && (
                        <ResourcesResults
                          libraryMatches={libraryMatches}
                          externalResources={externalResources}
                          externalSearchEnabled={externalSearchEnabled}
                          externalLoading={externalLoading}
                          ko={ko}
                          onToggleExternal={() => setExternalSearchEnabled(!externalSearchEnabled)}
                        />
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile toggle button (to be used alongside the sidebar) ─────────
export function AiSidebarMobileToggle({
  isOpen, onToggle, language,
}: {
  isOpen: boolean; onToggle: () => void; language: string;
}) {
  const ko = language === "ko";
  return (
    <button
      onClick={onToggle}
      className="lg:hidden fixed bottom-24 right-4 z-50 p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl transition-all"
      title={ko ? "AI 어시스턴트" : "AI Assistant"}
    >
      {isOpen ? <X size={20} /> : <Sparkles size={20} />}
    </button>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function DecomposeResults({
  subtasks, ko, onToggle, onRegenerate, onApply,
}: {
  subtasks: SubtaskResult[]; ko: boolean;
  onToggle: (idx: number) => void; onRegenerate: () => void; onApply: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500">
        {ko ? `${subtasks.length}개의 하위 작업` : `${subtasks.length} subtasks`}
      </p>
      <div className="max-h-[280px] overflow-y-auto space-y-1 scrollbar-hide">
        {subtasks.map((s, i) => (
          <div key={i} className="flex items-start gap-2 bg-white/70 rounded-lg px-2.5 py-2">
            <button onClick={() => onToggle(i)} className={cn(
              "shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all mt-0.5",
              s.checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
            )}>
              {s.checked && <Check size={10} className="text-white" strokeWidth={3} />}
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-700 leading-tight">{ko ? s.title : s.titleEn}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[9px] text-gray-400">{s.estimatedMinutes}min</span>
                <span className={cn(
                  "text-[9px] font-bold px-1 py-0.5 rounded",
                  s.priority === "high" ? "bg-red-50 text-red-600" :
                  s.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                )}>{s.priority}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onRegenerate} className="flex-1 px-2 py-1.5 text-[10px] text-gray-500 hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1">
          <RefreshCw size={10} />{ko ? "재생성" : "Redo"}
        </button>
        <button
          onClick={onApply}
          disabled={!subtasks.some(s => s.checked)}
          className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {ko ? "추가" : "Add"} ({subtasks.filter(s => s.checked).length})
        </button>
      </div>
    </div>
  );
}

function DescribeResults({
  description, hasExisting, ko, onRegenerate, onApply,
}: {
  description: string; hasExisting: boolean; ko: boolean;
  onRegenerate: () => void; onApply: () => void;
}) {
  return (
    <div className="space-y-2">
      {hasExisting && (
        <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
          {ko ? "⚠ 기존 설명을 대체합니다" : "⚠ Replaces existing description"}
        </p>
      )}
      <div className="bg-white/70 rounded-lg p-2.5 text-xs text-gray-700 whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed scrollbar-hide">
        {description}
      </div>
      <div className="flex gap-2">
        <button onClick={onRegenerate} className="flex-1 px-2 py-1.5 text-[10px] text-gray-500 hover:bg-white rounded-lg transition-colors flex items-center justify-center gap-1">
          <RefreshCw size={10} />{ko ? "재생성" : "Redo"}
        </button>
        <button onClick={onApply} className="flex-1 px-2 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
          {ko ? "적용" : "Apply"}
        </button>
      </div>
    </div>
  );
}

function RecommendResults({
  recommendation, ko, onApply,
}: {
  recommendation: RecommendResult; ko: boolean; onApply: () => void;
}) {
  const pCfg = PRIORITY_CONFIG[recommendation.priority];
  const cCfg = recommendation.category ? TASK_CATEGORY_CONFIG[recommendation.category as TaskCategory] : null;

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <div className="bg-white/70 rounded-lg px-2.5 py-2 flex items-center gap-2">
          <span className="text-[9px] text-gray-400 uppercase font-bold shrink-0">{ko ? "우선순위" : "Priority"}</span>
          {pCfg && (
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", pCfg.bg, pCfg.color)}>
              {ko ? pCfg.labelKo : pCfg.label}
            </span>
          )}
        </div>
        {cCfg && (
          <div className="bg-white/70 rounded-lg px-2.5 py-2 flex items-center gap-2">
            <span className="text-[9px] text-gray-400 uppercase font-bold shrink-0">{ko ? "카테고리" : "Category"}</span>
            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1", cCfg.bg, cCfg.color)}>
              {cCfg.icon} {ko ? cCfg.labelKo : cCfg.label}
            </span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 bg-white/50 rounded-lg px-2.5 py-2 leading-relaxed">
        {recommendation.reasoning}
      </p>
      <button onClick={onApply} className="w-full px-2 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
        {ko ? "적용" : "Apply"}
      </button>
    </div>
  );
}

function ResourcesResults({
  libraryMatches, externalResources, externalSearchEnabled, externalLoading, ko, onToggleExternal,
}: {
  libraryMatches: LibraryItem[]; externalResources: ExternalResource[];
  externalSearchEnabled: boolean; externalLoading: boolean;
  ko: boolean; onToggleExternal: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Library matches */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1">
          <BookOpen size={10} /> {ko ? "내 아카이브" : "My Archive"} ({libraryMatches.length})
        </p>
        {libraryMatches.length === 0 ? (
          <p className="text-[10px] text-gray-400 italic px-1">{ko ? "매칭 없음" : "No matches"}</p>
        ) : (
          <div className="space-y-1 max-h-[160px] overflow-y-auto scrollbar-hide">
            {libraryMatches.map(item => (
              <a
                key={item.id}
                href={item.type === "url" ? item.url : `/library/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/70 rounded-lg px-2.5 py-2 hover:bg-white transition-colors group"
              >
                {item.type === "url"
                  ? <Globe size={12} className="text-blue-500 shrink-0" />
                  : <FileText size={12} className="text-violet-500 shrink-0" />}
                <span className="flex-1 text-[11px] text-gray-700 truncate">{item.title}</span>
                <ExternalLink size={10} className="text-gray-300 group-hover:text-blue-500 shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* External search toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleExternal}
          className={cn(
            "relative w-8 h-4 rounded-full transition-colors shrink-0",
            externalSearchEnabled ? "bg-blue-600" : "bg-gray-300"
          )}
        >
          <div className={cn(
            "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
            externalSearchEnabled ? "translate-x-4" : "translate-x-0.5"
          )} />
        </button>
        <span className="text-[10px] text-gray-500">{ko ? "외부 검색" : "External search"}</span>
        {externalLoading && <Loader2 size={12} className="animate-spin text-blue-500" />}
      </div>

      {/* External results */}
      {externalSearchEnabled && externalResources.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex items-center gap-1">
            <Globe size={10} /> {ko ? "외부 자료" : "External"} ({externalResources.length})
          </p>
          <div className="space-y-1 max-h-[160px] overflow-y-auto scrollbar-hide">
            {externalResources.map((r, i) => (
              <div key={i} className="bg-white/70 rounded-lg px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[8px] font-bold px-1 py-0.5 rounded uppercase",
                    r.type === "tool" ? "bg-emerald-50 text-emerald-600" :
                    r.type === "template" ? "bg-purple-50 text-purple-600" :
                    r.type === "reference" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  )}>{r.type}</span>
                  {r.suggestedUrl ? (
                    <a href={r.suggestedUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-blue-600 hover:underline truncate">
                      {r.title}
                    </a>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-700 truncate">{r.title}</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────
function getDefaultFeatures(entityType: string): Exclude<AIFeature, null>[] {
  switch (entityType) {
    case "task":
      return ["decompose", "describe", "recommend", "resources"];
    case "goal":
      return ["describe", "resources"];
    case "radar":
      return ["describe", "resources"];
    case "library":
      return ["resources"];
    case "meeting":
      return ["describe", "resources"];
    default:
      return ["resources"];
  }
}
