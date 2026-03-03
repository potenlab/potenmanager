import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Sparkles,
  Building2,
  Users,
  Plus,
  Loader2,
  Calendar,
  Settings,
  Target,
  Lightbulb,
  Check,
  Trash2,
  Flag,
  Milestone,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";
import { usePermission } from "../context/PermissionContext";
import { hasPermission, type Role } from "../../lib/permissions";
import { useGoalContext } from "../context/GoalContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { StrategyTabContent } from "./GoalsPage";
import type { GoalItem } from "../../lib/mockData";

// ── Category definitions (shared with edit page) ──────────────────
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
  { key: "revenue", emoji: "\u{1F4B0}", labelKo: "\uB9E4\uCD9C", labelEn: "Revenue", colorBg: "bg-emerald-50", colorText: "text-emerald-600", urgentCategory: "funding", placeholderKo: "\uC608: 10\uC5B5\uC6D0", placeholderEn: "e.g. $1M" },
  { key: "funding", emoji: "\u{1F4C8}", labelKo: "\uD22C\uC790", labelEn: "Funding", colorBg: "bg-orange-50", colorText: "text-orange-600", urgentCategory: "investment", placeholderKo: "\uC608: \uC2DC\uB9AC\uC988 A", placeholderEn: "e.g. Series A" },
  { key: "customers", emoji: "\u{1F465}", labelKo: "\uACE0\uAC1D\uD655\uBCF4", labelEn: "Customers", colorBg: "bg-blue-50", colorText: "text-blue-600", urgentCategory: "other", placeholderKo: "\uC608: 1000\uBA85", placeholderEn: "e.g. 1000" },
  { key: "partnerships", emoji: "\u{1F91D}", labelKo: "\uD611\uC57D", labelEn: "Partnerships", colorBg: "bg-teal-50", colorText: "text-teal-600", urgentCategory: "contract", placeholderKo: "\uC608: \uB300\uAE30\uC5C5 MOU 3\uAC74", placeholderEn: "e.g. 3 MOUs" },
  { key: "team", emoji: "\u{1F464}", labelKo: "\uCC44\uC6A9/\uD300\uC6D0", labelEn: "Hiring/Team", colorBg: "bg-pink-50", colorText: "text-pink-600", urgentCategory: "other", placeholderKo: "\uC608: 15\uBA85", placeholderEn: "e.g. 15" },
  { key: "market", emoji: "\u{1F30D}", labelKo: "\uD310\uB85C\uD655\uBCF4", labelEn: "Market", colorBg: "bg-indigo-50", colorText: "text-indigo-600", urgentCategory: "other", placeholderKo: "\uC608: \uC77C\uBCF8, \uB3D9\uB0A8\uC544", placeholderEn: "e.g. Japan" },
  { key: "brand", emoji: "\u2B50", labelKo: "\uBE0C\uB79C\uB529", labelEn: "Branding", colorBg: "bg-yellow-50", colorText: "text-yellow-600", urgentCategory: "other", placeholderKo: "\uC608: \uC778\uC9C0\uB3C4 2\uBC30 \uD5A5\uC0C1", placeholderEn: "e.g. Double awareness" },
  { key: "marketing", emoji: "\u{1F4E3}", labelKo: "\uB9C8\uCF00\uD305", labelEn: "Marketing", colorBg: "bg-rose-50", colorText: "text-rose-600", urgentCategory: "other", placeholderKo: "\uC608: SNS \uD314\uB85C\uC6CC 1\uB9CC\uBA85", placeholderEn: "e.g. 10K followers" },
];

const META_BY_LABEL: Record<string, CategoryDef> = {};
for (const cat of ALL_CATEGORIES) {
  META_BY_LABEL[cat.labelKo] = cat;
  META_BY_LABEL[cat.labelEn] = cat;
}

function parseGoalTitle(title: string): { label: string; value: string } {
  const colonIdx = title.indexOf(":");
  if (colonIdx > 0) {
    return { label: title.slice(0, colonIdx).trim(), value: title.slice(colonIdx + 1).trim() };
  }
  return { label: "", value: title };
}

const QUARTER_LABELS_KO = ["1\uBD84\uAE30", "2\uBD84\uAE30", "3\uBD84\uAE30", "4\uBD84\uAE30"];
const QUARTER_LABELS_EN = ["Q1", "Q2", "Q3", "Q4"];
const MONTH_LABELS_KO = ["1\uC6D4", "2\uC6D4", "3\uC6D4", "4\uC6D4", "5\uC6D4", "6\uC6D4", "7\uC6D4", "8\uC6D4", "9\uC6D4", "10\uC6D4", "11\uC6D4", "12\uC6D4"];
const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const uid = () => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function GoalPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const navigate = useNavigate();
  const { org, createOrg, isLoading } = useInvite();
  const { currentUser, members } = usePermission();
  const { goals, urgentGoals, allGoals, addGoal, updateGoal, removeGoal } = useGoalContext();
  const [activeTab, setActiveTab] = useState<"goals" | "strategy">("goals");

  // Find core goal (Year level, no parent)
  const coreGoal = goals.find((g) => g.level === "Year" && !g.parentId);
  // Category goals (children of core goal)
  const categoryGoals = urgentGoals.filter((g) => g.parentId === coreGoal?.id);
  const hasGoals = !!coreGoal;

  const [orgName, setOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const canEdit = hasPermission(currentUser.role as Role, "org.edit");
  const currentYear = new Date().getFullYear();
  const now = new Date();

  // ── Category add state ──
  const [showCategoryAdd, setShowCategoryAdd] = useState(false);
  const [addingCatKey, setAddingCatKey] = useState<string | null>(null);
  const [addCatValue, setAddCatValue] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const addCatRef = useRef<HTMLInputElement>(null);
  const customLabelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingCatKey && addCatRef.current) addCatRef.current.focus();
  }, [addingCatKey]);

  useEffect(() => {
    if (addingCatKey === "__custom" && customLabelRef.current) customLabelRef.current.focus();
  }, [addingCatKey]);

  // Used category keys
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

  const unusedCategories = useMemo(
    () => ALL_CATEGORIES.filter((cat) => !usedCategoryKeys.has(cat.key)),
    [usedCategoryKeys]
  );

  // ── Quarter/Month goals ──
  const quarterGoals = useMemo(
    () => goals.filter((g) => g.level === "Quarter" && g.startDate && new Date(g.startDate).getFullYear() === currentYear),
    [goals, currentYear]
  );

  const monthGoals = useMemo(
    () => goals.filter((g) => g.level === "Month" && g.startDate && new Date(g.startDate).getFullYear() === currentYear),
    [goals, currentYear]
  );

  const usedQuarters = useMemo(() =>
    quarterGoals.map((g) => g.startDate ? Math.floor(new Date(g.startDate).getMonth() / 3) : -1).filter((q) => q >= 0),
    [quarterGoals]
  );

  const usedMonths = useMemo(() =>
    monthGoals.map((g) => g.startDate ? new Date(g.startDate).getMonth() : -1).filter((m) => m >= 0),
    [monthGoals]
  );

  const nextQuarter = useMemo(() => {
    for (let q = 0; q < 4; q++) { if (!usedQuarters.includes(q)) return q; }
    return -1;
  }, [usedQuarters]);

  const nextMonth = useMemo(() => {
    const cm = now.getMonth();
    for (let i = 0; i < 12; i++) { const m = (cm + i) % 12; if (!usedMonths.includes(m)) return m; }
    return -1;
  }, [usedMonths]);

  // ── Add goal state ──
  const [addGoalLevel, setAddGoalLevel] = useState<"Quarter" | "Month" | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const addGoalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addGoalLevel && addGoalRef.current) addGoalRef.current.focus();
  }, [addGoalLevel]);

  // ── Collapse state ──
  const [quarterExpanded, setQuarterExpanded] = useState(true);
  const [monthExpanded, setMonthExpanded] = useState(true);

  // ── Core progress ──
  const coreProgress = useMemo(() => {
    if (categoryGoals.length === 0) return coreGoal?.progress || 0;
    const completed = categoryGoals.filter((g) => g.status === "completed").length;
    return Math.round((completed / categoryGoals.length) * 100);
  }, [categoryGoals, coreGoal]);

  // ── Handlers ──
  const handleCreateOrg = async (name: string) => {
    if (!name.trim() || creating) return;
    setCreating(true);
    const newOrg = await createOrg(name.trim());
    setCreating(false);
    if (newOrg) navigate("/organization/setup");
  };

  const handleSoloStart = () => {
    const soloName = ko
      ? `${currentUser.name}\uC758 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4`
      : `${currentUser.name}'s Workspace`;
    handleCreateOrg(soloName);
  };

  const handleCategoryToggle = (goalId: string) => {
    const goal = categoryGoals.find((g) => g.id === goalId);
    if (!goal || !coreGoal) return;
    const isDone = goal.status === "completed";
    updateGoal(goalId, { status: isDone ? "pending" : "completed", progress: isDone ? 0 : 100 });
    // Recalc core progress
    const completedCount = categoryGoals.filter((g) => g.id === goalId ? !isDone : g.status === "completed").length;
    const newProgress = Math.round((completedCount / categoryGoals.length) * 100);
    updateGoal(coreGoal.id, {
      progress: newProgress,
      status: newProgress === 100 ? "completed" : newProgress > 0 ? "in-progress" : "pending",
    });
  };

  const handleAddCategory = (cat: CategoryDef) => {
    if (!addCatValue.trim() || !coreGoal) return;
    const label = ko ? cat.labelKo : cat.labelEn;
    const title = `${label}: ${addCatValue.trim()}`;
    const newGoal: GoalItem = {
      id: uid(),
      title,
      titleKo: `${cat.labelKo}: ${addCatValue.trim()}`,
      level: "Urgent",
      progress: 0,
      status: "pending",
      parentId: coreGoal.id,
      isUrgent: true,
      urgentCategory: cat.urgentCategory as GoalItem["urgentCategory"],
    };
    addGoal(newGoal);
    setAddingCatKey(null);
    setAddCatValue("");
    setShowCategoryAdd(false);
  };

  const handleAddCustomCategory = () => {
    if (!customLabel.trim() || !addCatValue.trim() || !coreGoal) return;
    const title = `${customLabel.trim()}: ${addCatValue.trim()}`;
    const newGoal: GoalItem = {
      id: uid(),
      title,
      titleKo: title,
      level: "Urgent",
      progress: 0,
      status: "pending",
      parentId: coreGoal.id,
      isUrgent: true,
      urgentCategory: "other",
    };
    addGoal(newGoal);
    setAddingCatKey(null);
    setAddCatValue("");
    setCustomLabel("");
    setShowCategoryAdd(false);
  };

  const handleDeleteCategory = (goalId: string) => {
    removeGoal(goalId);
  };

  const handleAddGoal = (level: "Quarter" | "Month") => {
    if (!newGoalTitle.trim()) return;
    let startDate: Date;
    let endDate: Date;
    if (level === "Quarter") {
      if (nextQuarter < 0) return;
      const qMonth = nextQuarter * 3;
      startDate = new Date(currentYear, qMonth, 1);
      endDate = new Date(currentYear, qMonth + 3, 0);
    } else {
      if (nextMonth < 0) return;
      startDate = new Date(currentYear, nextMonth, 1);
      endDate = new Date(currentYear, nextMonth + 1, 0);
    }
    const newGoal: GoalItem = {
      id: uid(),
      title: newGoalTitle.trim(),
      titleKo: ko ? newGoalTitle.trim() : undefined,
      level,
      progress: 0,
      status: "pending",
      startDate,
      endDate,
    };
    addGoal(newGoal);
    setNewGoalTitle("");
    setAddGoalLevel(null);
  };

  const getQuarterLabel = (goal: GoalItem) => {
    if (!goal.startDate) return "";
    const q = Math.floor(new Date(goal.startDate).getMonth() / 3);
    return ko ? QUARTER_LABELS_KO[q] : QUARTER_LABELS_EN[q];
  };

  const getMonthLabel = (goal: GoalItem) => {
    if (!goal.startDate) return "";
    const m = new Date(goal.startDate).getMonth();
    return ko ? MONTH_LABELS_KO[m] : MONTH_LABELS_EN[m];
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // ── No org: Create Organization ──
  if (!org) {
    return (
      <div className="max-w-lg mx-auto pt-16 px-4">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <Building2 size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {ko ? "\uC870\uC9C1\uC744 \uC0DD\uC131\uD558\uC138\uC694" : "Create Your Organization"}
          </h1>
          <p className="text-gray-500 text-sm">
            {ko
              ? "\uD300\uC6D0\uC744 \uCD08\uB300\uD558\uACE0 \uBAA9\uD45C\uB97C \uC124\uC815\uD558\uB824\uBA74 \uC870\uC9C1\uC774 \uD544\uC694\uD569\uB2C8\uB2E4."
              : "You need an organization to invite members and set goals."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              {ko ? "\uC870\uC9C1 \uC774\uB984" : "Organization Name"}
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={ko ? "\uC608: \uD3EC\uD150\uB7A9" : "e.g. Poten Lab"}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateOrg(orgName);
              }}
            />
          </div>
          <button
            onClick={() => handleCreateOrg(orgName)}
            disabled={!orgName.trim() || creating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {creating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {ko ? "\uC870\uC9C1 \uC0DD\uC131" : "Create Organization"}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={handleSoloStart}
            disabled={creating}
            className="text-sm text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            {ko ? "1\uC778\uAE30\uC5C5\uC73C\uB85C \uC2DC\uC791\uD558\uAE30 \u2192" : "Start as solo business \u2192"}
          </button>
        </div>
      </div>
    );
  }

  // ── Has org: Organization Overview ──
  const createdDate = org.createdAt
    ? new Date(org.createdAt).toLocaleDateString(ko ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Organization Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M0%2020h40M20%200v40%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.05)%22%20fill%3D%22none%22/%3E%3C/svg%3E')] opacity-50" />
          {canEdit && (
            <button
              onClick={() => navigate("/organization/settings")}
              className="absolute top-3 right-3 p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-sm"
            >
              <Settings size={16} />
            </button>
          )}
        </div>

        <div className="px-6 -mt-8 relative z-[1]">
          <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg overflow-hidden">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <Building2 size={28} className="text-blue-600" />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pt-3 pb-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
            <PermissionGate permission="strategy.create">
              <button
                onClick={() => navigate("/strategy/new")}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-xs font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md shadow-blue-200"
              >
                <Sparkles size={14} />
                AI {ko ? '\uC804\uB7B5 \uC0DD\uC131' : 'Strategy'}
              </button>
            </PermissionGate>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {ko
                ? `\uBA64\uBC84 ${members.length}\uBA85`
                : `${members.length} member${members.length !== 1 ? "s" : ""}`}
            </span>
            {createdDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {createdDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("goals")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
            activeTab === "goals"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Target size={15} />
          {ko ? `${currentYear}\uB144 \uBAA9\uD45C` : `${currentYear} Goals`}
        </button>
        <button
          onClick={() => setActiveTab("strategy")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
            activeTab === "strategy"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Lightbulb size={15} />
          {ko ? "\uC804\uB7B5" : "Strategy"}
        </button>
      </div>

      {/* Goals Tab Content */}
      {activeTab === "goals" && (
        <>
          {hasGoals ? (
            <div className="space-y-4">
              {/* ═══ Core Goal + Categories ═══ */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-500" />
                    {ko ? "\uD575\uC2EC \uBAA9\uD45C" : "Core Goal"}
                  </h3>
                </div>
                <div className="px-6 py-5">
                  {/* Core goal - clickable to detail */}
                  <Link
                    to={`/organization/${coreGoal.id}`}
                    className="flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {ko ? (coreGoal.titleKo || coreGoal.title) : coreGoal.title}
                      </p>
                      {/* Progress bar */}
                      {categoryGoals.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                coreProgress === 100 ? "bg-emerald-500" : "bg-[#0079FF]"
                              )}
                              style={{ width: `${coreProgress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-400">{coreProgress}%</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {ko ? "\uD074\uB9AD\uD558\uC5EC \uC0C1\uC138 \uBCF4\uAE30" : "Click to view details"}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 mt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>

                  {/* Category goals with checkboxes */}
                  {categoryGoals.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <p className="text-xs text-gray-400 font-medium mb-3">
                        {ko ? "\uC138\uBD80 \uD56D\uBAA9" : "Categories"}{" "}
                        <span className="text-gray-300">
                          ({categoryGoals.filter((g) => g.status === "completed").length}/{categoryGoals.length})
                        </span>
                      </p>
                      <div className="space-y-1">
                        {categoryGoals.map((g) => {
                          const title = ko ? (g.titleKo || g.title) : g.title;
                          const { label, value } = parseGoalTitle(title);
                          const meta = META_BY_LABEL[label];
                          const isDone = g.status === "completed";

                          return (
                            <div
                              key={g.id}
                              className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                              {/* Checkbox */}
                              {canEdit && (
                                <button
                                  onClick={() => handleCategoryToggle(g.id)}
                                  className={cn(
                                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                    isDone
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-gray-300 hover:border-blue-400"
                                  )}
                                >
                                  {isDone && <Check size={12} />}
                                </button>
                              )}
                              {/* Category info */}
                              <span className="text-base shrink-0">{meta?.emoji || "\u{1F4CB}"}</span>
                              {/* Clickable to detail page */}
                              <Link
                                to={`/organization/${g.id}`}
                                className={cn(
                                  "flex-1 min-w-0 flex items-center gap-2 group/link",
                                  isDone && "line-through opacity-60"
                                )}
                              >
                                {label && (
                                  <span className={cn("text-xs font-semibold shrink-0", meta?.colorText || "text-gray-500")}>
                                    {label}
                                  </span>
                                )}
                                <span className="text-sm text-gray-700 truncate group-hover/link:text-blue-600 transition-colors">
                                  {value || title}
                                </span>
                                <ArrowRight size={12} className="text-gray-200 group-hover/link:text-blue-400 shrink-0 opacity-0 group-hover/link:opacity-100 transition-all" />
                              </Link>
                              {/* Delete */}
                              {canEdit && (
                                <button
                                  onClick={() => handleDeleteCategory(g.id)}
                                  className="p-1 rounded-md text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add category section */}
                  {canEdit && (
                    <div className="mt-4">
                      {showCategoryAdd ? (
                        <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-gray-500">
                              {ko ? "\uD56D\uBAA9 \uCD94\uAC00" : "Add Category"}
                            </p>
                            <button
                              onClick={() => { setShowCategoryAdd(false); setAddingCatKey(null); setAddCatValue(""); setCustomLabel(""); }}
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {addingCatKey ? (
                            addingCatKey === "__custom" ? (
                              /* Custom / 기타 input */
                              <div className="space-y-2">
                                <input
                                  ref={customLabelRef}
                                  value={customLabel}
                                  onChange={(e) => setCustomLabel(e.target.value)}
                                  placeholder={ko ? "\uD56D\uBAA9 \uC774\uB984 (\uC608: \uAE30\uC220\uAC1C\uBC1C)" : "Category name (e.g. R&D)"}
                                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                />
                                <input
                                  ref={addCatRef}
                                  value={addCatValue}
                                  onChange={(e) => setAddCatValue(e.target.value)}
                                  placeholder={ko ? "\uBAA9\uD45C\uAC12 (\uC608: MVP \uCD9C\uC2DC)" : "Target (e.g. Launch MVP)"}
                                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAddCustomCategory();
                                    if (e.key === "Escape") { setAddingCatKey(null); setAddCatValue(""); setCustomLabel(""); }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setAddingCatKey(null); setAddCatValue(""); setCustomLabel(""); }}
                                    className="flex-1 py-2 text-xs font-medium text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100"
                                  >
                                    {ko ? "\uCDE8\uC18C" : "Cancel"}
                                  </button>
                                  <button
                                    onClick={handleAddCustomCategory}
                                    disabled={!customLabel.trim() || !addCatValue.trim()}
                                    className={cn(
                                      "flex-1 py-2 text-xs font-semibold rounded-lg transition-colors",
                                      customLabel.trim() && addCatValue.trim()
                                        ? "bg-blue-500 text-white hover:bg-blue-600"
                                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                                    )}
                                  >
                                    {ko ? "\uCD94\uAC00" : "Add"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Predefined category value input */
                              (() => {
                                const cat = ALL_CATEGORIES.find((c) => c.key === addingCatKey)!;
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-base shrink-0">{cat.emoji}</span>
                                    <span className={cn("text-xs font-semibold shrink-0", cat.colorText)}>
                                      {ko ? cat.labelKo : cat.labelEn}
                                    </span>
                                    <input
                                      ref={addCatRef}
                                      value={addCatValue}
                                      onChange={(e) => setAddCatValue(e.target.value)}
                                      placeholder={ko ? cat.placeholderKo : cat.placeholderEn}
                                      className="flex-1 text-sm py-1.5 px-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddCategory(cat);
                                        if (e.key === "Escape") { setAddingCatKey(null); setAddCatValue(""); }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleAddCategory(cat)}
                                      disabled={!addCatValue.trim()}
                                      className={cn(
                                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0",
                                        addCatValue.trim() ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-100 text-gray-300"
                                      )}
                                    >
                                      <Check size={14} />
                                    </button>
                                  </div>
                                );
                              })()
                            )
                          ) : (
                            /* Category selection grid */
                            <div className="space-y-1">
                              {unusedCategories.map((cat) => (
                                <button
                                  key={cat.key}
                                  onClick={() => { setAddingCatKey(cat.key); setAddCatValue(""); }}
                                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                                >
                                  <span className="text-base shrink-0">{cat.emoji}</span>
                                  <span className={cn("text-xs font-semibold", cat.colorText)}>
                                    {ko ? cat.labelKo : cat.labelEn}
                                  </span>
                                  <Plus size={12} className="ml-auto text-gray-200 group-hover:text-blue-400" />
                                </button>
                              ))}
                              {/* 기타 (Custom) option */}
                              <button
                                onClick={() => { setAddingCatKey("__custom"); setAddCatValue(""); setCustomLabel(""); }}
                                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group border-t border-gray-100 mt-1 pt-2"
                              >
                                <span className="text-base shrink-0">{"\u2795"}</span>
                                <span className="text-xs font-semibold text-gray-500">
                                  {ko ? "\uAE30\uD0C0 (\uC9C1\uC811 \uC785\uB825)" : "Other (Custom)"}
                                </span>
                                <Plus size={12} className="ml-auto text-gray-200 group-hover:text-blue-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCategoryAdd(true)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all text-xs font-medium"
                        >
                          <Plus size={14} />
                          {ko ? "\uD56D\uBAA9 \uCD94\uAC00" : "Add Category"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ Quarter Goals ═══ */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setQuarterExpanded(!quarterExpanded)}
                  className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Milestone size={16} className="text-blue-500" />
                    {ko ? "\uBD84\uAE30 \uBAA9\uD45C" : "Quarterly Goals"}
                    <span className="text-xs font-normal text-gray-400">({quarterGoals.length})</span>
                  </h3>
                  {quarterExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {quarterExpanded && (
                  <div className="px-6 py-4 space-y-2">
                    {/* Quarter indicators */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {[0, 1, 2, 3].map((q) => (
                        <div
                          key={q}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                            usedQuarters.includes(q) ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-gray-50 text-gray-300 border border-gray-100"
                          )}
                        >
                          {ko ? QUARTER_LABELS_KO[q] : QUARTER_LABELS_EN[q]}
                          {usedQuarters.includes(q) && <Check size={10} />}
                        </div>
                      ))}
                    </div>

                    {quarterGoals.length > 0 ? (
                      quarterGoals.map((g) => (
                        <Link
                          key={g.id}
                          to={`/organization/${g.id}`}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors group"
                        >
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                            "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            {getQuarterLabel(g)}
                          </span>
                          <p className="text-sm text-gray-700 truncate flex-1 group-hover:text-blue-600 transition-colors">
                            {ko ? (g.titleKo || g.title) : g.title}
                          </p>
                          <span className="text-xs font-bold text-gray-400">{g.progress}%</span>
                          <ArrowRight size={12} className="text-gray-300 group-hover:text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-gray-300 text-center py-3">
                        {ko ? "\uBD84\uAE30 \uBAA9\uD45C\uB97C \uCD94\uAC00\uD574\uBCF4\uC138\uC694" : "Add a quarterly goal"}
                      </p>
                    )}

                    {/* Add quarter goal */}
                    {canEdit && nextQuarter >= 0 && (
                      addGoalLevel === "Quarter" ? (
                        <div className="bg-white rounded-xl border-2 border-blue-200 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {ko ? QUARTER_LABELS_KO[nextQuarter] : QUARTER_LABELS_EN[nextQuarter]}
                            </span>
                          </div>
                          <input
                            ref={addGoalRef}
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder={ko ? "\uBAA9\uD45C\uB97C \uC785\uB825\uD558\uC138\uC694..." : "Type a goal..."}
                            className="w-full text-sm font-medium text-gray-900 placeholder-gray-300 outline-none bg-transparent mb-2"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newGoalTitle.trim()) handleAddGoal("Quarter");
                              if (e.key === "Escape") { setNewGoalTitle(""); setAddGoalLevel(null); }
                            }}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => { setNewGoalTitle(""); setAddGoalLevel(null); }} className="px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg">
                              {ko ? "\uCDE8\uC18C" : "Cancel"}
                            </button>
                            <button
                              onClick={() => handleAddGoal("Quarter")}
                              disabled={!newGoalTitle.trim()}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg",
                                newGoalTitle.trim() ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-gray-100 text-gray-300 cursor-not-allowed"
                              )}
                            >
                              <Check size={12} />
                              {ko ? "\uCD94\uAC00" : "Add"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddGoalLevel("Quarter"); setNewGoalTitle(""); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all text-xs font-medium"
                        >
                          <Plus size={14} />
                          {ko ? `${QUARTER_LABELS_KO[nextQuarter]} \uBAA9\uD45C \uCD94\uAC00` : `Add ${QUARTER_LABELS_EN[nextQuarter]} Goal`}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* ═══ Month Goals ═══ */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setMonthExpanded(!monthExpanded)}
                  className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Target size={16} className="text-emerald-500" />
                    {ko ? "\uC6D4\uAC04 \uBAA9\uD45C" : "Monthly Goals"}
                    <span className="text-xs font-normal text-gray-400">({monthGoals.length})</span>
                  </h3>
                  {monthExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {monthExpanded && (
                  <div className="px-6 py-4 space-y-2">
                    {monthGoals.length > 0 ? (
                      monthGoals.map((g) => (
                        <Link
                          key={g.id}
                          to={`/organization/${g.id}`}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors group"
                        >
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                            "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {getMonthLabel(g)}
                          </span>
                          <p className="text-sm text-gray-700 truncate flex-1 group-hover:text-emerald-600 transition-colors">
                            {ko ? (g.titleKo || g.title) : g.title}
                          </p>
                          <span className="text-xs font-bold text-gray-400">{g.progress}%</span>
                          <ArrowRight size={12} className="text-gray-300 group-hover:text-emerald-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm text-gray-300 text-center py-3">
                        {ko ? "\uC6D4\uAC04 \uBAA9\uD45C\uB97C \uCD94\uAC00\uD574\uBCF4\uC138\uC694" : "Add a monthly goal"}
                      </p>
                    )}

                    {/* Add month goal */}
                    {canEdit && nextMonth >= 0 && (
                      addGoalLevel === "Month" ? (
                        <div className="bg-white rounded-xl border-2 border-emerald-200 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {ko ? MONTH_LABELS_KO[nextMonth] : MONTH_LABELS_EN[nextMonth]}
                            </span>
                          </div>
                          <input
                            ref={addGoalRef}
                            value={newGoalTitle}
                            onChange={(e) => setNewGoalTitle(e.target.value)}
                            placeholder={ko ? "\uBAA9\uD45C\uB97C \uC785\uB825\uD558\uC138\uC694..." : "Type a goal..."}
                            className="w-full text-sm font-medium text-gray-900 placeholder-gray-300 outline-none bg-transparent mb-2"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newGoalTitle.trim()) handleAddGoal("Month");
                              if (e.key === "Escape") { setNewGoalTitle(""); setAddGoalLevel(null); }
                            }}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => { setNewGoalTitle(""); setAddGoalLevel(null); }} className="px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg">
                              {ko ? "\uCDE8\uC18C" : "Cancel"}
                            </button>
                            <button
                              onClick={() => handleAddGoal("Month")}
                              disabled={!newGoalTitle.trim()}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg",
                                newGoalTitle.trim() ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-gray-300 cursor-not-allowed"
                              )}
                            >
                              <Check size={12} />
                              {ko ? "\uCD94\uAC00" : "Add"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddGoalLevel("Month"); setNewGoalTitle(""); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all text-xs font-medium"
                        >
                          <Plus size={14} />
                          {ko ? `${MONTH_LABELS_KO[nextMonth]} \uBAA9\uD45C \uCD94\uAC00` : `Add ${MONTH_LABELS_EN[nextMonth]} Goal`}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/organization/setup"
              className="group flex items-center gap-4 px-5 py-5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <div className="p-2.5 rounded-xl bg-white/20 shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {ko ? "\uC62C\uD574\uC758 \uBAA9\uD45C\uB97C \uC124\uC815\uD574\uC8FC\uC138\uC694" : "Set your goals for this year"}
                </p>
                <p className="text-blue-100 text-xs mt-0.5">
                  {ko
                    ? "\uD575\uC2EC \uBAA9\uD45C\uC640 \uCE74\uD14C\uACE0\uB9AC\uBCC4 \uACC4\uD68D\uC744 \uC138\uC6CC\uBCF4\uC138\uC694"
                    : "Define your core goal & category plans"}
                </p>
              </div>
              <ArrowRight
                size={18}
                className="text-white/70 group-hover:translate-x-1 transition-transform shrink-0"
              />
            </Link>
          )}
        </>
      )}

      {/* Strategy Tab Content */}
      {activeTab === "strategy" && <StrategyTabContent />}
    </div>
  );
}
