import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Radar, Sparkles, FileText, Clock, BarChart3, MessageSquare,
  Image, Calculator, Zap, ChevronLeft, Check, Plus,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";

interface Tool {
  id: string;
  icon: React.ReactNode;
  color: string;
  titleKo: string;
  titleEn: string;
  descKo: string;
  descEn: string;
  detailKo: string;
  detailEn: string;
  status: "active" | "coming_soon" | "beta";
  externalUrl?: string; // 외부 서비스 링크
}

const TOOLS: Tool[] = [
  {
    id: "biz-radar",
    icon: <Radar size={28} />,
    color: "bg-blue-100 text-blue-600",
    titleKo: "비즈 레이더",
    titleEn: "Biz Radar",
    descKo: "영업 파이프라인과 비즈니스 기회를 추적하고 관리하세요.",
    descEn: "Track and manage your sales pipeline and business opportunities.",
    detailKo: "클라이언트 발굴부터 계약 체결까지 전체 영업 파이프라인을 시각적으로 관리합니다. 단계별 확률, 예상 매출, 담당자 배정 등을 한눈에 파악할 수 있습니다.",
    detailEn: "Visually manage your entire sales pipeline from discovery to closing. Track stage probabilities, expected revenue, and assignees at a glance.",
    status: "active",
  },
  {
    id: "poten-paper",
    icon: <FileText size={28} />,
    color: "bg-emerald-100 text-emerald-600",
    titleKo: "포텐페이퍼",
    titleEn: "Poten Paper",
    descKo: "AI 사업계획서 생성기. 아이디어만 입력하면 완성된 사업계획서를 만들어줍니다.",
    descEn: "AI Business Plan Generator. Just input your idea and get a complete business plan.",
    detailKo: "사업 아이디어, 타겟 시장, 비즈니스 모델을 입력하면 AI가 시장 분석, 경쟁사 분석, 재무 계획, 마케팅 전략까지 포함된 완성도 높은 사업계획서를 자동으로 생성합니다. 투자 유치, 정부 지원사업 신청 등에 바로 활용할 수 있습니다.",
    detailEn: "Input your business idea, target market, and business model. AI generates a comprehensive business plan including market analysis, competitor analysis, financial projections, and marketing strategy. Ready for investor pitches and government grant applications.",
    status: "active",
    externalUrl: "https://thepotential.kr/poten-paper",
  },
  {
    id: "card-news",
    icon: <Image size={28} />,
    color: "bg-pink-100 text-pink-600",
    titleKo: "카드뉴스 생성기",
    titleEn: "Card News Maker",
    descKo: "AI로 카드뉴스를 자동으로 디자인하고 생성합니다.",
    descEn: "Automatically design and generate card news with AI.",
    detailKo: "텍스트를 입력하면 AI가 레이아웃, 색상, 이미지를 자동으로 배치하여 카드뉴스를 생성합니다. SNS 마케팅에 바로 활용할 수 있습니다.",
    detailEn: "Input text and AI automatically arranges layout, colors, and images to create card news ready for social media marketing.",
    status: "coming_soon",
  },
  {
    id: "estimate",
    icon: <Calculator size={28} />,
    color: "bg-amber-100 text-amber-600",
    titleKo: "견적서 작성기",
    titleEn: "Estimate Builder",
    descKo: "프로젝트 견적서를 빠르게 작성하고 공유하세요.",
    descEn: "Quickly create and share project estimates.",
    detailKo: "항목별 단가, 공수, 할인율을 입력하면 전문적인 견적서가 자동으로 생성됩니다. PDF 내보내기와 클라이언트 공유 링크를 지원합니다.",
    detailEn: "Enter unit prices, labor, and discounts to auto-generate professional estimates. Supports PDF export and client sharing links.",
    status: "coming_soon",
  },
  {
    id: "time-tracker",
    icon: <Clock size={28} />,
    color: "bg-cyan-100 text-cyan-600",
    titleKo: "타임트래커",
    titleEn: "Time Tracker",
    descKo: "프로젝트별 투입시간을 기록하고 분석하세요.",
    descEn: "Track and analyze time spent on each project.",
    detailKo: "프로젝트/태스크별 투입시간을 실시간으로 기록합니다. 월간 리포트로 팀 생산성을 분석하고, 정산 근거 자료로 활용할 수 있습니다.",
    detailEn: "Record time in real-time per project/task. Analyze team productivity with monthly reports and use as billing documentation.",
    status: "coming_soon",
  },
  {
    id: "meeting-summary",
    icon: <MessageSquare size={28} />,
    color: "bg-violet-100 text-violet-600",
    titleKo: "회의록 AI 요약",
    titleEn: "Meeting AI Summary",
    descKo: "회의 내용을 AI가 자동으로 요약하고 액션아이템을 추출합니다.",
    descEn: "AI automatically summarizes meetings and extracts action items.",
    detailKo: "회의 녹음이나 메모를 입력하면 AI가 핵심 내용을 요약하고, 액션아이템과 담당자를 자동으로 추출합니다. 회의록을 팀에 바로 공유할 수 있습니다.",
    detailEn: "Input meeting recordings or notes and AI summarizes key points, extracts action items and assignees. Share meeting notes with your team instantly.",
    status: "coming_soon",
  },
  {
    id: "analytics",
    icon: <BarChart3 size={28} />,
    color: "bg-orange-100 text-orange-600",
    titleKo: "성과 분석 대시보드",
    titleEn: "Performance Analytics",
    descKo: "팀과 프로젝트의 성과를 시각적으로 분석합니다.",
    descEn: "Visually analyze team and project performance.",
    detailKo: "태스크 완료율, 프로젝트 진행 현황, 팀원별 기여도 등을 차트와 그래프로 한눈에 파악합니다. 주간/월간 리포트를 자동으로 생성합니다.",
    detailEn: "View task completion rates, project progress, and team contributions through charts and graphs. Auto-generate weekly/monthly reports.",
    status: "coming_soon",
  },
];

// ─── Tool Detail View ──────────────────────────────────────────
function ToolDetail({ tool, onBack, ko }: { tool: Tool; onBack: () => void; ko: boolean }) {
  const { isPersonal, currentOrg } = useWorkspace();
  const [added, setAdded] = useState(false);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ChevronLeft size={16} />
        {ko ? "도구 목록" : "Tools"}
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-8 flex items-start gap-5">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", tool.color)}>
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {ko ? tool.titleKo : tool.titleEn}
              </h1>
              {tool.status === "beta" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">BETA</span>
              )}
              {tool.status === "coming_soon" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">COMING SOON</span>
              )}
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {ko ? tool.descKo : tool.descEn}
            </p>
          </div>
        </div>

        {/* Detail */}
        <div className="px-8 pb-6">
          <div className="bg-gray-50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{ko ? "상세 설명" : "Details"}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {ko ? tool.detailKo : tool.detailEn}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="px-8 pb-8 space-y-2">
          {/* External link button */}
          {tool.externalUrl && (
            <a
              href={tool.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {ko ? "서비스 바로가기 →" : "Go to Service →"}
            </a>
          )}
          {tool.status === "coming_soon" ? (
            <button
              disabled
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 text-sm font-bold cursor-not-allowed"
            >
              {ko ? "준비 중입니다" : "Coming Soon"}
            </button>
          ) : added ? (
            <button
              disabled
              className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-bold flex items-center justify-center gap-2"
            >
              <Check size={16} />
              {ko ? "추가 완료" : "Added"}
            </button>
          ) : (
            <button
              onClick={() => setAdded(true)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              {isPersonal
                ? (ko ? "내 워크스페이스에 추가하기" : "Add to My Workspace")
                : (ko ? `${currentOrg?.name}에 추가하기` : `Add to ${currentOrg?.name}`)
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tools Page ────────────────────────────────────────────────
export function ToolsPage() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  if (selectedTool) {
    return <ToolDetail tool={selectedTool} onBack={() => setSelectedTool(null)} ko={ko} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap size={22} className="text-blue-600" />
          {ko ? "도구" : "Tools"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {ko ? "워크스페이스에 필요한 도구를 추가하세요" : "Add tools to your workspace"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setSelectedTool(tool)}
            className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3", tool.color)}>
              {tool.icon}
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {ko ? tool.titleKo : tool.titleEn}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {ko ? tool.descKo : tool.descEn}
            </p>
            {tool.status === "coming_soon" && (
              <span className="inline-block mt-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
                COMING SOON
              </span>
            )}
            {tool.status === "beta" && (
              <span className="inline-block mt-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                BETA
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
