import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useGoalContext } from "../context/GoalContext";
import type { GoalItem } from "../../lib/mockData";

// ─── Category definition ────────────────────────────────────────────
type CategoryKey =
  | "revenue"
  | "funding"
  | "customers"
  | "partnerships"
  | "team"
  | "market"
  | "brand"
  | "other"
  | "custom";

interface Category {
  key: CategoryKey;
  emoji: string;
  labelKo: string;
  labelEn: string;
  color: string;          // tailwind ring/border
  colorBg: string;        // tailwind bg for selected state
  colorText: string;      // tailwind text color
  questionKo: string;
  questionEn: string;
  inputType: "text" | "number" | "choice";
  placeholderKo: string;
  placeholderEn: string;
  choices?: { ko: string; en: string }[];
  urgentCategory: GoalItem["urgentCategory"];
}

const CATEGORIES: Category[] = [
  {
    key: "revenue",
    emoji: "💰",
    labelKo: "매출",
    labelEn: "Revenue",
    color: "ring-emerald-400",
    colorBg: "bg-emerald-50 dark:bg-emerald-950/30",
    colorText: "text-emerald-600 dark:text-emerald-400",
    questionKo: "올해 매출 목표는 얼마인가요?",
    questionEn: "What is your revenue target this year?",
    inputType: "text",
    placeholderKo: "예: 10억원",
    placeholderEn: "e.g. $1M",
    urgentCategory: "funding",
  },
  {
    key: "funding",
    emoji: "📈",
    labelKo: "투자",
    labelEn: "Funding",
    color: "ring-orange-400",
    colorBg: "bg-orange-50 dark:bg-orange-950/30",
    colorText: "text-orange-600 dark:text-orange-400",
    questionKo: "어떤 단계의 투자를 목표로 하나요?",
    questionEn: "What funding stage are you targeting?",
    inputType: "choice",
    placeholderKo: "",
    placeholderEn: "",
    choices: [
      { ko: "시드", en: "Seed" },
      { ko: "Pre-A", en: "Pre-A" },
      { ko: "시리즈 A", en: "Series A" },
      { ko: "시리즈 B", en: "Series B" },
    ],
    urgentCategory: "investment",
  },
  {
    key: "customers",
    emoji: "👥",
    labelKo: "고객확보",
    labelEn: "Customers",
    color: "ring-blue-400",
    colorBg: "bg-blue-50 dark:bg-blue-950/30",
    colorText: "text-blue-600 dark:text-blue-400",
    questionKo: "올해 고객 몇 명을 확보하고 싶나요?",
    questionEn: "How many customers do you want to acquire this year?",
    inputType: "number",
    placeholderKo: "예: 1000",
    placeholderEn: "e.g. 1000",
    urgentCategory: "other",
  },
  {
    key: "partnerships",
    emoji: "🤝",
    labelKo: "협약",
    labelEn: "Partnerships",
    color: "ring-teal-400",
    colorBg: "bg-teal-50 dark:bg-teal-950/30",
    colorText: "text-teal-600 dark:text-teal-400",
    questionKo: "올해 체결하고 싶은 협약은?",
    questionEn: "What partnerships do you want to close this year?",
    inputType: "text",
    placeholderKo: "예: 대기업 MOU 3건",
    placeholderEn: "e.g. 3 enterprise MOUs",
    urgentCategory: "contract",
  },
  {
    key: "team",
    emoji: "👤",
    labelKo: "채용/팀원",
    labelEn: "Hiring/Team",
    color: "ring-pink-400",
    colorBg: "bg-pink-50 dark:bg-pink-950/30",
    colorText: "text-pink-600 dark:text-pink-400",
    questionKo: "팀을 몇 명으로 키우고 싶나요?",
    questionEn: "How many team members do you want to grow to?",
    inputType: "number",
    placeholderKo: "예: 15",
    placeholderEn: "e.g. 15",
    urgentCategory: "other",
  },
  {
    key: "market",
    emoji: "🌍",
    labelKo: "판로확보",
    labelEn: "Market",
    color: "ring-indigo-400",
    colorBg: "bg-indigo-50 dark:bg-indigo-950/30",
    colorText: "text-indigo-600 dark:text-indigo-400",
    questionKo: "어떤 시장에 진출하고 싶나요?",
    questionEn: "Which markets do you want to enter?",
    inputType: "text",
    placeholderKo: "예: 일본, 동남아",
    placeholderEn: "e.g. Japan, Southeast Asia",
    urgentCategory: "other",
  },
  {
    key: "brand",
    emoji: "⭐",
    labelKo: "브랜딩",
    labelEn: "Branding",
    color: "ring-yellow-400",
    colorBg: "bg-yellow-50 dark:bg-yellow-950/30",
    colorText: "text-yellow-600 dark:text-yellow-400",
    questionKo: "올해 브랜드 목표는?",
    questionEn: "What is your brand goal this year?",
    inputType: "text",
    placeholderKo: "예: 인지도 2배 향상",
    placeholderEn: "e.g. Double brand awareness",
    urgentCategory: "other",
  },
  {
    key: "other",
    emoji: "📣",
    labelKo: "마케팅",
    labelEn: "Marketing",
    color: "ring-rose-400",
    colorBg: "bg-rose-50 dark:bg-rose-950/30",
    colorText: "text-rose-600 dark:text-rose-400",
    questionKo: "올해 마케팅 목표는 무엇인가요?",
    questionEn: "What is your marketing goal this year?",
    inputType: "text",
    placeholderKo: "예: SNS 팔로워 1만명 달성",
    placeholderEn: "e.g. Reach 10K social media followers",
    urgentCategory: "other",
  },
  {
    key: "custom",
    emoji: "➕",
    labelKo: "기타",
    labelEn: "Other",
    color: "ring-gray-400",
    colorBg: "bg-gray-50 dark:bg-gray-950/30",
    colorText: "text-gray-600 dark:text-gray-400",
    questionKo: "추가하고 싶은 목표가 있나요?",
    questionEn: "Any other goal you'd like to add?",
    inputType: "text",
    placeholderKo: "예: 특허 출원 2건",
    placeholderEn: "e.g. File 2 patents",
    urgentCategory: "other",
  },
];

// ─── Shared animation variants ──────────────────────────────────────
const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};
const pageTransition = { type: "spring", stiffness: 300, damping: 30 };

// ─── ID helper ──────────────────────────────────────────────────────
const uid = () => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ═════════════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════════════
export default function GoalSetupWizardPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { addGoal, removeGoal, goals, urgentGoals } = useGoalContext();
  const ko = language === "ko";

  // wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 0
  const [coreGoal, setCoreGoal] = useState("");

  // Step 1
  const [selectedKeys, setSelectedKeys] = useState<Set<CategoryKey>>(new Set());

  // Step 2 – ordered list of selected categories & current sub-index
  const [categoryValues, setCategoryValues] = useState<Record<CategoryKey, string>>({} as any);
  const [customLabel, setCustomLabel] = useState("");
  const [subIndex, setSubIndex] = useState(0);

  // derived
  const selectedCategories = CATEGORIES.filter((c) => selectedKeys.has(c.key));

  // ─── navigation helpers ─────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => s + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => s - 1);
  }, []);

  // ─── toggle category ───────────────────────────────────────────
  const toggleCategory = (key: CategoryKey) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ─── Step 2 sub-navigation ────────────────────────────────────
  const currentCategory = selectedCategories[subIndex] as Category | undefined;

  const handleSubNext = () => {
    if (subIndex < selectedCategories.length - 1) {
      setDirection(1);
      setSubIndex((i) => i + 1);
    } else {
      // done with all categories → save & go to completion
      saveGoals();
      goNext();
    }
  };

  const handleSubSkip = () => {
    // clear value for skipped category
    if (currentCategory) {
      setCategoryValues((prev) => ({ ...prev, [currentCategory.key]: "" }));
    }
    handleSubNext();
  };

  const handleSubBack = () => {
    if (subIndex > 0) {
      setDirection(-1);
      setSubIndex((i) => i - 1);
    } else {
      goBack();
    }
  };

  // ─── Save goals to context ───────────────────────────────────
  const saveGoals = () => {
    // Remove existing Year-level goals and their Urgent children
    const existingYearGoals = goals.filter((g) => g.level === "Year" && !g.parentId);
    for (const yg of existingYearGoals) {
      // Remove children first
      const children = urgentGoals.filter((g) => g.parentId === yg.id);
      for (const child of children) {
        removeGoal(child.id);
      }
      removeGoal(yg.id);
    }

    const coreId = uid();

    // Core goal (Year level)
    const coreGoalItem: GoalItem = {
      id: coreId,
      title: coreGoal,
      titleKo: coreGoal,
      level: "Year",
      progress: 0,
      status: "pending",
      children: [],
    };
    addGoal(coreGoalItem);

    // Category goals (Urgent level)
    for (const cat of selectedCategories) {
      const val = categoryValues[cat.key]?.trim();
      if (!val) continue;

      const label = cat.key === "custom" && customLabel.trim()
        ? customLabel.trim()
        : (ko ? cat.labelKo : cat.labelEn);
      const labelKo = cat.key === "custom" && customLabel.trim()
        ? customLabel.trim()
        : cat.labelKo;
      const goalItem: GoalItem = {
        id: uid(),
        title: `${label}: ${val}`,
        titleKo: `${labelKo}: ${val}`,
        level: "Urgent",
        progress: 0,
        status: "pending",
        parentId: coreId,
        urgentCategory: cat.urgentCategory,
        isUrgent: true,
      };
      addGoal(goalItem);
      coreGoalItem.children!.push(goalItem.id);
    }
  };

  // ─── Set category value helper ────────────────────────────────
  const setCatVal = (key: CategoryKey, val: string) =>
    setCategoryValues((prev) => ({ ...prev, [key]: val }));

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      {/* top progress dots */}
      {step < 3 && (
        <div className="flex items-center justify-center gap-2 pt-8 pb-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step
                  ? "w-8 bg-black dark:bg-white"
                  : i < step
                    ? "w-4 bg-black/30 dark:bg-white/30"
                    : "w-4 bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>
      )}

      {/* back button */}
      {step > 0 && step < 3 && (
        <button
          onClick={step === 2 ? handleSubBack : goBack}
          className="self-start ml-6 mt-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
      )}

      {/* animated step content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ── Step 0: Core Goal ────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="w-full max-w-lg px-6 flex flex-col items-center text-center"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-snug">
                {ko
                  ? "가장 이루고 싶은\n딱 1가지 목표는 무엇인가요?"
                  : "What is the one goal\nyou want to achieve most?"}
              </h1>
              <p className="mt-3 text-gray-400 dark:text-gray-500 text-sm">
                {ko ? "한 줄로 적어보세요" : "Write it in one line"}
              </p>

              <input
                autoFocus
                type="text"
                value={coreGoal}
                onChange={(e) => setCoreGoal(e.target.value)}
                placeholder={
                  ko
                    ? "예: 시리즈 A 투자 유치"
                    : "e.g. Raise Series A funding"
                }
                className={cn(
                  "mt-10 w-full text-center text-xl font-medium",
                  "bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700",
                  "focus:border-black dark:focus:border-white",
                  "outline-none py-3 transition-colors",
                  "placeholder:text-gray-300 dark:placeholder:text-gray-600",
                  "text-gray-900 dark:text-white"
                )}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={!coreGoal.trim()}
                onClick={goNext}
                className={cn(
                  "mt-12 w-full max-w-xs py-4 rounded-2xl text-base font-semibold transition-all",
                  coreGoal.trim()
                    ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                    : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                )}
              >
                {ko ? "다음" : "Next"}
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 1: Category Selection ───────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="w-full max-w-lg px-6 flex flex-col items-center"
            >
              {/* Encouraging message */}
              <div className="mb-6 px-5 py-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 text-center">
                  "{coreGoal}" {ko ? "좋은 목표네요!" : "Great goal!"}
                </p>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center leading-snug">
                {ko
                  ? "그 목표를 달성하기 위해\n다음 항목을 선택하세요"
                  : "Select the areas you need\nto achieve that goal"}
              </h1>
              <p className="mt-2 text-gray-400 dark:text-gray-500 text-sm text-center">
                {ko
                  ? "해당하는 항목을 모두 선택하세요"
                  : "Select all that apply"}
              </p>

              {/* 4×2 grid */}
              <div className="mt-8 grid grid-cols-4 gap-3 w-full">
                {CATEGORIES.map((cat) => {
                  const selected = selectedKeys.has(cat.key);
                  return (
                    <motion.button
                      key={cat.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleCategory(cat.key)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1.5",
                        "py-5 rounded-2xl border-2 transition-all",
                        selected
                          ? cn(cat.colorBg, cat.color, "ring-2", cat.color)
                          : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:border-gray-200 dark:hover:border-gray-700"
                      )}
                    >
                      {/* check badge */}
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center",
                            "bg-black dark:bg-white"
                          )}
                        >
                          <Check className="w-3 h-3 text-white dark:text-black" />
                        </motion.div>
                      )}

                      <span className="text-2xl">{cat.emoji}</span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          selected
                            ? cat.colorText
                            : "text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {ko ? cat.labelKo : cat.labelEn}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={selectedKeys.size === 0}
                onClick={() => {
                  setSubIndex(0);
                  goNext();
                }}
                className={cn(
                  "mt-10 w-full max-w-xs py-4 rounded-2xl text-base font-semibold transition-all",
                  selectedKeys.size > 0
                    ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                    : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                )}
              >
                {ko ? "다음" : "Next"}
              </motion.button>
            </motion.div>
          )}

          {/* ── Step 2: Category Detail (one at a time) ──────── */}
          {step === 2 && currentCategory && (
            <motion.div
              key={`step2-${currentCategory.key}`}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="w-full max-w-lg px-6 flex flex-col items-center"
            >
              {/* sub-progress */}
              <div className="w-full flex items-center gap-2 mb-10">
                {selectedCategories.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      i <= subIndex
                        ? "bg-black dark:bg-white"
                        : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                ))}
                <span className="ml-2 text-xs text-gray-400 tabular-nums">
                  {subIndex + 1}/{selectedCategories.length}
                </span>
              </div>

              {/* emoji + question */}
              <span className="text-5xl mb-4">{currentCategory.emoji}</span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center leading-snug">
                {ko ? currentCategory.questionKo : currentCategory.questionEn}
              </h2>

              {/* input area */}
              <div className="mt-8 w-full space-y-4">
                {/* Custom category: label input */}
                {currentCategory.key === "custom" && (
                  <input
                    autoFocus
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder={
                      ko
                        ? "항목 이름 (예: 기술개발, 특허, 교육)"
                        : "Category name (e.g. R&D, Patents, Training)"
                    }
                    className={cn(
                      "w-full text-center text-lg font-medium",
                      "bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700",
                      "focus:border-black dark:focus:border-white",
                      "outline-none py-3 transition-colors",
                      "placeholder:text-gray-300 dark:placeholder:text-gray-600",
                      "text-gray-900 dark:text-white"
                    )}
                  />
                )}

                {currentCategory.inputType === "choice" && currentCategory.choices ? (
                  <div className="grid grid-cols-2 gap-3">
                    {currentCategory.choices.map((ch) => {
                      const val = ko ? ch.ko : ch.en;
                      const selected = categoryValues[currentCategory.key] === val;
                      return (
                        <motion.button
                          key={val}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setCatVal(currentCategory.key, val)}
                          className={cn(
                            "py-4 rounded-2xl border-2 text-sm font-semibold transition-all",
                            selected
                              ? cn(
                                  currentCategory.colorBg,
                                  currentCategory.color,
                                  "ring-2",
                                  currentCategory.color,
                                  currentCategory.colorText
                                )
                              : "border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-700"
                          )}
                        >
                          {val}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    autoFocus={currentCategory.key !== "custom"}
                    type={currentCategory.inputType === "number" ? "number" : "text"}
                    value={categoryValues[currentCategory.key] ?? ""}
                    onChange={(e) => setCatVal(currentCategory.key, e.target.value)}
                    placeholder={
                      ko
                        ? currentCategory.placeholderKo
                        : currentCategory.placeholderEn
                    }
                    className={cn(
                      "w-full text-center text-xl font-medium",
                      "bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700",
                      "focus:border-black dark:focus:border-white",
                      "outline-none py-3 transition-colors",
                      "placeholder:text-gray-300 dark:placeholder:text-gray-600",
                      "text-gray-900 dark:text-white"
                    )}
                  />
                )}
              </div>

              {/* subtle note */}
              <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                {ko ? "나중에 수정할 수 있어요 😊" : "You can edit this later 😊"}
              </p>

              {/* buttons */}
              <div className="mt-10 flex gap-3 w-full max-w-xs">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubSkip}
                  className="flex-1 py-4 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {ko ? "건너뛰기" : "Skip"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={!categoryValues[currentCategory.key]?.trim() || (currentCategory.key === "custom" && !customLabel.trim())}
                  onClick={handleSubNext}
                  className={cn(
                    "flex-1 py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
                    categoryValues[currentCategory.key]?.trim() && (currentCategory.key !== "custom" || customLabel.trim())
                      ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                      : "bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed"
                  )}
                >
                  {ko ? "다음" : "Next"}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Completion ───────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="w-full max-w-lg px-6 flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                className="text-6xl mb-6"
              >
                🎉
              </motion.div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {ko ? "목표 설정 완료!" : "Goals Set!"}
              </h1>
              <p className="mt-2 text-gray-400 dark:text-gray-500 text-sm">
                {ko
                  ? "멋진 목표를 세우셨네요. 함께 달성해봐요!"
                  : "Great goals! Let's achieve them together!"}
              </p>

              {/* summary card */}
              <div className="mt-8 w-full rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-left space-y-4">
                {/* core goal */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    {ko ? "핵심 목표" : "Core Goal"}
                  </p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {coreGoal}
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800" />

                {/* category values */}
                <div className="space-y-3">
                  {selectedCategories.map((cat) => {
                    const val = categoryValues[cat.key]?.trim();
                    return (
                      <div key={cat.key} className="flex items-start gap-3">
                        <span className="text-lg">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs font-medium", cat.colorText)}>
                            {cat.key === "custom" && customLabel.trim() ? customLabel.trim() : (ko ? cat.labelKo : cat.labelEn)}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                            {val || "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* action buttons */}
              <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/organization")}
                  className="w-full py-4 rounded-2xl text-base font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
                >
                  {ko ? "내 조직으로 돌아가기" : "Go to my goals"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/")}
                  className="w-full py-4 rounded-2xl text-base font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {ko ? "대시보드로 이동" : "Go to Dashboard"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom spacing */}
      <div className="h-12" />
    </div>
  );
}

// Named export alias
export { GoalSetupWizardPage };
