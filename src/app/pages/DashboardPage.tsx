import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { GoalOverview } from "../components/dashboard/GoalOverview";
import { OpportunityFeed } from "../components/dashboard/OpportunityFeed";
import { RevenueOverview } from "../components/dashboard/RevenueOverview";
import { UserOverview } from "../components/dashboard/UserOverview";
import { useLanguage } from "../context/LanguageContext";
import { Link } from "react-router";

type DashboardTab = "goal" | "performance" | "team" | "opportunity";

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("goal");
  const { t, language } = useLanguage();

  const tabs = [
    { 
      id: "goal" as const, 
      label: t("tab_goal"), 
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-100"
    },
    {
      id: "performance" as const,
      label: t("tab_performance" as any),
      icon: BarChart3,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100"
    },
    {
      id: "team" as const,
      label: t("tab_team" as any),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100"
    },
    { 
      id: "opportunity" as const, 
      label: t("tab_opportunity"), 
      icon: Zap,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100"
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Tab Navigation Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative overflow-hidden p-4 rounded-xl border text-left transition-all duration-200 group",
              activeTab === tab.id
                ? "bg-white border-blue-500 ring-1 ring-blue-500 shadow-md"
                : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={cn("p-2 rounded-lg", tab.bgColor)}>
                <tab.icon size={20} className={tab.color} />
              </div>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="active-dot"
                  className="w-2 h-2 rounded-full bg-blue-500"
                />
              )}
            </div>
            <div className="font-semibold text-gray-900">{tab.label}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
              {t("view_details")} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <AnimatePresence mode="wait">
          {activeTab === "goal" && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full space-y-4"
            >
              {/* 목표 설정 위자드 진입 배너 */}
              <Link
                to="/goals/setup"
                className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <div className="p-2.5 rounded-xl bg-white/20 shrink-0">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {language === "ko" ? "올해 목표를 체계적으로 설정해볼까요? 🎯" : "Set your goals for this year! 🎯"}
                  </p>
                  <p className="text-blue-100 text-xs mt-0.5">
                    {language === "ko"
                      ? "연간 → 분기 → 월간 목표를 단계별로 설정하는 마법사"
                      : "Step-by-step wizard: Annual → Quarterly → Monthly goals"}
                  </p>
                </div>
                <ArrowRight size={18} className="text-white/70 group-hover:translate-x-1 transition-transform shrink-0" />
              </Link>
              <GoalOverview />
            </motion.div>
          )}

          {activeTab === "performance" && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <RevenueOverview />
            </motion.div>
          )}

          {activeTab === "team" && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <UserOverview />
            </motion.div>
          )}

          {activeTab === "opportunity" && (
            <motion.div
              key="opportunity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <OpportunityFeed />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}