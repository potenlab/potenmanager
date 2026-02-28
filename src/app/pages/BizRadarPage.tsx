import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  Plus, Search, Compass, Eye, Send, MessageSquare, Trophy,
  LayoutGrid, List as ListIcon, MoreHorizontal,
  Trash2, X, Check, Building2, User as UserIcon, Calendar,
  DollarSign, Percent, Tag,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useBizRadar, BizRadarItem, BizStage, BizType } from "../context/BizRadarContext";
import { useTeam } from "../context/TeamContext";
import { useTrash } from "../context/TrashContext";

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

const ACTIVE_STAGES: BizStage[] = ['discovered', 'reviewing', 'proposal', 'negotiation', 'won'];

function formatValue(v?: number): string {
  if (!v) return '-';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
}

// ─── Biz Card ─────────────────────────────────────────────────────
function BizCard({ item, column, isSelecting, isSelected, onToggleSelect }: {
  item: BizRadarItem; column: BizStage;
  isSelecting: boolean; isSelected: boolean; onToggleSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();
  const tc = TYPE_COLORS[item.type];

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
        <button onClick={(e) => e.stopPropagation()} className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
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
}: {
  stage: BizStage; items: BizRadarItem[];
  onDrop: (itemId: string, targetStage: BizStage) => void;
  isAdding?: boolean; onStartAdd?: () => void; onCancelAdd?: () => void;
  onAddItem: (title: string, stage: BizStage) => void;
  isSelecting: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
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
              placeholder={ko ? '기회 제목을 입력하세요...' : 'Enter opportunity title...'}
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
            <p className="text-xs font-medium">{ko ? '기회를 추가해보세요' : 'Add an opportunity'}</p>
          </button>
        )}
        {items.map(item => (
          <BizCard key={item.id} item={item} column={stage}
            isSelecting={isSelecting} isSelected={selectedIds.has(item.id)} onToggleSelect={onToggleSelect} />
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
function BizListView({ items }: { items: BizRadarItem[] }) {
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
            const tc = TYPE_COLORS[item.type];
            const assignee = item.assigneeId ? members.find(m => m.id === item.assigneeId) : null;
            return (
              <tr key={item.id} onClick={() => navigate(`/radar/${item.id}`)}
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
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<BizStage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.contactCompany?.toLowerCase().includes(q) ||
      i.contactName?.toLowerCase().includes(q) ||
      i.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const itemsByStage = useMemo(() => {
    const map: Record<BizStage, BizRadarItem[]> = {
      discovered: [], reviewing: [], proposal: [], negotiation: [], won: [], lost: [],
    };
    filteredItems.forEach(i => map[i.stage]?.push(i));
    return map;
  }, [filteredItems]);

  // Summary stats
  const totalValue = items.reduce((s, i) => s + (i.value || 0), 0);
  const weightedValue = items
    .filter(i => i.stage !== 'lost')
    .reduce((s, i) => s + (i.value || 0) * ((i.probability || 0) / 100), 0);
  const activeCount = items.filter(i => i.stage !== 'won' && i.stage !== 'lost').length;
  const wonCount = items.filter(i => i.stage === 'won').length;

  const handleDrop = useCallback((itemId: string, targetStage: BizStage) => {
    updateItem(itemId, { stage: targetStage });
  }, [updateItem]);

  const handleInlineAdd = useCallback((title: string, stage: BizStage) => {
    const now = new Date().toISOString();
    addItem({
      id: `biz-${Date.now()}`,
      title,
      type: 'other',
      stage,
      actionItems: [],
      assigneeId: currentUser.id,
      createdAt: now,
      updatedAt: now,
    });
  }, [addItem, currentUser.id]);

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
          <button onClick={() => navigate('/radar/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Plus size={16} /> {ko ? '새 기회' : 'New Opportunity'}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
              <Search className="text-gray-400 mr-2 shrink-0" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ko ? "기회 검색..." : "Search opportunities..."}
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
      </header>

      <div className="flex-1 overflow-x-auto pb-4">
        {viewMode === 'board' ? (
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
                />
              ))}
            </div>
          </div>
        ) : (
          <BizListView items={filteredItems} />
        )}
      </div>

      <BizSelectionToolbar count={selectedIds.size} language={language} onDelete={handleBulkDelete} onClear={clearSelection} />
    </div>
  );
}
