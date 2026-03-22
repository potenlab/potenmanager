import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Rocket, Code2, Megaphone, Film, ArrowLeft } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../../lib/utils";

const INDUSTRIES = [
  { id: "dev_agency", labelKo: "에이전시 (개발)", labelEn: "Dev Agency", icon: Code2, color: "bg-violet-100 text-violet-600 border-violet-200" },
  { id: "marketing_agency", labelKo: "에이전시 (마케팅)", labelEn: "Marketing Agency", icon: Megaphone, color: "bg-pink-100 text-pink-600 border-pink-200" },
  { id: "production", labelKo: "에이전시 (프로덕션)", labelEn: "Production", icon: Film, color: "bg-amber-100 text-amber-600 border-amber-200" },
  { id: "startup", labelKo: "스타트업", labelEn: "Startup", icon: Rocket, color: "bg-emerald-100 text-emerald-600 border-emerald-200" },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || `org-${Date.now().toString(36)}`;
}

export function OrgCreatePage() {
  const { language } = useLanguage();
  const { createOrg } = useWorkspace();
  const navigate = useNavigate();
  const ko = language === "ko";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [industry, setIndustry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(generateSlug(val));
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError(ko ? "조직 이름을 입력하세요" : "Enter org name"); return; }
    if (!slug.trim()) { setError(ko ? "슬러그를 입력하세요" : "Enter slug"); return; }
    if (!industry) { setError(ko ? "업종을 선택하세요" : "Select industry"); return; }

    setLoading(true);
    setError("");
    try {
      await createOrg(name.trim(), slug.trim(), industry);
      navigate("/tasks");
    } catch (e: any) {
      setError(e.message || (ko ? "조직 생성에 실패했습니다" : "Failed to create org"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={16} />
          {ko ? "뒤로가기" : "Back"}
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{ko ? "조직 만들기" : "Create Organization"}</h1>
              <p className="text-sm text-gray-500">{ko ? "팀과 함께 사용할 워크스페이스를 만드세요" : "Create a workspace for your team"}</p>
            </div>
          </div>

          {/* Org Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{ko ? "조직 이름" : "Organization Name"}</label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={ko ? "예: 포텐랩" : "e.g. Potenlab"}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              autoFocus
            />
          </div>

          {/* Slug */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {ko ? "URL 슬러그" : "URL Slug"}
              <span className="text-gray-400 font-normal ml-1">(영문)</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 shrink-0">potenmanager.app/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); setSlugEdited(true); }}
                placeholder="potenlab"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              />
            </div>
          </div>

          {/* Industry */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{ko ? "업종 선택" : "Select Industry"}</label>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map((ind) => {
                const Icon = ind.icon;
                const selected = industry === ind.id;
                return (
                  <button
                    key={ind.id}
                    onClick={() => setIndustry(ind.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                      selected
                        ? "border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon size={16} />
                    {ko ? ind.labelKo : ind.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !industry}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-bold transition-all",
              loading || !name.trim() || !industry
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
            )}
          >
            {loading ? (ko ? "생성 중..." : "Creating...") : (ko ? "조직 만들기" : "Create Organization")}
          </button>
        </div>
      </div>
    </div>
  );
}
