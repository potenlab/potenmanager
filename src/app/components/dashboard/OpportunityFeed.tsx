import {
  Zap,
  Bot,
  Sparkles,
  Globe,
  Briefcase,
  Loader2,
  CheckCircle,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";
import { useOpportunityContext, Opportunity } from "../../context/OpportunityContext";
import { toast } from "sonner";

export function OpportunityFeed() {
  const { language, t } = useLanguage();
  const { opportunities, addOpportunity, removeOpportunity } = useOpportunityContext();
  const [runningFlowId, setRunningFlowId] = useState<string | null>(null);
  const [completedFlowId, setCompletedFlowId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleRunOpenFlow = (opp: Opportunity) => {
    setRunningFlowId(opp.id);
    setTimeout(() => {
      setRunningFlowId(null);
      setCompletedFlowId(opp.id);
      toast.success(
        language === 'ko'
          ? `OpenFlow 성공: 제안서가 작성되었습니다.`
          : `OpenFlow Success: Proposal has been drafted.`
      );
      setTimeout(() => setCompletedFlowId(null), 3000);
    }, 2500);
  };

  const handleDelete = (id: string) => {
    removeOpportunity(id);
    toast.success(language === 'ko' ? '기회가 삭제되었습니다.' : 'Opportunity deleted.');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-500 fill-yellow-500" />
          {t("opportunity_feed")}
        </h3>
        <div className="flex items-center gap-2">
          {opportunities.length > 0 && (
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
              {opportunities.length} {t("new_matches")}
            </span>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Plus size={14} />
            {t("add_opportunity" as any)}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <AddOpportunityForm
          onAdd={(opp) => {
            addOpportunity(opp);
            setShowForm(false);
            toast.success(language === 'ko' ? '기회가 추가되었습니다.' : 'Opportunity added.');
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-gray-50 mb-4">
              <Sparkles size={32} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              {t("no_opportunities" as any)}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="group relative bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
                {/* AI Score Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-100 text-xs font-bold">
                  <Bot size={14} />
                  {opp.matchScore}% {t("ai_match")}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(opp.id)}
                  className="absolute top-12 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  title={t("delete_opportunity" as any)}
                >
                  <Trash2 size={14} />
                </button>

                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
                  {opp.source === "Upwork" ? <Globe size={12} className="text-green-600" /> :
                   opp.source === "LinkedIn" ? <Briefcase size={12} className="text-blue-600" /> :
                   <Zap size={12} className="text-purple-600" />
                  }
                  {opp.source} • {language === 'ko' ? opp.postedAtKo || opp.postedAt : opp.postedAt}
                </div>

                <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1 pr-24">
                  {language === 'ko' ? opp.titleKo || opp.title : opp.title}
                </h4>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-grow">
                  {language === 'ko' ? opp.descriptionKo || opp.description : opp.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {opp.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded-md border border-gray-100">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                  <div className="text-xs font-semibold text-gray-900">
                    {language === 'ko' ? opp.budgetKo || opp.budget : opp.budget}
                  </div>
                  <button
                    onClick={() => handleRunOpenFlow(opp)}
                    disabled={runningFlowId === opp.id}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
                      completedFlowId === opp.id
                        ? "bg-emerald-500 text-white shadow-emerald-100"
                        : "bg-primary hover:bg-primary-hover text-white shadow-blue-100"
                    )}
                  >
                    {runningFlowId === opp.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {language === 'ko' ? "분석 중..." : "Analyzing..."}
                      </>
                    ) : completedFlowId === opp.id ? (
                      <>
                        <CheckCircle size={14} />
                        {language === 'ko' ? "완료됨" : "Done"}
                      </>
                    ) : (
                      <>
                        <Zap size={14} className="fill-white" />
                        {t("run_openflow")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline Add Form ─────────────────────────────────────────────────
function AddOpportunityForm({
  onAdd,
  onCancel,
}: {
  onAdd: (opp: Opportunity) => void;
  onCancel: () => void;
}) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<Opportunity["source"]>("Direct");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [matchScore, setMatchScore] = useState(80);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const timeAgo = language === 'ko' ? '방금 전' : 'just now';

    const opp: Opportunity = {
      id: `opp-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || title.trim(),
      source,
      budget: budget.trim() || '-',
      matchScore,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      postedAt: timeAgo,
      postedAtKo: '방금 전',
    };

    onAdd(opp);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100 bg-blue-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">
          {t("add_opportunity" as any)}
        </h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder={t("opp_title" as any)}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          required
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as Opportunity["source"])}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          <option value="Direct">Direct</option>
          <option value="Upwork">Upwork</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Fiverr">Fiverr</option>
        </select>
        <input
          type="text"
          placeholder={t("opp_budget" as any)}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <input
          type="text"
          placeholder={t("opp_tags" as any)}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>
      <textarea
        placeholder={t("opp_description" as any)}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-600">{t("opp_match_score" as any)}: {matchScore}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={matchScore}
          onChange={(e) => setMatchScore(Number(e.target.value))}
          className="flex-1 h-1.5 accent-blue-500"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t("cancel" as any)}
        </button>
        <button
          type="submit"
          className="text-xs px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors font-medium"
        >
          {t("save" as any)}
        </button>
      </div>
    </form>
  );
}
