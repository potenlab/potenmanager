import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { GoalOverview } from "../components/dashboard/GoalOverview";
import { useLanguage } from "../context/LanguageContext";

export function GoalPage() {
  const { language } = useLanguage();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
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
    </div>
  );
}
