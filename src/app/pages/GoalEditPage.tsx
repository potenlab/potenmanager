import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Sparkles,
  Pencil,
  Check,
  X,
  Trash2,
  Plus,
  Target,
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

export function GoalEditPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { goals, urgentGoals, addGoal, updateGoal, removeGoal } = useGoalContext();

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

  // Editing state
  const [editingCore, setEditingCore] = useState(false);
  const [coreValue, setCoreValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saved, setSaved] = useState(false);

  // Adding new category state
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");

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
          onClick={() => navigate("/goals/setup")}
          className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Sparkles size={16} />
          {ko ? "목표 설정하기" : "Set Goals"}
        </button>
      </div>
    );
  }

  const handleSaveCore = () => {
    if (!coreValue.trim()) return;
    updateGoal(coreGoal.id, { title: coreValue.trim(), titleKo: coreValue.trim() });
    setEditingCore(false);
    flashSaved();
  };

  const handleSaveCategory = (goalId: string, oldTitle: string) => {
    if (!editValue.trim()) return;
    const { label } = parseGoalTitle(oldTitle);
    const newTitle = label ? `${label}: ${editValue.trim()}` : editValue.trim();
    updateGoal(goalId, { title: newTitle, titleKo: newTitle });
    setEditingId(null);
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
      status: "not-started",
      parentId: coreGoal.id,
      isUrgent: true,
      urgentCategory: cat.urgentCategory as GoalItem["urgentCategory"],
    };
    addGoal(newGoal);
    setAddingKey(null);
    setAddValue("");
    flashSaved();
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/goals")}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            {ko ? "목표 수정" : "Edit Goals"}
          </h1>
          <p className="text-xs text-gray-400">
            {ko ? "핵심 목표와 세부 항목을 수정하세요" : "Edit your core goal and categories"}
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <p className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
            <Sparkles size={12} />
            {ko ? `${new Date().getFullYear()}년 핵심 목표` : `${new Date().getFullYear()} Core Goal`}
          </p>
        </div>
        <div className="px-5 py-4">
          {editingCore ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={coreValue}
                onChange={(e) => setCoreValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCore();
                  if (e.key === "Escape") setEditingCore(false);
                }}
                className="flex-1 text-base font-semibold text-gray-900 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleSaveCore}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setEditingCore(false)}
                className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 group cursor-pointer rounded-xl px-1 -mx-1 py-1 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setCoreValue(ko ? (coreGoal.titleKo || coreGoal.title) : coreGoal.title);
                setEditingCore(true);
              }}
            >
              <p className="text-base font-bold text-gray-900 flex-1">
                {ko ? (coreGoal.titleKo || coreGoal.title) : coreGoal.title}
              </p>
              <Pencil size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Category Goals */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500">
            {ko ? "세부 항목" : "Categories"}
          </p>
          <span className="text-[10px] text-gray-400">
            {categoryGoals.length}{ko ? "개" : " items"}
          </span>
        </div>

        {categoryGoals.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-400 mb-3">
              {ko ? "세부 항목이 없습니다" : "No category goals"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {categoryGoals.map((goal) => {
              const title = ko ? (goal.titleKo || goal.title) : goal.title;
              const { label, value } = parseGoalTitle(title);
              const meta = META_BY_LABEL[label];
              const isEditing = editingId === goal.id;

              return (
                <div key={goal.id} className="px-5 py-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      {label && (
                        <span className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-lg shrink-0",
                          meta?.colorBg || "bg-gray-50",
                          meta?.colorText || "text-gray-600"
                        )}>
                          {meta?.emoji} {label}
                        </span>
                      )}
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCategory(goal.id, title);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200"
                      />
                      <button
                        onClick={() => handleSaveCategory(goal.id, title)}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 group">
                      <span className="text-lg shrink-0">{meta?.emoji || "📋"}</span>
                      <div className="flex-1 min-w-0">
                        {label && (
                          <p className={cn("text-[11px] font-medium", meta?.colorText || "text-gray-500")}>
                            {label}
                          </p>
                        )}
                        <p className="text-sm text-gray-900 truncate">{value}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditValue(value);
                          setEditingId(goal.id);
                        }}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(goal.id)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unselected Categories — Add new */}
      {unusedCategories.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500">
              {ko ? "항목 추가하기" : "Add Categories"}
            </p>
          </div>
          <div className="px-5 py-3 space-y-2">
            {unusedCategories.map((cat) => {
              const isAdding = addingKey === cat.key;
              return (
                <div key={cat.key}>
                  {isAdding ? (
                    <div className="flex items-center gap-2 py-1">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-1 rounded-lg shrink-0",
                        cat.colorBg, cat.colorText
                      )}>
                        {cat.emoji} {ko ? cat.labelKo : cat.labelEn}
                      </span>
                      <input
                        autoFocus
                        value={addValue}
                        onChange={(e) => setAddValue(e.target.value)}
                        placeholder={ko ? cat.placeholderKo : cat.placeholderEn}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCategory(cat);
                          if (e.key === "Escape") { setAddingKey(null); setAddValue(""); }
                        }}
                        className="flex-1 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200"
                      />
                      <button
                        onClick={() => handleAddCategory(cat)}
                        disabled={!addValue.trim()}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => { setAddingKey(null); setAddValue(""); }}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingKey(cat.key); setAddValue(""); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
                    >
                      <span className="text-lg shrink-0">{cat.emoji}</span>
                      <span className="text-sm text-gray-500 flex-1">
                        {ko ? cat.labelKo : cat.labelEn}
                      </span>
                      <Plus size={14} className="text-gray-300" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/goals/setup")}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <Plus size={16} />
          {ko ? "처음부터 다시 설정" : "Redo Setup"}
        </button>
        <button
          onClick={() => navigate("/goals")}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Check size={16} />
          {ko ? "완료" : "Done"}
        </button>
      </div>
    </div>
  );
}
