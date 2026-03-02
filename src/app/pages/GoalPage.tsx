import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Sparkles,
  Building2,
  Users,
  Plus,
  Pencil,
  Loader2,
  Calendar,
  User as UserIcon,
  Settings,
  Target,
  Lightbulb,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";
import { usePermission } from "../context/PermissionContext";
import { hasPermission, type Role } from "../../lib/permissions";
import { useGoalContext } from "../context/GoalContext";
import { StrategyTabContent } from "./GoalsPage";

export function GoalPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const navigate = useNavigate();
  const { org, createOrg, isLoading } = useInvite();
  const { currentUser, members } = usePermission();
  const { goals, urgentGoals } = useGoalContext();
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

  const handleCreateOrg = async (name: string) => {
    if (!name.trim() || creating) return;
    setCreating(true);
    const newOrg = await createOrg(name.trim());
    setCreating(false);
    if (newOrg) {
      navigate("/organization/setup");
    }
  };

  const handleSoloStart = () => {
    const soloName = ko
      ? `${currentUser.name}의 워크스페이스`
      : `${currentUser.name}'s Workspace`;
    handleCreateOrg(soloName);
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
            {ko ? "조직을 생성하세요" : "Create Your Organization"}
          </h1>
          <p className="text-gray-500 text-sm">
            {ko
              ? "팀원을 초대하고 목표를 설정하려면 조직이 필요합니다."
              : "You need an organization to invite members and set goals."}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              {ko ? "조직 이름" : "Organization Name"}
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={ko ? "예: 포텐랩" : "e.g. Poten Lab"}
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
            {ko ? "조직 생성" : "Create Organization"}
          </button>
        </div>

        {/* Solo / 1인기업 */}
        <div className="text-center mt-6">
          <button
            onClick={handleSoloStart}
            disabled={creating}
            className="text-sm text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            {ko ? "1인기업으로 시작하기 →" : "Start as solo business →"}
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
        {/* Banner */}
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
          <h1 className="text-xl font-bold text-gray-900 mb-1">{org.name}</h1>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {ko
                ? `멤버 ${members.length}명`
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
          {ko ? `${currentYear}년 목표` : `${currentYear} Goals`}
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
          {ko ? "전략" : "Strategy"}
        </button>
      </div>

      {/* Goals Tab Content */}
      {activeTab === "goals" && (
        <>
          {hasGoals ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-500" />
                  {ko ? "핵심 목표" : "Core Goal"}
                </h3>
                {canEdit && (
                  <Link
                    to="/organization/edit"
                    className="text-xs text-gray-400 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Pencil size={12} />
                    {ko ? "수정" : "Edit"}
                  </Link>
                )}
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
                    <p className="text-xs text-gray-400 mt-1">
                      {ko ? "클릭하여 상세 보기" : "Click to view details"}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 mt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                </Link>

                {/* Category goals - clickable to detail */}
                {categoryGoals.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium mb-3">
                      {ko ? "세부 항목" : "Categories"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryGoals.map((g) => (
                        <Link
                          key={g.id}
                          to={`/organization/${g.id}`}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors group"
                        >
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              g.status === "completed"
                                ? "bg-emerald-500"
                                : g.status === "in-progress"
                                ? "bg-blue-500"
                                : "bg-gray-300"
                            )}
                          />
                          <p className="text-sm text-gray-700 truncate flex-1 group-hover:text-blue-600 transition-colors">
                            {ko ? (g.titleKo || g.title) : g.title}
                          </p>
                          <ArrowRight
                            size={12}
                            className="text-gray-300 group-hover:text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                          />
                        </Link>
                      ))}
                    </div>
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
                  {ko ? "올해의 목표를 설정해주세요" : "Set your goals for this year"}
                </p>
                <p className="text-blue-100 text-xs mt-0.5">
                  {ko
                    ? "핵심 목표와 카테고리별 계획을 세워보세요"
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

      {/* Members Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            {ko ? "팀 멤버" : "Team Members"}
          </h3>
          <Link
            to="/team"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            {ko ? "전체 보기" : "View all"}
            <ArrowRight size={12} />
          </Link>
        </div>
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {members.slice(0, 6).map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/team/${member.id}`)}
              >
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon size={14} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.name}
                    {member.id === currentUser.id && (
                      <span className="text-[10px] text-blue-400 ml-1">
                        {ko ? "(나)" : "(me)"}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400 capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
            {members.length > 6 && (
              <span className="text-xs text-gray-400 px-2">
                +{members.length - 6}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
