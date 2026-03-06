import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  Users,
  DollarSign,
  UserCircle,
  TrendingUp,
  ArrowUpRight,
  Zap,
  Link2,
  Sparkles,
  Flag,
  Settings,
  Target,
  Lightbulb,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "../../lib/utils";
import { RevenueOverview } from "../components/dashboard/RevenueOverview";
import { UserOverview } from "../components/dashboard/UserOverview";
import { useLanguage } from "../context/LanguageContext";
import { GoalPage } from "./GoalPage";
import { StrategyTabContent } from "./GoalsPage";

type DashboardTab = "performance" | "team" | "goals" | "strategy" | "revenue" | "users";

// ─── Sample Revenue Data ────────────────────────────────────────
const SAMPLE_REVENUE_DATA = [
  { month: "Jan", revenue: 4200, mrr: 3800 },
  { month: "Feb", revenue: 5100, mrr: 4100 },
  { month: "Mar", revenue: 4800, mrr: 4300 },
  { month: "Apr", revenue: 6200, mrr: 4800 },
  { month: "May", revenue: 7100, mrr: 5200 },
  { month: "Jun", revenue: 6800, mrr: 5600 },
  { month: "Jul", revenue: 8200, mrr: 6100 },
  { month: "Aug", revenue: 9400, mrr: 6800 },
  { month: "Sep", revenue: 8800, mrr: 7200 },
  { month: "Oct", revenue: 10200, mrr: 7800 },
  { month: "Nov", revenue: 11500, mrr: 8400 },
  { month: "Dec", revenue: 12800, mrr: 9200 },
];

// ─── Sample User Data ───────────────────────────────────────────
const SAMPLE_USER_DATA = [
  { month: "Jan", dau: 120, mau: 850, signups: 45 },
  { month: "Feb", dau: 145, mau: 920, signups: 52 },
  { month: "Mar", dau: 168, mau: 1050, signups: 61 },
  { month: "Apr", dau: 190, mau: 1180, signups: 73 },
  { month: "May", dau: 215, mau: 1320, signups: 68 },
  { month: "Jun", dau: 240, mau: 1450, signups: 82 },
  { month: "Jul", dau: 278, mau: 1620, signups: 95 },
  { month: "Aug", dau: 310, mau: 1800, signups: 88 },
  { month: "Sep", dau: 345, mau: 1950, signups: 102 },
  { month: "Oct", dau: 380, mau: 2100, signups: 115 },
  { month: "Nov", dau: 420, mau: 2350, signups: 128 },
  { month: "Dec", dau: 460, mau: 2600, signups: 140 },
];

// ─── Revenue Dashboard (Sample) ─────────────────────────────────
function RevenueDashboard({ ko }: { ko: boolean }) {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={ko ? "월 매출" : "Monthly Revenue"}
          value="₩12,800,000"
          change="+12.3%"
          positive
          icon={<DollarSign size={16} />}
          color="emerald"
        />
        <MetricCard
          label="MRR"
          value="₩9,200,000"
          change="+9.5%"
          positive
          icon={<TrendingUp size={16} />}
          color="blue"
        />
        <MetricCard
          label={ko ? "성장률" : "Growth Rate"}
          value="23.4%"
          change="+2.1%p"
          positive
          icon={<ArrowUpRight size={16} />}
          color="purple"
        />
        <MetricCard
          label={ko ? "유료 고객" : "Paid Customers"}
          value="847"
          change="+34"
          positive
          icon={<UserCircle size={16} />}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {ko ? "매출 추이" : "Revenue Trend"}
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SAMPLE_REVENUE_DATA}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, ko ? "매출" : "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {ko ? "MRR 변화" : "MRR Growth"}
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SAMPLE_REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => [`₩${v.toLocaleString()}`, "MRR"]} />
                <Bar dataKey="mrr" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* API Integration CTA */}
      <ApiIntegrationCard
        ko={ko}
        title={ko ? "결제/매출 API 연동" : "Payment & Revenue API"}
        description={
          ko
            ? "Stripe, Toss Payments, 아임포트 등 결제 API 키를 연동하여 실시간 매출 데이터를 불러옵니다."
            : "Connect your Stripe, Toss Payments, or other payment APIs to pull real-time revenue data."
        }
        services={["Stripe", "Toss Payments", "Iamport"]}
      />
    </div>
  );
}

// ─── Users Dashboard (Sample) ───────────────────────────────────
function UsersDashboard({ ko }: { ko: boolean }) {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="DAU"
          value="460"
          change="+9.5%"
          positive
          icon={<Users size={16} />}
          color="blue"
        />
        <MetricCard
          label="MAU"
          value="2,600"
          change="+10.6%"
          positive
          icon={<Users size={16} />}
          color="purple"
        />
        <MetricCard
          label={ko ? "신규 가입" : "New Signups"}
          value="140"
          change="+9.4%"
          positive
          icon={<UserCircle size={16} />}
          color="emerald"
        />
        <MetricCard
          label={ko ? "리텐션" : "Retention"}
          value="68.2%"
          change="+1.3%p"
          positive
          icon={<TrendingUp size={16} />}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {ko ? "DAU / MAU 추이" : "DAU / MAU Trend"}
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SAMPLE_USER_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="dau" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="DAU" />
                <Line type="monotone" dataKey="mau" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} name="MAU" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {ko ? "신규 가입자" : "New Signups"}
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SAMPLE_USER_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="#8B5CF6" radius={[4, 4, 0, 0]} name={ko ? "가입자" : "Signups"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* API Integration CTA */}
      <ApiIntegrationCard
        ko={ko}
        title={ko ? "유저 분석 API 연동" : "User Analytics API"}
        description={
          ko
            ? "Google Analytics, Mixpanel, Amplitude 등 분석 API를 연동하여 실시간 유저 데이터를 불러옵니다."
            : "Connect Google Analytics, Mixpanel, or Amplitude to pull real-time user analytics."
        }
        services={["Google Analytics", "Mixpanel", "Amplitude"]}
      />
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────
const COLOR_MAP = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
};

function MetricCard({
  label, value, change, positive, icon, color,
}: {
  label: string; value: string; change: string; positive: boolean;
  icon: React.ReactNode; color: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn("rounded-xl border p-4", c.border, c.bg)}>
      <div className={cn("flex items-center gap-1.5 text-xs font-medium mb-2", c.text)}>
        {icon} {label}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className={cn("flex items-center gap-1 text-xs mt-2", positive ? "text-emerald-600" : "text-rose-600")}>
        {positive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
        {change}
      </div>
    </div>
  );
}

function ApiIntegrationCard({
  ko, title, description, services,
}: {
  ko: boolean; title: string; description: string; services: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-purple-50/50 p-6">
      <div className="absolute top-4 right-4 opacity-10">
        <Sparkles size={64} className="text-blue-500" />
      </div>
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-blue-100">
          <Link2 size={20} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-lg">{description}</p>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {services.map((s) => (
              <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600">
                {s}
              </span>
            ))}
          </div>
          <button
            onClick={() => alert(ko ? "API 키 연동 기능은 곧 제공됩니다!" : "API key integration coming soon!")}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Zap size={14} />
            {ko ? "API 키 연동하기" : "Connect API Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────
export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("performance");
  const { language } = useLanguage();
  const ko = language === "ko";
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const tabs: { id: DashboardTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "performance", label: ko ? "성과" : "Performance", icon: BarChart3, color: "emerald" },
    { id: "team", label: ko ? "팀" : "Team", icon: Users, color: "blue" },
    { id: "goals", label: ko ? "목표" : "Goals", icon: Target, color: "blue" },
    { id: "strategy", label: ko ? "전략" : "Strategy", icon: Lightbulb, color: "purple" },
    { id: "revenue", label: ko ? "매출" : "Revenue", icon: DollarSign, color: "purple" },
    { id: "users", label: ko ? "유저" : "Users", icon: UserCircle, color: "amber" },
  ];

  return (
    <div className="min-h-[calc(100%+3rem)] md:min-h-[calc(100%+4rem)] flex flex-col -m-6 md:-m-8 bg-[#FAFAFA]">
      {/* Header: Flag + Year + Settings */}
      <div className="shrink-0 bg-white px-6 md:px-8 pt-5 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <Flag size={18} />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{currentYear}</h1>
          </div>
          <button
            onClick={() => navigate("/organization")}
            className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={ko ? "조직 설정" : "Organization Settings"}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 md:px-8">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon size={16} className={active ? cn(COLOR_MAP[tab.color as keyof typeof COLOR_MAP].text) : ""} />
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="dashboard-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "performance" && <RevenueOverview />}
            {activeTab === "team" && <UserOverview />}
            {activeTab === "goals" && <GoalPage />}
            {activeTab === "strategy" && <StrategyTabContent />}
            {activeTab === "revenue" && <RevenueDashboard ko={ko} />}
            {activeTab === "users" && <UsersDashboard ko={ko} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
