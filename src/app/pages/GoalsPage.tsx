import { useState, useMemo, useRef, useCallback } from "react";
import { Link, Navigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useDrag, useDrop } from "react-dnd";
import {
  ChevronDown,
  ChevronRight,
  Flag,
  Milestone,
  Target,
  Calendar as CalendarIcon,
  CheckCircle2,
  MoreHorizontal,
  Search,
  ArrowUpRight,
  Loader2,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { GoalItem, Task } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useGoalContext } from "../context/GoalContext";
import { useTaskContext } from "../context/TaskContext";

// Combined type for the tree view
type HierarchyItem = (GoalItem | Task) & {
  childrenItems?: HierarchyItem[];
};

// ─── Redirect: /strategy → /organization ────────────────────────────
export function GoalsPage() {
  return <Navigate to="/organization" replace />;
}

// ─── Strategy Tab Content (embedded in GoalPage) ────────────────────
export function StrategyTabContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const { language, t } = useLanguage();

  // *** Context-connected data ***
  const { goals: ctxGoals, isLoading: goalsLoading } = useGoalContext();
  const { tasks: ctxTasks, isLoading: tasksLoading } = useTaskContext();

  const isLoading = goalsLoading || tasksLoading;

  const [rootOrder, setRootOrder] = useState<string[]>([]);

  // Build the hierarchy tree from context data
  const hierarchyData = useMemo(() => {
    const itemMap = new Map<string, HierarchyItem>();
    const rootItems: HierarchyItem[] = [];

    // Use goals and tasks from context (server-synced)
    const strategicGoals = ctxGoals.filter(g => !g.isUrgent);
    [...strategicGoals, ...ctxTasks].forEach(item => {
      itemMap.set(item.id, { ...item, childrenItems: [] });
    });

    itemMap.forEach(item => {
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId)!.childrenItems!.push(item);
      } else if (!item.parentId || !itemMap.has(item.parentId)) {
        // Root item if level is Year or has no valid parent
        if ('level' in item && (item.level === 'Year' || item.level === 'Quarter')) {
          rootItems.push(item);
        }
      }
    });

    // Apply saved root order
    if (rootOrder.length > 0) {
      rootItems.sort((a, b) => {
        const ai = rootOrder.indexOf(a.id);
        const bi = rootOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }

    return rootItems;
  }, [ctxGoals, ctxTasks, rootOrder]);

  const handleRootReorder = useCallback((dragIndex: number, hoverIndex: number) => {
    setRootOrder(prev => {
      const ids = prev.length > 0 ? [...prev] : hierarchyData.map(n => n.id);
      const [moved] = ids.splice(dragIndex, 1);
      ids.splice(hoverIndex, 0, moved);
      return ids;
    });
  }, [hierarchyData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            {language === 'ko' ? '\uB370\uC774\uD130 \uB85C\uB529 \uC911...' : 'Loading data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
          <Search className="text-gray-400 mr-3 shrink-0" size={18} />
          <input
            type="text"
            placeholder={t("search_goals")}
            className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Strategic Goals (Hierarchy) */}
      <div className="mb-2 flex items-center gap-2">
        <Flag size={16} className="text-purple-600" />
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          {language === 'ko' ? '\uC804\uB7B5 \uBAA9\uD45C' : 'Strategic Goals'}
        </h2>
        <div className="flex-1 border-t border-gray-100 ml-2" />
      </div>

      <div className="space-y-6">
        {hierarchyData.map((node, i) => (
          <GoalNodeCard key={node.id} node={node} level={0} index={i} onReorder={handleRootReorder} />
        ))}
        {hierarchyData.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Target size={32} />
            </div>
            <h3 className="text-gray-900 font-medium mb-1">{t("no_goals")}</h3>
            <p className="text-gray-500 text-sm">{t("start_goal")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const STRATEGY_DND_TYPE = "STRATEGY_CARD";

// ─── Goal Node Card (Hierarchy) ─────────────────────────────────────
function GoalNodeCard({ node, level, index, onReorder }: { node: HierarchyItem; level: number; index?: number; onReorder?: (dragIndex: number, hoverIndex: number) => void }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasChildren = node.childrenItems && node.childrenItems.length > 0;
  const { language, t } = useLanguage();
  const { removeGoal } = useGoalContext();

  // Drag & drop for reordering at same level
  const cardRef = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag, preview] = useDrag({
    type: STRATEGY_DND_TYPE,
    item: () => ({ index, id: node.id }),
    canDrag: index !== undefined && onReorder !== undefined,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const [{ isOver }, drop] = useDrop({
    accept: STRATEGY_DND_TYPE,
    canDrop: () => index !== undefined && onReorder !== undefined,
    hover: (item: { index: number; id: string }) => {
      if (index === undefined || !onReorder || item.index === index) return;
      onReorder(item.index, index);
      item.index = index;
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });
  preview(drop(cardRef));

  const isYear = level === 0;

  const containerClasses = cn(
    "relative transition-all duration-200",
    isYear ? "bg-white rounded-2xl border border-gray-200 shadow-card mb-6" : "",
    !isYear && "mt-2 ml-4 pl-4 border-l border-gray-100"
  );

  const title = language === 'ko' ? node.titleKo || node.title : node.title;
  const levelKey = `level_${node.level.toLowerCase()}` as any;
  const levelLabel = t(levelKey) || node.level;

  return (
    <div ref={cardRef} className={cn(containerClasses, isDragging && "opacity-40", isOver && "border-blue-300")}>
      {!isYear && (
        <div className="absolute left-[-1px] top-6 w-4 h-[1px] bg-gray-200" />
      )}

      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-colors group",
        isYear ? "bg-white" : "hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 bg-transparent"
      )}>
        {/* Drag handle */}
        {onReorder && (
          <div ref={(el) => { drag(el); }} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 -ml-2">
            <GripVertical size={16} />
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className={cn(
          "p-2.5 rounded-xl border shrink-0",
          node.level === 'Year' && "bg-purple-50 text-purple-600 border-purple-100",
          node.level === 'Quarter' && "bg-blue-50 text-blue-600 border-blue-100",
          node.level === 'Month' && "bg-emerald-50 text-emerald-600 border-emerald-100",
          node.level === 'Week' && "bg-amber-50 text-amber-600 border-amber-100",
          node.level === 'Day' && "bg-gray-50 text-gray-600 border-gray-200"
        )}>
          {node.level === 'Year' && <Flag size={20} />}
          {node.level === 'Quarter' && <Milestone size={20} />}
          {node.level === 'Month' && <Target size={20} />}
          {node.level === 'Week' && <CalendarIcon size={20} />}
          {node.level === 'Day' && <CheckCircle2 size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
              node.level === 'Year' && "bg-purple-50 text-purple-700 border-purple-200",
              node.level === 'Quarter' && "bg-blue-50 text-blue-700 border-blue-200",
              node.level === 'Month' && "bg-emerald-50 text-emerald-700 border-emerald-200",
              node.level === 'Week' && "bg-amber-50 text-amber-700 border-amber-200",
              node.level === 'Day' && "bg-gray-100 text-gray-700 border-gray-200"
            )}>
              {levelLabel}
            </span>
            {node.status === 'completed' && (
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={10} /> {t("status_completed")}
              </span>
            )}
          </div>
          <Link to={`/organization/${node.id}`}>
            <h3 className={cn(
              "font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer",
              isYear ? "text-lg" : "text-sm"
            )}>
              {title}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end w-32 gap-1.5">
            <div className="flex justify-between w-full text-[10px] text-gray-500 font-medium">
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

          <div className="flex items-center gap-2">
            <Link to={`/organization/${node.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
              <ArrowUpRight size={18} />
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setShowMenu(!showMenu); setConfirmDelete(false); }}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal size={18} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[140px] py-1"
                  onMouseLeave={() => { setShowMenu(false); setConfirmDelete(false); }}
                >
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} /> {language === 'ko' ? '삭제' : 'Delete'}
                    </button>
                  ) : (
                    <div className="px-3 py-2">
                      <p className="text-xs text-gray-600 mb-2">
                        {language === 'ko' ? '정말 삭제하시겠습니까?' : 'Are you sure?'}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { removeGoal(node.id); setShowMenu(false); }}
                          className="flex-1 text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          {language === 'ko' ? '확인' : 'Yes'}
                        </button>
                        <button
                          onClick={() => { setConfirmDelete(false); setShowMenu(false); }}
                          className="flex-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                        >
                          {language === 'ko' ? '취소' : 'No'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(isYear ? "p-4 pt-0" : "")}>
              {node.childrenItems!.map((child, i) => (
                <GoalNodeCard key={child.id} node={child} level={level + 1} index={i} onReorder={(dragIdx, hoverIdx) => {
                  const kids = [...node.childrenItems!];
                  const [moved] = kids.splice(dragIdx, 1);
                  kids.splice(hoverIdx, 0, moved);
                  node.childrenItems = kids;
                }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

