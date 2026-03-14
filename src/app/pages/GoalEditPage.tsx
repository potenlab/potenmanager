import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useOrgPath } from "../hooks/useOrgPath";
import {
  ArrowLeft,
  Sparkles,
  Trash2,
  Plus,
  Target,
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useGoalContext } from "../context/GoalContext";
import type { GoalItem } from "../../lib/mockData";

// Full category list (mirrors wizard exactly)
interface CategoryDef {
  key: string;
  emoji: string;
  labelKo: string;
  labelEn: string;
  colorBg: string;
  colorText: string;
  urgentCategory: string;
  placeholderKo: string;
  placeholderEn: string;
}

const ALL_CATEGORIES: CategoryDef[] = [
  { key: "revenue", emoji: "💰", labelKo: "매출", labelEn: "Revenue", colorBg: "bg-emerald-50", colorText: "text-emerald-600", urgentCategory: "funding", placeholderKo: "예: 10억원", placeholderEn: "e.g. $1M" },
  { key: "funding", emoji: "📈", labelKo: "투자", labelEn: "Funding", colorBg: "bg-orange-50", colorText: "text-orange-600", urgentCategory: "investment", placeholderKo: "예: 시리즈 A", placeholderEn: "e.g. Series A" },
  { key: "customers", emoji: "👥", labelKo: "고객확보", labelEn: "Customers", colorBg: "bg-blue-50", colorText: "text-blue-600", urgentCategory: "other", placeholderKo: "예: 1000명", placeholderEn: "e.g. 1000" },
  { key: "partnerships", emoji: "🤝", labelKo: "협약", labelEn: "Partnerships", colorBg: "bg-teal-50", colorText: "text-teal-600", urgentCategory: "contract", placeholderKo: "예: 대기업 MOU 3건", placeholderEn: "e.g. 3 MOUs" },
  { key: "team", emoji: "👤", labelKo: "채용/팀원", labelEn: "Hiring/Team", colorBg: "bg-pink-50", colorText: "text-pink-600", urgentCategory: "other", placeholderKo: "예: 15명", placeholderEn: "e.g. 15" },
  { key: "market", emoji: "🌍", labelKo: "판로확보", labelEn: "Market", colorBg: "bg-indigo-50", colorText: "text-indigo-600", urgentCategory: "other", placeholderKo: "예: 일본, 동남아", placeholderEn: "e.g. Japan" },
  { key: "brand", emoji: "⭐", labelKo: "브랜딩", labelEn: "Branding", colorBg: "bg-yellow-50", colorText: "text-yellow-600", urgentCategory: "other", placeholderKo: "예: 인지도 2배 향상", placeholderEn: "e.g. Double awareness" },
  { key: "marketing", emoji: "📣", labelKo: "마케팅", labelEn: "Marketing", colorBg: "bg-rose-50", colorText: "text-rose-600", urgentCategory: "other", placeholderKo: "예: SNS 팔로워 1만명", placeholderEn: "e.g. 10K followers" },
];

// Build lookup by label
const META_BY_LABEL: Record<string, CategoryDef> = {};
for (const cat of ALL_CATEGORIES) {
  META_BY_LABEL[cat.labelKo] = cat;
  META_BY_LABEL[cat.labelEn] = cat;
}

// Parse "라벨: 값" format from goal title
function parseGoalTitle(title: string): { label: string; value: string } {
  const colonIdx = title.indexOf(":");
  if (colonIdx > 0) {
    return { label: title.slice(0, colonIdx).trim(), value: title.slice(colonIdx + 1).trim() };
  }
  return { label: "", value: title };
}

/* ── Inline editable field (Notion-style) ── */
function InlineField({
  value,
  placeholder,
  onSave,
  className,
  inputClassName,
}: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const savedRef = useRef(value);

  // Sync when external value changes
  useEffect(() => { setText(value); savedRef.current = value; }, [value]);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== savedRef.current) {
      onSave(trimmed);
      savedRef.current = trimmed;
    } else {
      setText(savedRef.current);
    }
  }, [text, onSave]);

  return (
    <input
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.currentTarget.blur(); }
        if (e.key === "Escape") { setText(savedRef.current); e.currentTarget.blur(); }
      }}
      placeholder={placeholder}
      className={cn(
        "bg-transparent outline-none w-full transition-all duration-150",
        "border-b-2",
        focused
          ? "border-blue-400"
          : "border-transparent hover:border-gray-200",
        className,
        inputClassName,
      )}
    />
  );
}

export function GoalEditPage() {
  const navigate = useNavigate();
  const p = useOrgPath();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { goals, urgentGoals, addGoal, updateGoal, removeGoal } = useGoalContext();
  const [saved, setSaved] = useState(false);

  // Adding new category state
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  // Focus input when adding new category
  useEffect(() => {
    if (addingKey && addRef.current) addRef.current.focus();
  }, [addingKey]);

  // Find core goal
  const coreGoal = useMemo(
    () => goals.find((g) => g.level === "Year" && !g.parentId),
    [goals]
  );

  // Category goals
  const categoryGoals = useMemo(
    () => (coreGoal ? urgentGoals.filter((g) => g.parentId === coreGoal.id) : []),
    [urgentGoals, coreGoal]
  );

  // Figure out which category keys are already set
  const usedCategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const goal of categoryGoals) {
      const title = goal.titleKo || goal.title;
      const { label } = parseGoalTitle(title);
      const meta = META_BY_LABEL[label];
      if (meta) keys.add(meta.key);
    }
    return keys;
  }, [categoryGoals]);

  // Unselected categories
  const unusedCategories = useMemo(
    () => ALL_CATEGORIES.filter((cat) => !usedCategoryKeys.has(cat.key)),
    [usedCategoryKeys]
  );

  // Core goal progress (auto-calculated from category goals)
  const coreProgress = useMemo(() => {
    if (categoryGoals.length === 0) return 0;
    const completed = categoryGoals.filter((g) => g.status === "completed").length;
    return Math.round((completed / categoryGoals.length) * 100);
  }, [categoryGoals]);

  const handleCategoryToggle = (goalId: string) => {
    const goal = categoryGoals.find((g) => g.id === goalId);
    if (!goal || !coreGoal) return;

    const isDone = goal.status === "completed";
    const newStatus = isDone ? "pending" : "completed";

    updateGoal(goalId, {
      status: newStatus,
      progress: isDone ? 0 : 100,
    });

    // Recalculate core goal progress
    const completedCount = categoryGoals.filter((g) =>
      g.id === goalId ? !isDone : g.status === "completed"
    ).length;
    const newProgress = Math.round((completedCount / categoryGoals.length) * 100);

    updateGoal(coreGoal.id, {
      progress: newProgress,
      status: newProgress === 100 ? "completed" : newProgress > 0 ? "in-progress" : "pending",
    });
    flashSaved();
  };

  // No goals → redirect to setup
  if (!coreGoal) {
    return (
      <div className="max-w-2xl mx-auto pt-16 px-4 text-center">
        <Target size={48} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {ko ? "설정된 목표가 없습니다" : "No goals set yet"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {ko ? "먼저 목표를 설정해주세요" : "Set your goals first"}
        </p>
        <button
          onClick={() => navigate(p("/organization/setup"))}
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Sparkles size={16} />
          {ko ? "목표 설정하기" : "Set Goals"}
        </button>
      </div>
    );
  }

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleSaveCore = (v: string) => {
    updateGoal(coreGoal.id, { title: v, titleKo: v });
    flashSaved();
  };

  const handleSaveCategory = (goalId: string, label: string, newValue: string) => {
    const newTitle = label ? `${label}: ${newValue}` : newValue;
    updateGoal(goalId, { title: newTitle, titleKo: newTitle });
    flashSaved();
  };

  const handleDeleteCategory = (goalId: string) => {
    removeGoal(goalId);
    flashSaved();
  };

  const handleAddCategory = (cat: CategoryDef) => {
    if (!addValue.trim()) return;
    const label = ko ? cat.labelKo : cat.labelEn;
    const title = `${label}: ${addValue.trim()}`;
    const newGoal: GoalItem = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      titleKo: `${cat.labelKo}: ${addValue.trim()}`,
      level: "Urgent",
      progress: 0,
      status: "pending",
      parentId: coreGoal.id,
      isUrgent: true,
      urgentCategory: cat.urgentCategory as GoalItem["urgentCategory"],
    };
    addGoal(newGoal);
    setAddingKey(null);
    setAddValue("");
    flashSaved();
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(p("/organization"))}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            {ko ? "목표 수정" : "Edit Goals"}
          </h1>
          <p className="text-xs text-gray-400">
            {ko ? "클릭해서 바로 수정하세요" : "Click any field to edit inline"}
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-in fade-in">
            <Check size={12} />
            {ko ? "저장됨" : "Saved"}
          </span>
        )}
      </div>

      {/* Core Goal */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-blue-500 flex items-center gap-1.5 mb-2 px-1">
          <Sparkles size={12} />
          {ko ? `${new Date().getFullYear()}년 핵심 목표` : `${new Date().getFullYear()} Core Goal`}
        </p>
        <InlineField
          value={ko ? (coreGoal.titleKo || coreGoal.title) : coreGoal.title}
          onSave={handleSaveCore}
          placeholder={ko ? "핵심 목표를 입력하세요" : "Enter your core goal"}
          className="text-xl font-bold text-gray-900 py-1.5 px-1"
        />
        {/* Progress bar */}
        {categoryGoals.length > 0 && (
          <div className="flex items-center gap-3 mt-3 px-1">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  coreProgress === 100 ? "bg-emerald-500" : "bg-[#0079FF]"
                )}
                style={{ width: `${coreProgress}%` }}
              />
            </div>
            <span className={cn(
              "text-xs font-bold min-w-[36px]",
              coreProgress === 100 ? "text-emerald-600" : "text-gray-500"
            )}>
              {coreProgress}%
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-6" />

      {/* Category Goals */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
          {ko ? "세부 항목" : "Categories"}{" "}
          <span className="text-gray-300 normal-case">({categoryGoals.length})</span>
        </p>

        {categoryGoals.length === 0 ? (
          <p className="text-sm text-gray-300 px-1 py-4">
            {ko ? "아래에서 항목을 추가하세요" : "Add categories below"}
          </p>
        ) : (
          <div className="space-y-1">
            {categoryGoals.map((goal) => {
              const title = ko ? (goal.titleKo || goal.title) : goal.title;
              const { label, value } = parseGoalTitle(title);
              const meta = META_BY_LABEL[label];

              return (
                <div key={goal.id} className="group flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <button
                    onClick={() => handleCategoryToggle(goal.id)}
                    className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                      goal.status === "completed"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-gray-300 hover:border-blue-400"
                    )}
                  >
                    {goal.status === "completed" && <Check size={12} />}
                  </button>
                  <span className="text-lg shrink-0">{meta?.emoji || "📋"}</span>
                  <span className={cn(
                    "text-xs font-semibold shrink-0 min-w-[52px]",
                    meta?.colorText || "text-gray-500"
                  )}>
                    {label}
                  </span>
                  <InlineField
                    value={value}
                    onSave={(v) => handleSaveCategory(goal.id, label, v)}
                    placeholder={meta ? (ko ? meta.placeholderKo : meta.placeholderEn) : ""}
                    className={cn(
                      "text-sm py-1 flex-1",
                      goal.status === "completed" ? "text-gray-400 line-through" : "text-gray-900"
                    )}
                  />
                  <button
                    onClick={() => handleDeleteCategory(goal.id)}
                    className="p-1 rounded-md text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unselected Categories — Add new */}
      {unusedCategories.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
            {ko ? "항목 추가" : "Add More"}
          </p>
          <div className="space-y-1">
            {unusedCategories.map((cat) => {
              const isAdding = addingKey === cat.key;
              return (
                <div key={cat.key}>
                  {isAdding ? (
                    <div className="flex items-center gap-3 py-2 px-1">
                      <span className="text-lg shrink-0">{cat.emoji}</span>
                      <span className={cn("text-xs font-semibold shrink-0 min-w-[52px]", cat.colorText)}>
                        {ko ? cat.labelKo : cat.labelEn}
                      </span>
                      <input
                        ref={addRef}
                        value={addValue}
                        onChange={(e) => setAddValue(e.target.value)}
                        placeholder={ko ? cat.placeholderKo : cat.placeholderEn}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCategory(cat);
                          if (e.key === "Escape") { setAddingKey(null); setAddValue(""); }
                        }}
                        onBlur={() => {
                          if (addValue.trim()) {
                            handleAddCategory(cat);
                          } else {
                            setAddingKey(null);
                            setAddValue("");
                          }
                        }}
                        className="flex-1 text-sm text-gray-900 py-1 bg-transparent outline-none border-b-2 border-blue-400 transition-all"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingKey(cat.key); setAddValue(""); }}
                      className="w-full flex items-center gap-3 py-2 px-1 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-lg shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">{cat.emoji}</span>
                      <span className={cn("text-xs font-semibold shrink-0 min-w-[52px] opacity-40 group-hover:opacity-70 transition-opacity", cat.colorText)}>
                        {ko ? cat.labelKo : cat.labelEn}
                      </span>
                      <span className="text-sm text-gray-300 flex-1 border-b-2 border-dashed border-gray-150 py-1">
                        {ko ? cat.placeholderKo : cat.placeholderEn}
                      </span>
                      <Plus size={14} className="text-gray-200 group-hover:text-blue-400 transition-colors shrink-0" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom action */}
      <div className="border-t border-gray-100 pt-4">
        <button
          onClick={() => navigate(p("/organization/setup"))}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
        >
          {ko ? "처음부터 다시 설정하기 →" : "Redo setup from scratch →"}
        </button>
      </div>
    </div>
  );
}
