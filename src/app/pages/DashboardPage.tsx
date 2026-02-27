import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { OpportunityFeed } from "../components/dashboard/OpportunityFeed";
import { RevenueOverview } from "../components/dashboard/RevenueOverview";
import { UserOverview } from "../components/dashboard/UserOverview";
import { useLanguage } from "../context/LanguageContext";

type DashboardTab = "performance" | "team" | "opportunity";

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("performance");
  const { t } = useLanguage();

  const tabs = [
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
      <div className="grid grid-cols-3 gap-4">
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