import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronDown, 
  ChevronRight, 
  Flag, 
  Milestone, 
  Target, 
  Calendar, 
  CheckCircle2, 
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useLanguage } from "../../context/LanguageContext";

// Types
type HierarchyLevel = "YEAR" | "QUARTER" | "MONTH" | "WEEK" | "DAY";

interface GoalNode {
  id: string;
  type: HierarchyLevel;
  title: string;
  titleKo?: string;
  progress: number;
  status: "ontrack" | "atrisk" | "delayed" | "completed";
  assignees?: string[];
  children?: GoalNode[];
  dateRange?: string;
}

const mockData: GoalNode = {
  id: "g-1",
  type: "YEAR",
  title: "Achieve $10M ARR & Market Leadership in AI SaaS",
  titleKo: "연말까지 ARR $10M 달성 및 AI SaaS 시장 선도",
  progress: 45,
  status: "ontrack",
  dateRange: "2024",
  children: [
    {
      id: "m-1",
      type: "QUARTER",
      title: "Q1: Launch Enterprise Beta & Secure 50 Pilot Customers",
      titleKo: "1분기: 엔터프라이즈 베타 출시 및 50개 파일럿 고객 확보",
      progress: 80,
      status: "ontrack",
      dateRange: "Jan - Mar",
      children: [
        {
          id: "o-1",
          type: "MONTH",
          title: "March: Finalize Core Features & Security Audit",
          titleKo: "3월: 핵심 기능 확정 및 보안 감사 완료",
          progress: 65,
          status: "atrisk",
          dateRange: "March 2024",
          children: [
            {
              id: "w-1",
              type: "WEEK",
              title: "Week 3: Complete SSO Implementation",
              titleKo: "3주차: SSO 구현 완료",
              progress: 30,
              status: "ontrack",
              dateRange: "Mar 18 - 24",
              children: [
                { id: "t-1", type: "DAY", title: "Review Auth0 Documentation", titleKo: "Auth0 문서 검토", progress: 100, status: "completed", assignees: ["u1"] },
                { id: "t-2", type: "DAY", title: "Setup Dev Environment for SSO", titleKo: "SSO 개발 환경 설정", progress: 100, status: "completed", assignees: ["u2"] },
                { id: "t-3", type: "DAY", title: "Implement Login Flow", titleKo: "로그인 흐름 구현", progress: 40, status: "ontrack", assignees: ["u1", "u2"] },
                { id: "t-4", type: "DAY", title: "Write Integration Tests", titleKo: "통합 테스트 작성", progress: 0, status: "delayed", assignees: ["u1"] },
              ]
            }
          ]
        }
      ]
    }
  ]
};

const LevelIcon = ({ type }: { type: HierarchyLevel }) => {
  switch (type) {
    case "YEAR": return <Flag className="text-purple-600" size={18} />;
    case "QUARTER": return <Milestone className="text-blue-600" size={18} />;
    case "MONTH": return <Target className="text-emerald-600" size={18} />;
    case "WEEK": return <Calendar className="text-orange-600" size={18} />;
    case "DAY": return <CheckCircle2 className="text-gray-500" size={18} />;
  }
};

const LevelBadge = ({ type }: { type: HierarchyLevel }) => {
  const { t } = useLanguage();
  const styles = {
    YEAR: "bg-purple-50 text-purple-700 border-purple-200",
    QUARTER: "bg-blue-50 text-blue-700 border-blue-200",
    MONTH: "bg-emerald-50 text-emerald-700 border-emerald-200",
    WEEK: "bg-orange-50 text-orange-700 border-orange-200",
    DAY: "bg-gray-100 text-gray-700 border-gray-200",
  };
  
  // Mapping type to translation key
  const labelKey = `level_${type.toLowerCase()}` as any;
  
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", styles[type])}>
      {t(labelKey)}
    </span>
  );
};

export function GoalHierarchy() {
  const { t } = useLanguage();
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Target size={18} className="text-blue-600" />
          {t("strategic_alignment")}
        </h3>
        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          {t("view_full_map")}
        </button>
      </div>
      <div className="p-4">
        <HierarchyNode node={mockData} level={0} expanded={true} />
      </div>
    </div>
  );
}

function HierarchyNode({ node, level, expanded: defaultExpanded = false }: { node: GoalNode; level: number; expanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = node.children && node.children.length > 0;
  const { language, t } = useLanguage();

  const title = language === 'ko' ? node.titleKo || node.title : node.title;

  return (
    <div className="relative">
      {/* Connector Line */}
      {level > 0 && (
        <div 
          className="absolute left-[-20px] top-[24px] w-[20px] h-[1px] bg-gray-200"
          style={{ left: -16 }}
        />
      )}
      {level > 0 && (
        <div 
          className="absolute left-[-20px] top-[-10px] w-[1px] h-[34px] bg-gray-200"
          style={{ left: -17 }}
        />
      )}

      <div 
        className={cn(
          "group flex items-center gap-3 p-3 rounded-xl border mb-3 transition-all duration-200",
          level === 0 ? "bg-white border-purple-100 shadow-sm" : "bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm"
        )}
        style={{ marginLeft: level * 8 }} // indentation visual
      >
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
          <LevelIcon type={node.type} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <LevelBadge type={node.type} />
            <span className="text-xs text-gray-400 font-medium">{node.dateRange}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        </div>

        {/* Progress & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1 w-24">
            <div className="flex justify-between w-full text-[10px] text-gray-500">
              <span>{t("progress")}</span>
              <span>{node.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  node.progress === 100 ? "bg-emerald-500" : 
                  node.progress > 60 ? "bg-blue-500" : "bg-amber-500"
                )}
                style={{ width: `${node.progress}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center -space-x-2">
            {node.assignees?.map((u, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] text-blue-600 font-bold">
                {u === "u1" ? "SK" : "DP"}
              </div>
            ))}
            <button className="w-6 h-6 rounded-full bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors">
              <Plus size={12} />
            </button>
          </div>

          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-6 pl-4 border-l border-gray-100"
          >
            {node.children!.map((child) => (
              <HierarchyNode key={child.id} node={child} level={level + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
