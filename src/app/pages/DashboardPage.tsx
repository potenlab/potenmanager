import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Users,
  Radar,
  ArrowRight,
  Compass,
  Eye,
  Send,
  MessageSquare,
  Trophy,
  DollarSign,
  Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { RevenueOverview } from "../components/dashboard/RevenueOverview";
import { UserOverview } from "../components/dashboard/UserOverview";
import { useLanguage } from "../context/LanguageContext";
import { useBizRadar, BizStage } from "../context/BizRadarContext";

type DashboardTab = "performance" | "team" | "radar";

function formatValue(v?: number): string {
  if (!v) return '-';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
}

const STAGE_ICON: Record<BizStage, React.ReactNode> = {
  discovered: <Compass size={14} className="text-purple-500" />,
  reviewing: <Eye size={14} className="text-blue-500" />,
  proposal: <Send size={14} className="text-amber-500" />,
  negotiation: <MessageSquare size={14} className="text-rose-500" />,
  won: <Trophy size={14} className="text-emerald-500" />,
  lost: <span className="text-gray-400 text-xs">✗</span>,
};

const STAGE_LABEL_KO: Record<BizStage, string> = {
  discovered: '발굴', reviewing: '검토', proposal: '제안', negotiation: '협상', won: '성사', lost: '실패',
};

const STAGE_LABEL_EN: Record<BizStage, string> = {
  discovered: 'Discovered', reviewing: 'Reviewing', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};

// ─── Biz Radar Dashboard Widget ─────────────────────────────────
function BizRadarWidget() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { items } = useBizRadar();

  const stages: BizStage[] = ['discovered', 'reviewing', 'proposal', 'negotiation', 'won'];
  const countByStage = stages.map(s => ({ stage: s, count: items.filter(i => i.stage === s).length }));
  const totalActive = items.filter(i => i.stage !== 'won' && i.stage !== 'lost').length;
  const totalValue = items.filter(i => i.stage !== 'lost').reduce((s, i) => s + (i.value || 0), 0);
  const weightedValue = items.filter(i => i.stage !== 'won' && i.stage !== 'lost').reduce((s, i) => s + (i.value || 0) * ((i.probability || 0) / 100), 0);
  const wonValue = items.filter(i => i.stage === 'won').reduce((s, i) => s + (i.value || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Radar size={18} className="text-amber-500" />
          {ko ? '비즈 레이더' : 'Biz Radar'}
        </h3>
        <button
          onClick={() => navigate('/radar')}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {ko ? '전체 보기' : 'View All'} <ArrowRight size={12} />
        </button>
      </div>

      <div className="p-5 flex-1">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalActive}</p>
            <p className="text-xs text-blue-500 mt-1">{ko ? '진행 중' : 'Active'}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatValue(wonValue)}</p>
            <p className="text-xs text-emerald-500 mt-1">{ko ? '성사 금액' : 'Won'}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{formatValue(weightedValue)}</p>
            <p className="text-xs text-amber-500 mt-1">{ko ? '가중 가치' : 'Weighted'}</p>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="space-y-2 mb-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {ko ? '파이프라인' : 'Pipeline'}
          </h4>
          {countByStage.map(({ stage, count }) => {
            const maxCount = Math.max(...countByStage.map(c => c.count), 1);
            const pct = (count / maxCount) * 100;
            return (
              <div key={stage} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-20 shrink-0">
                  {STAGE_ICON[stage]}
                  <span className="text-xs text-gray-600 font-medium">{ko ? STAGE_LABEL_KO[stage] : STAGE_LABEL_EN[stage]}</span>
                </div>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      stage === 'won' ? "bg-emerald-400" : stage === 'negotiation' ? "bg-rose-400" : stage === 'proposal' ? "bg-amber-400" : stage === 'reviewing' ? "bg-blue-400" : "bg-purple-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Recent Items */}
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {ko ? '최근 기회' : 'Recent'}
          </h4>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Radar size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{ko ? '등록된 기회가 없습니다' : 'No opportunities yet'}</p>
              <button
                onClick={() => navigate('/radar/new')}
                className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
              >
                <Plus size={12} /> {ko ? '첫 기회 추가' : 'Add first opportunity'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {items
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 5)
                .map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/radar/${item.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="shrink-0">{STAGE_ICON[item.stage]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.title || (ko ? '제목 없음' : 'Untitled')}</p>
                      {item.contactCompany && <p className="text-[11px] text-gray-400">{item.contactCompany}</p>}
                    </div>
                    {item.value && (
                      <span className="text-xs font-semibold text-gray-500 shrink-0 flex items-center gap-0.5">
                        <DollarSign size={10} />{formatValue(item.value)}
                      </span>
                    )}
                    <ArrowRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      id: "radar" as const,
      label: t("tab_opportunity"),
      icon: Radar,
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

          {activeTab === "radar" && (
            <motion.div
              key="radar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <BizRadarWidget />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
