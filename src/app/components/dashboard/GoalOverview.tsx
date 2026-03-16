import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  Flag, Milestone, Target, ArrowRight, CheckCircle2, Plus, X, Check,
  Calendar, Zap, Clock, AlertTriangle, Banknote, TrendingUp, FileText, CalendarClock,
} from "lucide-react";
import { startOfYear, endOfYear, isWithinInterval, format, differenceInDays } from "date-fns";
import { ko as koLocale } from "date-fns/locale";
import { cn } from "../../../lib/utils";
import { GoalItem, UrgentCategory } from "../../../lib/mockData";
import { useLanguage } from "../../context/LanguageContext";
import { useGoalContext } from "../../context/GoalContext";
import { usePermission } from "../../context/PermissionContext";
import { useTeam } from "../../context/TeamContext";
import { useOrgPath } from "../../hooks/useOrgPath";

// ─── Urgent Category Config ────────────────────────────────────────
const URGENT_CATEGORY_CONFIG: Record<UrgentCategory, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  funding: { icon: <Banknote size={11} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  investment: { icon: <TrendingUp size={11} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  contract: { icon: <FileText size={11} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  submission: { icon: <CalendarClock size={11} />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  event: { icon: <Calendar size={11} />, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  other: { icon: <Zap size={11} />, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
};

type TabType = "Year" | "Quarter" | "Month" | "Urgent";

const QUARTER_LABELS_KO = ["1분기", "2분기", "3분기", "4분기"];
const QUARTER_LABELS_EN = ["Q1", "Q2", "Q3", "Q4"];
const MONTH_LABELS_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function GoalOverview() {
  const [activeTab, setActiveTab] = useState<TabType>("Quarter");
  const { language, t } = useLanguage();
  const { members } = usePermission();
  const { currentUser } = useTeam();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  const p = useOrgPath();
  const { goals: ctxGoals, urgentGoals: ctxUrgentGoals, addGoal, allGoals: everyGoal } = useGoalContext();
  const allGoals = ctxGoals;
  const hasNoGoals = everyGoal.length === 0;

  const now = new Date();
  const currentYear = now.getFullYear();

  const filteredGoals = useMemo(() => {
    return allGoals.filter((goal) => {
      if (goal.level !== activeTab) return false;
      if (activeTab === "Year" && goal.startDate) {
        return isWithinInterval(new Date(goal.startDate), { start: startOfYear(now), end: endOfYear(now) });
      }
      if (activeTab === "Quarter" && goal.startDate) {
        return new Date(goal.startDate).getFullYear() === currentYear;
      }
      if (activeTab === "Month" && goal.startDate) {
        return new Date(goal.startDate).getFullYear() === currentYear;
      }
      return true;
    });
  }, [allGoals, activeTab, currentYear]);

  const quarterGoalsThisYear = useMemo(() => {
    return allGoals.filter(
      (g) => g.level === "Quarter" && g.startDate && new Date(g.startDate).getFullYear() === currentYear
    );
  }, [allGoals, currentYear]);

  const usedQuarters = useMemo(() => {
    return quarterGoalsThisYear.map((g) => {
      if (!g.startDate) return -1;
      return Math.floor(new Date(g.startDate).getMonth() / 3);
    }).filter((q) => q >= 0);
  }, [quarterGoalsThisYear]);

  const nextAvailableQuarter = useMemo(() => {
    for (let q = 0; q < 4; q++) {
      if (!usedQuarters.includes(q)) return q;
    }
    return -1;
  }, [usedQuarters]);

  const canAddQuarterGoal = nextAvailableQuarter >= 0;

  const monthGoalsThisYear = useMemo(() => {
    return allGoals.filter(
      (g) => g.level === "Month" && g.startDate && new Date(g.startDate).getFullYear() === currentYear
    );
  }, [allGoals, currentYear]);

  const usedMonths = useMemo(() => {
    return monthGoalsThisYear.map((g) => g.startDate ? new Date(g.startDate).getMonth() : -1).filter((m) => m >= 0);
  }, [monthGoalsThisYear]);

  const nextAvailableMonth = useMemo(() => {
    const currentMonth = now.getMonth();
    for (let i = 0; i < 12; i++) {
      const m = (currentMonth + i) % 12;
      if (!usedMonths.includes(m)) return m;
    }
    return -1;
  }, [usedMonths]);

  const yearGoalsThisYear = useMemo(() => {
    return allGoals.filter(
      (g) => g.level === "Year" && g.startDate && new Date(g.startDate).getFullYear() === currentYear
    );
  }, [allGoals, currentYear]);

  const canAddYearGoal = yearGoalsThisYear.length === 0;

  const canAdd = activeTab === "Year" ? canAddYearGoal
    : activeTab === "Quarter" ? canAddQuarterGoal
    : nextAvailableMonth >= 0;

  const newGoalPeriodLabel = useMemo(() => {
    if (activeTab === "Year") {
      return `${currentYear}${language === "ko" ? "\uB144" : ""}`;
    }
    if (activeTab === "Quarter") {
      if (nextAvailableQuarter < 0) return "";
      return language === "ko" ? QUARTER_LABELS_KO[nextAvailableQuarter] : QUARTER_LABELS_EN[nextAvailableQuarter];
    }
    if (nextAvailableMonth < 0) return "";
    return language === "ko" ? MONTH_LABELS_KO[nextAvailableMonth] : MONTH_LABELS_EN[nextAvailableMonth];
  }, [activeTab, nextAvailableQuarter, nextAvailableMonth, currentYear, language]);

  const handleAddGoal = () => {
    if (!newGoalTitle.trim() || !canAdd) return;

    let startDate: Date;
    let endDate: Date;

    if (activeTab === "Year") {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);
    } else if (activeTab === "Quarter") {
      const qMonth = nextAvailableQuarter * 3;
      startDate = new Date(currentYear, qMonth, 1);
      const endMonth = qMonth + 2;
      endDate = new Date(currentYear, endMonth + 1, 0);
    } else {
      startDate = new Date(currentYear, nextAvailableMonth, 1);
      endDate = new Date(currentYear, nextAvailableMonth + 1, 0);
    }

    const newGoal: GoalItem = {
      id: `g_${Date.now()}`,
      title: newGoalTitle.trim(),
      titleKo: language === "ko" ? newGoalTitle.trim() : undefined,
      level: activeTab,
      progress: 0,
      status: "pending",
      startDate,
      endDate,
    };

    // Use context addGoal (server-synced)
    addGoal(newGoal);
    setNewGoalTitle("");
    setShowAddForm(false);
  };

  const getGoalPeriodLabel = (goal: GoalItem) => {
    if (!goal.startDate) return "";
    const sd = new Date(goal.startDate);
    if (goal.level === "Year") return `${sd.getFullYear()}`;
    if (goal.level === "Quarter") {
      const q = Math.floor(sd.getMonth() / 3);
      return language === "ko" ? QUARTER_LABELS_KO[q] : QUARTER_LABELS_EN[q];
    }
    if (goal.level === "Month") {
      return language === "ko"
        ? MONTH_LABELS_KO[sd.getMonth()]
        : MONTH_LABELS_EN[sd.getMonth()];
    }
    return "";
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "Year", label: t("level_year"), icon: Flag },
    { id: "Quarter", label: t("level_quarter"), icon: Milestone },
    { id: "Month", label: t("level_month"), icon: Target },
    { id: "Urgent", label: t("level_urgent"), icon: Zap },
  ];

  // Active urgent goals from context
  const activeUrgentGoals = useMemo(() => {
    return [...ctxUrgentGoals]
      .filter((g) => g.status !== "completed")
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
  }, [ctxUrgentGoals]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {activeTab === "Year" && <Flag size={18} className="text-purple-600" />}
            {activeTab === "Quarter" && <Milestone size={18} className="text-blue-600" />}
            {activeTab === "Month" && <Target size={18} className="text-emerald-600" />}
            {activeTab === "Urgent" && <Zap size={18} className="text-orange-600" />}
            {t(activeTab === "Year" ? "level_year" : activeTab === "Quarter" ? "level_quarter" : activeTab === "Month" ? "level_month" : "level_urgent")}
            {activeTab === "Urgent" && activeUrgentGoals.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                {activeUrgentGoals.length}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <Link
              to={p("/organization/setup")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={13} />
              {language === "ko" ? "\uBAA9\uD45C \uC124\uC815" : "Set Goals"}
            </Link>
            <Link
              to={p("/organization")}
              className="text-xs font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              {t("view_all")} <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="flex p-1 bg-gray-50 rounded-lg border border-gray-100">
          {tabs.map((tab) => {
            const iconColor = activeTab === tab.id
              ? tab.id === "Year" ? "text-purple-600"
                : tab.id === "Quarter" ? "text-blue-600"
                : tab.id === "Month" ? "text-emerald-600"
                : "text-orange-600"
              : "text-gray-400";
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowAddForm(false); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all relative z-10",
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon size={14} className={iconColor} />
                {tab.label}
                {tab.id === "Urgent" && activeUrgentGoals.length > 0 && activeTab !== "Urgent" && (
                  <span className="text-[8px] font-bold w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    {activeUrgentGoals.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {activeTab === "Urgent" ? (
              activeUrgentGoals.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                {activeUrgentGoals.map((goal) => {
                  const category = goal.urgentCategory || "other";
                  const catCfg = URGENT_CATEGORY_CONFIG[category];
                  const title = language === "ko" ? goal.titleKo || goal.title : goal.title;
                  const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
                  const isOverdue = daysLeft !== null && daysLeft < 0;
                  const isUrgentSoon = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;
                  const assignee = goal.assigneeId ? members.find((m) => m.id === goal.assigneeId) : null;

                  return (
                    <Link
                      key={goal.id}
                      to={p(`/organization/${goal.id}`)}
                      className={cn(
                        "block bg-white p-3 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden",
                        isOverdue ? "border-red-200" : isUrgentSoon ? "border-orange-200" : "border-gray-100 hover:border-blue-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0 left-0 right-0 h-0.5",
                        isOverdue ? "bg-red-500" : isUrgentSoon ? "bg-gradient-to-r from-orange-400 to-red-400" : "bg-gradient-to-r from-amber-400 to-orange-400"
                      )} />

                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 uppercase tracking-wider", catCfg?.bg, catCfg?.color, catCfg?.border)}>
                          {catCfg?.icon}
                          {language === "ko" ? t(`category_${category}` as any) : category}
                        </span>
                        {daysLeft !== null && (
                          <span className={cn(
                            "text-[9px] font-bold px-1 py-0.5 rounded-md",
                            isOverdue ? "bg-red-100 text-red-700" : daysLeft === 0 ? "bg-red-100 text-red-700 animate-pulse" : isUrgentSoon ? "bg-orange-100 text-orange-700" : daysLeft <= 7 ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {isOverdue ? (<><AlertTriangle size={8} className="inline mr-0.5 -mt-0.5" />D+{Math.abs(daysLeft)}</>) : daysLeft === 0 ? (<><Zap size={8} className="inline mr-0.5 -mt-0.5" />D-Day</>) : (`D-${daysLeft}`)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2 min-h-[2rem]">{title}</h4>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-gray-400 font-medium">
                            {goal.deadline && format(new Date(goal.deadline), language === "ko" ? "M\uC6D4 d\uC77C" : "MMM d", { locale: language === "ko" ? koLocale : undefined })}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {assignee && <img src={assignee.avatar} alt={assignee.name} className="w-4 h-4 rounded-full border border-white shadow-sm object-cover" />}
                            <span className={cn("text-[9px] font-bold", isOverdue ? "text-red-600" : isUrgentSoon ? "text-orange-600" : "text-gray-500")}>{goal.progress}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", isOverdue ? "bg-red-400" : isUrgentSoon ? "bg-orange-400" : goal.progress === 100 ? "bg-emerald-500" : goal.progress > 60 ? "bg-blue-500" : "bg-amber-500")}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Zap size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{language === "ko" ? "\uAE34\uAE09 \uBBF8\uC158\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" : "No urgent missions"}</p>
                </div>
              )
            ) : (
              hasNoGoals ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <p className="text-base font-semibold text-gray-700 mb-2">
                    {language === "ko"
                      ? `${currentUser.name}님은 어떤 멋진 목표를 갖고 계신가요?`
                      : `What amazing goals do you have, ${currentUser.name}?`}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {language === "ko"
                      ? "목표를 설정하고 체계적으로 관리해보세요"
                      : "Set your goals and manage them systematically"}
                  </p>
                  <Link
                    to={p("/organization/setup")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    {language === "ko" ? "목표 설정하기" : "Set Goals"}
                  </Link>
                </div>
              ) : filteredGoals.length > 0 ? (
                filteredGoals.map((goal) => (
                  <Link
                    to={p(`/organization/${goal.id}`)}
                    key={goal.id}
                    className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                            goal.level === "Year" ? "bg-purple-50 text-purple-700 border-purple-200" : goal.level === "Quarter" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {getGoalPeriodLabel(goal)}
                          </span>
                          {goal.status === "completed" && (
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle2 size={10} /> {t("status_completed")}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {language === "ko" ? goal.titleKo || goal.title : goal.title}
                        </h4>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                        <span>{t("progress")}</span>
                        <span>{goal.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", goal.progress === 100 ? "bg-emerald-500" : goal.progress > 60 ? "bg-blue-500" : "bg-amber-500")}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">{t("no_goals")}</p>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>

        {activeTab === "Quarter" && (
          <div className="flex items-center justify-center gap-1.5 py-1">
            {[0, 1, 2, 3].map((q) => (
              <div
                key={q}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                  usedQuarters.includes(q) ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-gray-50 text-gray-300 border border-gray-100"
                )}
              >
                {language === "ko" ? QUARTER_LABELS_KO[q] : QUARTER_LABELS_EN[q]}
                {usedQuarters.includes(q) && <Check size={10} />}
              </div>
            ))}
          </div>
        )}

        {activeTab !== "Urgent" && (
          <AnimatePresence>
            {showAddForm ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                <div className="bg-white rounded-xl border-2 border-blue-200 p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                      activeTab === "Year" ? "bg-purple-50 text-purple-700 border-purple-200" : activeTab === "Quarter" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {newGoalPeriodLabel}
                    </span>
                  </div>
                  <input
                    autoFocus
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newGoalTitle.trim()) handleAddGoal();
                      if (e.key === "Escape") { setNewGoalTitle(""); setShowAddForm(false); }
                    }}
                    placeholder={language === "ko" ? "\uBAA9\uD45C\uB97C \uC785\uB825\uD558\uC138\uC694..." : "Type a goal..."}
                    className="w-full text-sm font-medium text-gray-900 placeholder-gray-300 outline-none bg-transparent mb-2.5"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => { setNewGoalTitle(""); setShowAddForm(false); }} className="px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      {language === "ko" ? "\uCDE8\uC18C" : "Cancel"}
                    </button>
                    <button
                      onClick={handleAddGoal}
                      disabled={!newGoalTitle.trim()}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors",
                        newGoalTitle.trim() ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-100 text-gray-300 cursor-not-allowed"
                      )}
                    >
                      <Check size={12} />
                      {language === "ko" ? "\uCD94\uAC00" : "Add"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : canAdd ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all text-xs font-medium group"
              >
                <Plus size={14} className="group-hover:rotate-90 transition-transform duration-200" />
                {t("new_goal")}
              </motion.button>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-100 text-gray-300 text-xs font-medium">
                <CheckCircle2 size={14} />
                {activeTab === "Quarter"
                  ? (language === "ko" ? "4\uBD84\uAE30 \uBAA9\uD45C\uAC00 \uBAA8\uB450 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4" : "All 4 quarters registered")
                  : activeTab === "Year"
                  ? (language === "ko" ? "\uC62C\uD574 \uBAA9\uD45C\uAC00 \uC774\uBBF8 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4" : "This year's goal already set")
                  : (language === "ko" ? "\uBAA8\uB4E0 \uC6D4 \uBAA9\uD45C\uAC00 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4" : "All months registered")}
              </div>
            )}
          </AnimatePresence>
        )}

        {activeTab === "Urgent" && (
          <Link
            to={p("/organization/new?level=Urgent")}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-orange-200 text-orange-400 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/30 transition-all text-xs font-medium group"
          >
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-200" />
            {t("new_urgent_goal")}
          </Link>
        )}
      </div>
    </div>
  );
}