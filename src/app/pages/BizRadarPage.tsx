import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  Plus, Search, Compass, Eye, Send, MessageSquare, Trophy,
  LayoutGrid, List as ListIcon, MoreHorizontal, Pencil,
  Trash2, X, Check, Building2, User as UserIcon, Calendar,
  DollarSign, Percent, Tag, Briefcase, Link2, Globe, Loader2,
  RefreshCw, ExternalLink, Clock, ArrowDownUp, Users,
  ChevronLeft, ChevronRight, Sparkles, ArrowDown, ArrowUp, BarChart3, ArrowRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useBizRadar, BizRadarItem, BizStage, BizType, BizCategory, ConnectionType } from "../context/BizRadarContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";
import { api } from "../../lib/api";

const DRAG_TYPE = "BIZ_CARD";

interface DragItem { id: string; column: BizStage; }

const STAGE_CONFIG: Record<BizStage, { label: string; labelKo: string; icon: React.ReactNode; color: string; headerBg: string }> = {
  discovered: { label: "Discovered", labelKo: "발굴", icon: <Compass size={16} className="text-purple-500" />, color: "text-purple-600", headerBg: "bg-purple-50" },
  reviewing:  { label: "Reviewing",  labelKo: "검토", icon: <Eye size={16} className="text-blue-500" />,      color: "text-blue-600",   headerBg: "bg-blue-50" },
  proposal:   { label: "Proposal",   labelKo: "제안", icon: <Send size={16} className="text-amber-500" />,     color: "text-amber-600",  headerBg: "bg-amber-50" },
  negotiation:{ label: "Negotiation",labelKo: "협상", icon: <MessageSquare size={16} className="text-rose-500" />, color: "text-rose-600", headerBg: "bg-rose-50" },
  won:        { label: "Won",        labelKo: "성사", icon: <Trophy size={16} className="text-emerald-500" />, color: "text-emerald-600", headerBg: "bg-emerald-50" },
  lost:       { label: "Lost",       labelKo: "실패", icon: <X size={16} className="text-gray-400" />,         color: "text-gray-500",   headerBg: "bg-gray-100" },
};

const TYPE_COLORS: Record<BizType, { bg: string; text: string; label: string; labelKo: string }> = {
  project:     { bg: 'bg-blue-50',   text: 'text-blue-600',    label: 'Project',     labelKo: '프로젝트' },
  funding:     { bg: 'bg-green-50',  text: 'text-green-600',   label: 'Funding',     labelKo: '지원사업' },
  partnership: { bg: 'bg-purple-50', text: 'text-purple-600',  label: 'Partnership', labelKo: '파트너십' },
  investment:  { bg: 'bg-amber-50',  text: 'text-amber-600',   label: 'Investment',  labelKo: '투자' },
  other:       { bg: 'bg-gray-50',   text: 'text-gray-600',    label: 'Other',       labelKo: '기타' },
};

const CONNECTION_TYPE_COLORS: Record<ConnectionType, { bg: string; text: string; label: string; labelKo: string }> = {
  agent:       { bg: 'bg-indigo-50',  text: 'text-indigo-600',  label: 'Agent',       labelKo: '대리점' },
  distributor: { bg: 'bg-teal-50',    text: 'text-teal-600',    label: 'Distributor', labelKo: '유통' },
  supplier:    { bg: 'bg-orange-50',  text: 'text-orange-600',  label: 'Supplier',    labelKo: '공급사' },
  partner:     { bg: 'bg-purple-50',  text: 'text-purple-600',  label: 'Partner',     labelKo: '파트너' },
  client:      { bg: 'bg-blue-50',    text: 'text-blue-600',    label: 'Client',      labelKo: '고객사' },
  other:       { bg: 'bg-gray-50',    text: 'text-gray-600',    label: 'Other',       labelKo: '기타' },
};

const ACTIVE_STAGES: BizStage[] = ['discovered', 'reviewing', 'proposal', 'negotiation', 'won'];

function formatValue(v?: number): string {
  if (!v) return '-';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
}

// ─── Biz Card ─────────────────────────────────────────────────────
function BizCard({ item, column, isSelecting, isSelected, onToggleSelect, onContextMenu }: {
  item: BizRadarItem; column: BizStage;
  isSelecting: boolean; isSelected: boolean; onToggleSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();
  const tc = item.category === 'connection' && item.connectionType
    ? CONNECTION_TYPE_COLORS[item.connectionType]
    : TYPE_COLORS[item.type];

  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: item.id, column },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const assignee = item.assigneeId ? members.find(m => m.id === item.assigneeId) : null;
  const daysLeft = item.deadline ? Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86400000) : null;

  const handleClick = () => {
    if (isDragging) return;
    if (isSelecting) onToggleSelect(item.id);
    else navigate(`/radar/${item.id}`);
  };

  return (
    <div
      ref={dragRef}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, item.id); }}
      className={cn(
        "bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative",
        isDragging ? "opacity-40 border-blue-300 shadow-lg scale-[0.97] ring-2 ring-blue-200"
          : isSelected ? "border-blue-400 ring-2 ring-blue-100 bg-blue-50/30" : "border-gray-100"
      )}
    >
      {/* Selection checkbox */}
      <div className={cn("absolute top-3 left-3 z-10 transition-all",
        isSelecting || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
          className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shadow-sm transition-all",
            isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white hover:border-blue-400")}>
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      </div>

      <div className="flex justify-between items-start mb-2">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", tc.bg, tc.text)}>
          {ko ? tc.labelKo : tc.label}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onContextMenu?.(e, item.id); }} className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h4 className={cn("font-medium text-sm mb-1 leading-snug text-gray-900",
        item.stage === 'lost' && "text-gray-400 line-through"
      )}>{item.title || (ko ? '제목 없음' : 'Untitled')}</h4>

      {item.contactCompany && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <Building2 size={11} /> {item.contactCompany}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mb-3">
        {item.value && (
          <span className="flex items-center gap-1 font-semibold text-gray-600">
            <DollarSign size={11} /> {formatValue(item.value)}
          </span>
        )}
        {item.probability != null && (
          <span className="flex items-center gap-1">
            <Percent size={11} /> {item.probability}%
          </span>
        )}
        {daysLeft != null && (
          <span className={cn("flex items-center gap-1", daysLeft < 0 ? "text-red-500 font-semibold" : daysLeft <= 7 ? "text-amber-500" : "")}>
            <Calendar size={11} /> {daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? 'D-Day' : `D-${daysLeft}`}
          </span>
        )}
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            {assignee.avatar ? (
              <img src={assignee.avatar} alt="" className="w-5 h-5 rounded-full border border-gray-200" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><UserIcon size={10} className="text-gray-400" /></div>
            )}
            <span className="text-[11px] text-gray-500">{assignee.name}</span>
          </div>
        ) : (
          <div />
        )}
        {item.actionItems.length > 0 && (
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
            {item.actionItems.filter(a => a.done).length}/{item.actionItems.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Column ──────────────────────────────────────────────
function PipelineColumn({
  stage, items, onDrop,
  isAdding, onStartAdd, onCancelAdd, onAddItem,
  isSelecting, selectedIds, onToggleSelect,
  category, onCardContextMenu,
}: {
  stage: BizStage; items: BizRadarItem[];
  onDrop: (itemId: string, targetStage: BizStage) => void;
  isAdding?: boolean; onStartAdd?: () => void; onCancelAdd?: () => void;
  onAddItem: (title: string, stage: BizStage) => void;
  isSelecting: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
  category: BizCategory;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const cfg = STAGE_CONFIG[stage];
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isAdding && inputRef.current) inputRef.current.focus(); }, [isAdding]);

  const handleSubmit = () => { if (newTitle.trim()) { onAddItem(newTitle.trim(), stage); setNewTitle(''); } };
  const handleCancel = () => { setNewTitle(''); onCancelAdd?.(); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    else if (e.key === 'Escape') handleCancel();
  };

  const totalValue = items.reduce((sum, i) => sum + (i.value || 0), 0);

  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE,
    canDrop: (item) => item.column !== stage,
    drop: (item) => onDrop(item.id, stage),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  return (
    <div ref={dropRef} className={cn(
      "flex-1 flex flex-col rounded-2xl border p-4 transition-all duration-200 h-full min-w-[220px]",
      isOver && canDrop ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200/50 shadow-lg"
        : canDrop ? "bg-gray-50/50 border-gray-200 border-dashed" : "bg-gray-50/50 border-gray-100"
    )}>
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <h3 className="font-semibold text-gray-700 text-sm">{ko ? cfg.labelKo : cfg.label}</h3>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
            isOver && canDrop ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600")}>{items.length}</span>
        </div>
        <button onClick={onStartAdd} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {totalValue > 0 && (
        <div className="text-[10px] text-gray-400 px-1 mb-3 font-medium">
          {ko ? '예상' : 'Est.'} {formatValue(totalValue)}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[60px]">
        {isAdding && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 overflow-hidden">
            <input ref={inputRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (newTitle.trim()) handleSubmit(); else handleCancel(); }}
              placeholder={ko
                ? (category === 'connection' ? '연결 제목을 입력하세요...' : '기회 제목을 입력하세요...')
                : (category === 'connection' ? 'Enter connection title...' : 'Enter opportunity title...')}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            <div className="flex items-center px-3 py-2 bg-gray-50/80 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">{ko ? 'Enter로 추가 · Esc로 취소' : 'Enter to add · Esc to cancel'}</span>
            </div>
          </div>
        )}
        {items.length === 0 && isOver && canDrop && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center text-blue-500 text-xs font-medium animate-pulse">
            {ko ? '여기에 놓으세요' : 'Drop here'}
          </div>
        )}
        {items.length === 0 && !isOver && !isAdding && (
          <button onClick={onStartAdd}
            className="w-full flex flex-col items-center justify-center py-8 text-gray-300 hover:text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group">
            <Plus size={20} className="mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <p className="text-xs font-medium">{ko
              ? (category === 'connection' ? '연결을 추가해보세요' : '기회를 추가해보세요')
              : (category === 'connection' ? 'Add a connection' : 'Add an opportunity')}</p>
          </button>
        )}
        {items.map(item => (
          <BizCard key={item.id} item={item} column={stage}
            isSelecting={isSelecting} isSelected={selectedIds.has(item.id)} onToggleSelect={onToggleSelect} onContextMenu={onCardContextMenu} />
        ))}
        {!isAdding && items.length > 0 && (
          <button onClick={onStartAdd}
            className="w-full py-2.5 rounded-xl text-gray-400 text-sm hover:text-blue-600 hover:bg-gray-100/80 transition-all flex items-center gap-2 px-3">
            <Plus size={14} /> <span>{ko ? '추가' : 'Add'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Selection Toolbar ──────────────────────────────────────────
function BizSelectionToolbar({ count, language, onDelete, onClear }: {
  count: number; language: string; onDelete: () => void; onClear: () => void;
}) {
  if (count === 0) return null;
  const ko = language === 'ko';
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-3">
      <span className="text-sm font-bold">{count}{ko ? '개 선택' : ' selected'}</span>
      <div className="w-px h-5 bg-gray-700" />
      <button onClick={onDelete} className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-900/40 transition-colors flex items-center gap-1">
        <Trash2 size={12} /> {ko ? '삭제' : 'Delete'}
      </button>
      <button onClick={onClear} className="p-1 text-gray-400 hover:text-white rounded transition-colors ml-1">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── List View ──────────────────────────────────────────────────
function BizListView({ items, onContextMenu }: { items: BizRadarItem[]; onContextMenu?: (e: React.MouseEvent, id: string) => void }) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs w-8">#</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '기회명' : 'Opportunity'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '단계' : 'Stage'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '유형' : 'Type'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '예상 가치' : 'Value'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '확률' : 'Prob.'}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">{ko ? '담당자' : 'Assignee'}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const sc = STAGE_CONFIG[item.stage];
            const tc = item.category === 'connection' && item.connectionType
              ? CONNECTION_TYPE_COLORS[item.connectionType]
              : TYPE_COLORS[item.type];
            const assignee = item.assigneeId ? members.find(m => m.id === item.assigneeId) : null;
            return (
              <tr key={item.id} onClick={() => navigate(`/radar/${item.id}`)}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, item.id); }}
                className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-[200px]">{item.title}</div>
                  {item.contactCompany && <div className="text-[11px] text-gray-400">{item.contactCompany}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs font-medium flex items-center gap-1", sc.color)}>
                    {sc.icon} {ko ? sc.labelKo : sc.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", tc.bg, tc.text)}>
                    {ko ? tc.labelKo : tc.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-gray-700">{formatValue(item.value)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{item.probability != null ? `${item.probability}%` : '-'}</td>
                <td className="px-4 py-3">
                  {assignee ? (
                    <div className="flex items-center gap-1.5">
                      {assignee.avatar ? <img src={assignee.avatar} alt="" className="w-5 h-5 rounded-full" /> : null}
                      <span className="text-xs text-gray-600">{assignee.name}</span>
                    </div>
                  ) : <span className="text-xs text-gray-300">-</span>}
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
              {ko ? '등록된 기회가 없습니다' : 'No opportunities yet'}
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export function BizRadarPage() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { items, addItem, updateItem, removeItem, getItem, isLoading } = useBizRadar();
  const { moveToTrash } = useTrash();
  const { currentUser } = useTeam();
  const [activeCategory, _setBizCat] = useState<BizCategory>(() => {
    try { return (localStorage.getItem('poten_biz_cat') as BizCategory) || 'sales'; } catch { return 'sales'; }
  });
  const setActiveCategory = (v: BizCategory) => { _setBizCat(v); localStorage.setItem('poten_biz_cat', v); };
  const [viewMode, _setBizView] = useState<'board' | 'list'>(() => {
    try { return (localStorage.getItem('poten_biz_view') as 'board' | 'list') || 'board'; } catch { return 'board'; }
  });
  const setViewMode = (v: 'board' | 'list') => { _setBizView(v); localStorage.setItem('poten_biz_view', v); };
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<BizStage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawlLoading, setCrawlLoading] = useState(false);

  // External project tabs: 'wishket' | 'freemoa' | null
  const [externalTab, setExternalTab] = useState<'wishket' | 'freemoa' | null>(null);
  const showWishket = externalTab === 'wishket';
  const showFreemoa = externalTab === 'freemoa';

  // Wishket tab state
  const [wishketProjects, setWishketProjects] = useState<any[]>([]);
  const [wishketLoading, setWishketLoading] = useState(false);
  const [wishketError, setWishketError] = useState<string | null>(null);
  const [wishketFetchedAt, setWishketFetchedAt] = useState<string | null>(null);
  const [wishketSort, setWishketSort] = useState<'relevance' | 'deadline' | 'price_high'>('relevance');
  const [wishketPage, setWishketPage] = useState(1);
  const [wishketSearch, setWishketSearch] = useState('');

  // Freemoa tab state
  const [freemoaProjects, setFreemoaProjects] = useState<any[]>([]);
  const [freemoaLoading, setFreemoaLoading] = useState(false);
  const [freemoaError, setFreemoaError] = useState<string | null>(null);
  const [freemoaFetchedAt, setFreemoaFetchedAt] = useState<string | null>(null);
  const [freemoaSort, setFreemoaSort] = useState<'relevance' | 'deadline' | 'price_high'>('relevance');
  const [freemoaPage, setFreemoaPage] = useState(1);
  const [freemoaSearch, setFreemoaSearch] = useState('');
  const WISHKET_PER_PAGE = 9;

  // Relevance keywords — 포텐랩 기술 스택
  const RELEVANCE_KEYWORDS = ['react', 'react.js', 'reactjs', 'next', 'next.js', 'nextjs', 'typescript', 'javascript', 'node', 'node.js', 'nodejs', 'vue', 'angular', 'flutter', 'web', '웹', '플랫폼', '커뮤니티', 'sns', '앱', 'app', 'saas', '프론트엔드', 'frontend', 'ui', 'ux', 'figma', 'supabase', 'firebase'];

  const wishketSorted = useMemo(() => {
    let list = [...wishketProjects];

    // Search filter
    if (wishketSearch.trim()) {
      const q = wishketSearch.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.skills?.some((s: string) => s.toLowerCase().includes(q))
      );
    }

    // Relevance scoring
    const scored = list.map(p => {
      let score = 0;
      const allText = [p.title, ...(p.skills || [])].join(' ').toLowerCase();
      for (const kw of RELEVANCE_KEYWORDS) {
        if (allText.includes(kw)) score += (kw === 'react' || kw === 'react.js' || kw === 'reactjs') ? 3 : (kw === '플랫폼' || kw === '커뮤니티') ? 2 : 1;
      }
      return { ...p, _relevance: score };
    });

    // Sort
    switch (wishketSort) {
      case 'deadline':
        scored.sort((a, b) => {
          if (!a.deadlineDate && !a.deadlineText) return 1;
          if (!b.deadlineDate && !b.deadlineText) return -1;
          if (a.deadlineDate && b.deadlineDate) return a.deadlineDate.localeCompare(b.deadlineDate);
          return (a.deadlineText || '').localeCompare(b.deadlineText || '');
        });
        break;
      case 'price_high':
        scored.sort((a, b) => (b.budgetValue || 0) - (a.budgetValue || 0));
        break;
      case 'relevance':
      default:
        scored.sort((a, b) => b._relevance - a._relevance || (b.budgetValue || 0) - (a.budgetValue || 0));
        break;
    }
    return scored;
  }, [wishketProjects, wishketSort, wishketSearch]);

  const wishketTotalPages = Math.max(1, Math.ceil(wishketSorted.length / WISHKET_PER_PAGE));
  const wishketPaged = useMemo(() => {
    const start = (wishketPage - 1) * WISHKET_PER_PAGE;
    return wishketSorted.slice(start, start + WISHKET_PER_PAGE);
  }, [wishketSorted, wishketPage]);

  const loadWishketProjects = useCallback(async (forceRefresh = false) => {
    setWishketLoading(true);
    setWishketError(null);
    try {
      const url = forceRefresh ? '/radar/wishket?refresh=true' : '/radar/wishket';
      const data = forceRefresh
        ? await api.fetchWishketProjectsRefresh()
        : await api.fetchWishketProjects();
      setWishketProjects(data.projects || []);
      setWishketFetchedAt(data.fetchedAt || null);
    } catch (e: any) {
      setWishketError(e.message || 'Failed to load');
    } finally {
      setWishketLoading(false);
    }
  }, []);

  // Freemoa sorted + paged
  const FREEMOA_PER_PAGE = 9;
  const freemoaSorted = useMemo(() => {
    let list = [...freemoaProjects];
    if (freemoaSearch.trim()) {
      const q = freemoaSearch.toLowerCase();
      list = list.filter(p => p.title?.toLowerCase().includes(q) || p.skills?.some((s: string) => s.toLowerCase().includes(q)));
    }
    const scored = list.map(p => {
      let score = 0;
      const allText = [p.title, ...(p.skills || [])].join(' ').toLowerCase();
      for (const kw of RELEVANCE_KEYWORDS) {
        if (allText.includes(kw)) score += (kw === 'react' || kw === 'react.js' || kw === 'reactjs') ? 3 : (kw === '플랫폼' || kw === '커뮤니티') ? 2 : 1;
      }
      return { ...p, _relevance: score };
    });
    switch (freemoaSort) {
      case 'deadline': scored.sort((a, b) => { if (!a.deadlineDate) return 1; if (!b.deadlineDate) return -1; return a.deadlineDate.localeCompare(b.deadlineDate); }); break;
      case 'price_high': scored.sort((a, b) => (b.budgetValue || 0) - (a.budgetValue || 0)); break;
      default: scored.sort((a, b) => b._relevance - a._relevance || (b.budgetValue || 0) - (a.budgetValue || 0)); break;
    }
    return scored;
  }, [freemoaProjects, freemoaSort, freemoaSearch]);
  const freemoaTotalPages = Math.max(1, Math.ceil(freemoaSorted.length / FREEMOA_PER_PAGE));
  const freemoaPaged = useMemo(() => {
    const start = (freemoaPage - 1) * FREEMOA_PER_PAGE;
    return freemoaSorted.slice(start, start + FREEMOA_PER_PAGE);
  }, [freemoaSorted, freemoaPage]);

  const loadFreemoaProjects = useCallback(async (forceRefresh = false) => {
    setFreemoaLoading(true);
    setFreemoaError(null);
    try {
      const data = forceRefresh ? await api.fetchFreemoaProjectsRefresh() : await api.fetchFreemoaProjects();
      setFreemoaProjects(data.projects || []);
      setFreemoaFetchedAt(data.fetchedAt || null);
    } catch (e: any) {
      setFreemoaError(e.message || 'Failed to load');
    } finally {
      setFreemoaLoading(false);
    }
  }, []);

  const handleImportExternal = useCallback((project: any) => {
    const now = new Date().toISOString();
    const id = `biz-${Date.now()}`;
    addItem({
      id,
      title: project.title,
      description: `외주 · ${project.duration}일 · ${project.budget || '금액 미정'}${project.applicants > 0 ? ` · 지원자 ${project.applicants}명` : ''}`,
      category: 'sales',
      type: 'project',
      stage: 'discovered',
      source: project.url,
      value: project.budgetValue || undefined,
      tags: project.skills || [],
      actionItems: [],
      assigneeId: currentUser.id,
      createdAt: now,
      updatedAt: now,
    });
    navigate(`/radar/${id}`);
  }, [addItem, currentUser.id, navigate]);

  // ── Right-click context menu ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const handleCardContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, id });
  }, []);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const isSelecting = selectedIds.size > 0;
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') clearSelection(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection]);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => {
      const item = getItem(id);
      if (item) {
        moveToTrash({ id: item.id, type: 'radar', title: item.title, data: item, deletedAt: new Date().toISOString() });
      }
      removeItem(id);
    });
    clearSelection();
  }, [selectedIds, removeItem, getItem, moveToTrash, clearSelection]);

  const categoryItems = useMemo(() =>
    items.filter(i => (i.category || 'sales') === activeCategory),
    [items, activeCategory]
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return categoryItems;
    const q = searchQuery.toLowerCase();
    return categoryItems.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.contactCompany?.toLowerCase().includes(q) ||
      i.contactName?.toLowerCase().includes(q) ||
      i.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [categoryItems, searchQuery]);

  const itemsByStage = useMemo(() => {
    const map: Record<BizStage, BizRadarItem[]> = {
      discovered: [], reviewing: [], proposal: [], negotiation: [], won: [], lost: [],
    };
    filteredItems.forEach(i => map[i.stage]?.push(i));
    return map;
  }, [filteredItems]);

  // Summary stats (per category)
  const weightedValue = categoryItems
    .filter(i => i.stage !== 'lost')
    .reduce((s, i) => s + (i.value || 0) * ((i.probability || 0) / 100), 0);
  const activeCount = categoryItems.filter(i => i.stage !== 'won' && i.stage !== 'lost').length;
  const wonCount = categoryItems.filter(i => i.stage === 'won').length;

  const handleDrop = useCallback((itemId: string, targetStage: BizStage) => {
    updateItem(itemId, { stage: targetStage });
  }, [updateItem]);

  const handleInlineAdd = useCallback((title: string, stage: BizStage) => {
    const now = new Date().toISOString();
    addItem({
      id: `biz-${Date.now()}`,
      title,
      category: activeCategory,
      type: 'other',
      connectionType: activeCategory === 'connection' ? 'other' : undefined,
      stage,
      actionItems: [],
      assigneeId: currentUser.id,
      createdAt: now,
      updatedAt: now,
    });
  }, [addItem, currentUser.id, activeCategory]);

  const handleCrawlUrl = useCallback(async () => {
    if (!crawlUrl.trim()) return;
    let url = crawlUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setCrawlLoading(true);
    try {
      const og = await api.fetchOgMetadata(url);
      const now = new Date().toISOString();
      const domain = new URL(url).hostname.replace('www.', '');
      const id = `biz-${Date.now()}`;
      addItem({
        id,
        title: og?.ogTitle || domain,
        description: og?.ogDescription || '',
        category: activeCategory,
        type: 'project',
        connectionType: activeCategory === 'connection' ? 'other' : undefined,
        stage: 'discovered',
        source: url,
        actionItems: [],
        assigneeId: currentUser.id,
        createdAt: now,
        updatedAt: now,
      });
      setCrawlUrl('');
      setShowUrlInput(false);
      navigate(`/radar/${id}`);
    } catch {
      // fallback: create item with URL as title
      const now = new Date().toISOString();
      const id = `biz-${Date.now()}`;
      addItem({
        id,
        title: url,
        category: activeCategory,
        type: 'project',
        connectionType: activeCategory === 'connection' ? 'other' : undefined,
        stage: 'discovered',
        source: url,
        actionItems: [],
        assigneeId: currentUser.id,
        createdAt: now,
        updatedAt: now,
      });
      setCrawlUrl('');
      setShowUrlInput(false);
      navigate(`/radar/${id}`);
    } finally {
      setCrawlLoading(false);
    }
  }, [crawlUrl, activeCategory, addItem, currentUser.id, navigate]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {ko ? '비즈 레이더' : 'Biz Radar'}
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko
                ? `진행 ${activeCount}건 · 성사 ${wonCount}건 · 가중 가치 ${formatValue(weightedValue)}`
                : `${activeCount} active · ${wonCount} won · weighted ${formatValue(weightedValue)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDashboard(!showDashboard)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border",
                showDashboard
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-600"
              )}>
              <BarChart3 size={16} /> {ko ? '대시보드' : 'Dashboard'}
            </button>
            <button onClick={() => setShowUrlInput(!showUrlInput)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border",
                showUrlInput
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"
              )}>
              <Globe size={16} /> {ko ? 'URL 가져오기' : 'Import URL'}
            </button>
            <button onClick={() => navigate(`/radar/new?category=${activeCategory}`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus size={16} /> {ko ? '기회찾기' : 'Find Opportunity'}
            </button>
          </div>
        </div>

        {/* Inline Dashboard Widget */}
        {showDashboard && (
          <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-600">{items.filter(i => (i.category || 'sales') === 'sales' && i.stage !== 'won' && i.stage !== 'lost').length}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">{ko ? '영업 진행' : 'Sales Active'}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-600">{formatValue(items.filter(i => (i.category || 'sales') === 'sales' && i.stage === 'won').reduce((s, i) => s + (i.value || 0), 0))}</p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">{ko ? '영업 성사' : 'Sales Won'}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-purple-600">{items.filter(i => i.category === 'connection' && i.stage !== 'won' && i.stage !== 'lost').length}</p>
                  <p className="text-[10px] text-purple-500 mt-0.5">{ko ? '연결 진행' : 'Conn. Active'}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{items.filter(i => i.category === 'connection' && i.stage === 'won').length}</p>
                  <p className="text-[10px] text-amber-500 mt-0.5">{ko ? '연결 성사' : 'Conn. Won'}</p>
                </div>
              </div>
              {/* Pipeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{ko ? '파이프라인' : 'Pipeline'}</h4>
                {(['discovered', 'reviewing', 'proposal', 'negotiation', 'won'] as BizStage[]).map(stage => {
                  const count = items.filter(i => i.stage === stage).length;
                  const max = Math.max(...(['discovered', 'reviewing', 'proposal', 'negotiation', 'won'] as BizStage[]).map(s => items.filter(i => i.stage === s).length), 1);
                  const cfg = STAGE_CONFIG[stage];
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-20 shrink-0">
                        {cfg.icon}
                        <span className="text-xs text-gray-600 font-medium">{ko ? cfg.labelKo : cfg.label}</span>
                      </div>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", cfg.headerBg)} style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs: 영업 / 연결 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setActiveCategory('sales'); setExternalTab(null); clearSelection(); setSearchQuery(''); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeCategory === 'sales' && !externalTab
                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            <Briefcase size={16} />
            {ko ? '영업' : 'Sales'}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              activeCategory === 'sales' ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"
            )}>
              {items.filter(i => (i.category || 'sales') === 'sales').length}
            </span>
          </button>
          <button
            onClick={() => { setActiveCategory('connection'); setExternalTab(null); clearSelection(); setSearchQuery(''); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              activeCategory === 'connection' && !externalTab
                ? "bg-purple-50 text-purple-700 border-purple-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            <Link2 size={16} />
            {ko ? '연결' : 'Connections'}
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              activeCategory === 'connection' ? "bg-purple-200 text-purple-700" : "bg-gray-100 text-gray-500"
            )}>
              {items.filter(i => i.category === 'connection').length}
            </span>
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Wishket Tab */}
          <button
            onClick={() => {
              setExternalTab('wishket');
              clearSelection(); setSearchQuery('');
              if (wishketProjects.length === 0 && !wishketLoading) loadWishketProjects(false);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              showWishket
                ? "bg-orange-50 text-orange-700 border-orange-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            <Globe size={16} />
            위시켓
          </button>

          {/* Freemoa Tab */}
          <button
            onClick={() => {
              setExternalTab('freemoa');
              clearSelection(); setSearchQuery('');
              if (freemoaProjects.length === 0 && !freemoaLoading) loadFreemoaProjects(false);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border",
              showFreemoa
                ? "bg-teal-50 text-teal-700 border-teal-200 shadow-sm"
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            <Globe size={16} />
            프리모아
          </button>
        </div>

        {!externalTab && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <div className="flex-1 sm:max-w-md">
                <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
                  <Search className="text-gray-400 mr-2 shrink-0" size={18} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={ko
                      ? (activeCategory === 'sales' ? "영업 기회 검색..." : "연결 검색...")
                      : (activeCategory === 'sales' ? "Search sales..." : "Search connections...")}
                    className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
                </div>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('board')}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    viewMode === 'board' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <LayoutGrid size={14} /> Board
                </button>
                <button onClick={() => setViewMode('list')}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    viewMode === 'list' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                  <ListIcon size={14} /> List
                </button>
              </div>
            </div>

            {/* URL Import Panel */}
            {showUrlInput && (
              <div className="mt-3 p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1.5">
                  <Globe size={13} />
                  {ko ? '어디서 업무를 찾으시겠습니까?' : 'Where do you want to find opportunities?'}
                </p>
                <div className="flex gap-2">
                  <input
                    value={crawlUrl}
                    onChange={e => setCrawlUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCrawlUrl()}
                    placeholder={ko ? 'URL을 입력하세요 (예: https://example.com/project)' : 'Enter URL (e.g., https://example.com/project)'}
                    className="flex-1 px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 placeholder-gray-400"
                  />
                  <button
                    onClick={handleCrawlUrl}
                    disabled={!crawlUrl.trim() || crawlLoading}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-40 flex items-center gap-2 shrink-0"
                  >
                    {crawlLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                    {ko ? '가져오기' : 'Import'}
                  </button>
                  <button
                    onClick={() => { setShowUrlInput(false); setCrawlUrl(''); }}
                    className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-purple-500/70 mt-2">
                  {ko ? 'URL의 제목과 설명을 자동으로 가져와 새로운 기회로 등록합니다' : 'Automatically extracts title and description from the URL to create a new opportunity'}
                </p>
              </div>
            )}
          </>
        )}
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        {showWishket ? (
          /* ─── Wishket Project List ───────────────────────────── */
          <div className="space-y-4">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-700 shrink-0">
                  {wishketSorted.length > 0 ? `외주 ${wishketSorted.length}개` : ''}
                </span>
                {wishketFetchedAt && (
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(wishketFetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                  </span>
                )}
                <span className="text-[10px] text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                  매일 오전 7시 자동
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-orange-100 focus-within:border-orange-400 transition-all">
                  <Search size={13} className="text-gray-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    value={wishketSearch}
                    onChange={e => { setWishketSearch(e.target.value); setWishketPage(1); }}
                    placeholder="프로젝트 검색..."
                    className="w-28 sm:w-36 text-xs outline-none bg-transparent placeholder-gray-400"
                  />
                </div>
                {/* Sort */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  {([
                    { key: 'relevance' as const, label: '유사도', icon: <Sparkles size={12} /> },
                    { key: 'deadline' as const, label: '마감순', icon: <Clock size={12} /> },
                    { key: 'price_high' as const, label: '가격순', icon: <ArrowDown size={12} /> },
                  ]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => { setWishketSort(s.key); setWishketPage(1); }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        wishketSort === s.key ? "bg-white shadow-sm text-orange-700" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => loadWishketProjects(true)}
                  disabled={wishketLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw size={12} className={wishketLoading ? 'animate-spin' : ''} />
                  크롤링
                </button>
              </div>
            </div>

            {/* Loading */}
            {wishketLoading && wishketProjects.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-orange-500" />
                <span className="ml-2 text-sm text-gray-500">위시켓에서 프로젝트를 가져오는 중...</span>
              </div>
            )}

            {/* Error */}
            {wishketError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
                {wishketError}
              </div>
            )}

            {/* Project grid — 9 per page */}
            {wishketPaged.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {wishketPaged.map((p: any) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-md transition-all group flex flex-col">
                    {/* Title row */}
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {p._relevance > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
                              <Sparkles size={9} className="inline -mt-0.5 mr-0.5" />매칭
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-emerald-50 text-emerald-600">
                            외주
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{p.title}</h3>
                      </div>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors shrink-0"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {/* Budget */}
                    <div className="flex items-center gap-2 mb-2">
                      {p.budget ? (
                        <span className="text-sm font-bold text-gray-900">₩ {p.budget}{p.isMonthly ? '/월' : ''}</span>
                      ) : (
                        <span className="text-sm text-gray-400">금액 미정</span>
                      )}
                    </div>

                    {/* Meta chips */}
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2.5 flex-wrap">
                      {p.duration > 0 && (
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                          <Calendar size={10} />
                          {p.duration}일
                        </span>
                      )}
                      {(p.deadlineDate || p.deadlineText) && (
                        <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium">
                          <Clock size={10} />
                          {p.deadlineDate
                            ? `~${p.deadlineDate.slice(5).replace('-', '/')}`
                            : p.deadlineText}
                        </span>
                      )}
                      {p.applicants > 0 && (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">
                          <Users size={10} />
                          {p.applicants}명
                        </span>
                      )}
                    </div>

                    {/* Skills */}
                    {p.skills?.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-3">
                        {p.skills.map((s: string, i: number) => {
                          const isMatch = RELEVANCE_KEYWORDS.some(kw => s.toLowerCase().includes(kw));
                          return (
                            <span key={i} className={cn(
                              "text-[10px] px-2 py-0.5 rounded-md",
                              isMatch ? "bg-orange-50 text-orange-700 font-semibold" : "bg-gray-100 text-gray-500"
                            )}>{s}</span>
                          );
                        })}
                      </div>
                    )}

                    {/* Spacer + import button */}
                    <div className="mt-auto pt-2 border-t border-gray-50">
                      <button
                        onClick={() => handleImportExternal(p)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Plus size={13} />
                        레이더에 가져오기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {wishketSorted.length > WISHKET_PER_PAGE && (
              <div className="flex items-center justify-center gap-1 pt-2">
                <button
                  onClick={() => setWishketPage(p => Math.max(1, p - 1))}
                  disabled={wishketPage <= 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: wishketTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === wishketTotalPages || Math.abs(p - wishketPage) <= 2)
                  .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === 'dots' ? (
                      <span key={`d${idx}`} className="px-1 text-gray-300 text-xs">···</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setWishketPage(p)}
                        className={cn(
                          "min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all",
                          wishketPage === p
                            ? "bg-orange-500 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        )}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setWishketPage(p => Math.min(wishketTotalPages, p + 1))}
                  disabled={wishketPage >= wishketTotalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Empty state */}
            {!wishketLoading && !wishketError && wishketProjects.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Globe size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">위시켓 프로젝트를 불러오려면 새로고침을 눌러주세요</p>
              </div>
            )}

            {/* No search results */}
            {!wishketLoading && wishketProjects.length > 0 && wishketSorted.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Search size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        ) : showFreemoa ? (
          /* ─── Freemoa Project List ────────────────────────────── */
          <div className="space-y-4">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-700 shrink-0">
                  {freemoaSorted.length > 0 ? `프리모아 ${freemoaSorted.length}개` : ''}
                </span>
                {freemoaFetchedAt && (
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {new Date(freemoaFetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                  </span>
                )}
                <span className="text-[10px] text-teal-500 bg-teal-50 px-2 py-0.5 rounded-full font-medium shrink-0">
                  매일 오전 7시 자동
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-teal-100 focus-within:border-teal-400 transition-all">
                  <Search size={13} className="text-gray-400 mr-1.5 shrink-0" />
                  <input type="text" value={freemoaSearch} onChange={e => { setFreemoaSearch(e.target.value); setFreemoaPage(1); }}
                    placeholder="프로젝트 검색..." className="w-28 sm:w-36 text-xs outline-none bg-transparent placeholder-gray-400" />
                </div>
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                  {([
                    { key: 'relevance' as const, label: '유사도', icon: <Sparkles size={12} /> },
                    { key: 'deadline' as const, label: '마감순', icon: <Clock size={12} /> },
                    { key: 'price_high' as const, label: '가격순', icon: <ArrowDown size={12} /> },
                  ]).map(s => (
                    <button key={s.key} onClick={() => { setFreemoaSort(s.key); setFreemoaPage(1); }}
                      className={cn("flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                        freemoaSort === s.key ? "bg-white shadow-sm text-teal-700" : "text-gray-500 hover:text-gray-700")}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => loadFreemoaProjects(true)} disabled={freemoaLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 shrink-0">
                  <RefreshCw size={12} className={freemoaLoading ? 'animate-spin' : ''} /> 크롤링
                </button>
              </div>
            </div>

            {freemoaLoading && freemoaProjects.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-teal-500" />
                <span className="ml-2 text-sm text-gray-500">프리모아에서 프로젝트를 가져오는 중...</span>
              </div>
            )}

            {freemoaError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{freemoaError}</div>
            )}

            {freemoaPaged.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {freemoaPaged.map((p: any) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all group flex flex-col">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {p._relevance > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 shrink-0">
                              <Sparkles size={9} className="inline -mt-0.5 mr-0.5" />매칭
                            </span>
                          )}
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                            p.workType === '1' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {p.projectType}
                          </span>
                          {p.field && <span className="text-[10px] text-gray-400">{p.field}</span>}
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{p.title}</h3>
                      </div>
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors shrink-0">
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {p.budget ? (
                        <span className="text-sm font-bold text-gray-900">₩ {p.budget}</span>
                      ) : (
                        <span className="text-sm text-gray-400">금액 미정</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2.5 flex-wrap">
                      {p.duration > 0 && (
                        <span className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                          <Calendar size={10} /> {p.duration}일
                        </span>
                      )}
                      {p.deadlineDate && (
                        <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md font-medium",
                          p.isRecruiting ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-400"
                        )}>
                          <Clock size={10} />
                          ~{p.deadlineDate.slice(5).replace('-', '/')}
                          {!p.isRecruiting && ' (마감)'}
                        </span>
                      )}
                      {p.applicants > 0 && (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">
                          <Users size={10} /> {p.applicants}명
                        </span>
                      )}
                      {p.location && (
                        <span className="bg-gray-50 px-2 py-0.5 rounded-md">{p.location}</span>
                      )}
                    </div>

                    {p.skills?.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-3">
                        {p.skills.slice(0, 5).map((s: string, i: number) => {
                          const isMatch = RELEVANCE_KEYWORDS.some(kw => s.toLowerCase().includes(kw));
                          return (
                            <span key={i} className={cn("text-[10px] px-2 py-0.5 rounded-md",
                              isMatch ? "bg-teal-50 text-teal-700 font-semibold" : "bg-gray-100 text-gray-500"
                            )}>{s}</span>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-auto pt-2 border-t border-gray-50">
                      <button onClick={() => handleImportExternal(p)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors opacity-0 group-hover:opacity-100">
                        <Plus size={13} /> 레이더에 가져오기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {freemoaSorted.length > FREEMOA_PER_PAGE && (
              <div className="flex items-center justify-center gap-1 pt-2">
                <button onClick={() => setFreemoaPage(p => Math.max(1, p - 1))} disabled={freemoaPage <= 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: freemoaTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === freemoaTotalPages || Math.abs(p - freemoaPage) <= 2)
                  .reduce<(number | 'dots')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('dots');
                    acc.push(p); return acc;
                  }, [])
                  .map((p, idx) =>
                    p === 'dots' ? (
                      <span key={`d${idx}`} className="px-1 text-gray-300 text-xs">···</span>
                    ) : (
                      <button key={p} onClick={() => setFreemoaPage(p)}
                        className={cn("min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all",
                          freemoaPage === p ? "bg-teal-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900")}>
                        {p}
                      </button>
                    )
                  )}
                <button onClick={() => setFreemoaPage(p => Math.min(freemoaTotalPages, p + 1))} disabled={freemoaPage >= freemoaTotalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {!freemoaLoading && !freemoaError && freemoaProjects.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Globe size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm">프리모아 프로젝트를 불러오려면 크롤링을 눌러주세요</p>
              </div>
            )}
            {!freemoaLoading && freemoaProjects.length > 0 && freemoaSorted.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Search size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        ) : viewMode === 'board' ? (
          <div className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row gap-4 md:gap-4 md:min-w-[1200px] h-full">
              {ACTIVE_STAGES.map(stage => (
                <PipelineColumn
                  key={stage}
                  stage={stage}
                  items={itemsByStage[stage]}
                  onDrop={handleDrop}
                  onAddItem={handleInlineAdd}
                  isAdding={addingInColumn === stage}
                  onStartAdd={() => setAddingInColumn(stage)}
                  onCancelAdd={() => setAddingInColumn(null)}
                  isSelecting={isSelecting}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  category={activeCategory}
                  onCardContextMenu={handleCardContextMenu}
                />
              ))}
            </div>
          </div>
        ) : (
          <BizListView items={filteredItems} onContextMenu={handleCardContextMenu} />
        )}
      </div>

      <BizSelectionToolbar count={selectedIds.size} language={language} onDelete={handleBulkDelete} onClear={clearSelection} />

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={closeCtxMenu} onContextMenu={(e) => { e.preventDefault(); closeCtxMenu(); }} />
          <div
            className="fixed z-[71] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => { navigate(`/radar/${ctxMenu.id}`); closeCtxMenu(); }}
              className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Pencil size={13} /> {ko ? '수정' : 'Edit'}
            </button>
            <div className="mx-2 my-0.5 border-t border-gray-100" />
            <button
              onClick={() => {
                const item = getItem(ctxMenu.id);
                if (item) {
                  moveToTrash({ id: item.id, type: 'radar', title: item.title, data: item, deletedAt: new Date().toISOString() });
                }
                removeItem(ctxMenu.id);
                closeCtxMenu();
              }}
              className="w-full px-3 py-2 text-xs text-left text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={13} /> {ko ? '삭제' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
