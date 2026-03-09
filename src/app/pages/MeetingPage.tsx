import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  Plus, Search, Video, Clock, Calendar as CalendarIcon,
  LayoutGrid, List as ListIcon, Users, MapPin,
  MoreHorizontal, CheckCircle2, Sun, Trash2, X, Check, Zap, ChevronDown, Pencil,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useMeetingContext, Meeting } from "../context/MeetingContext";
import { useTeam } from "../context/TeamContext";
import { MeetingListView } from "../components/meeting/MeetingListView";
import { isToday, format, addDays, startOfDay } from "date-fns";
import { useTrash } from "../context/TrashContext";

const DRAG_TYPE = "MEETING_CARD";
type ColumnKey = 'today' | 'upcoming' | 'completed';

interface DragItem { id: string; column: ColumnKey; }

const TYPE_COLORS: Record<Meeting['type'], { bg: string; text: string; border: string; label: string; labelKo: string; icon: React.ReactNode }> = {
  standup:    { bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100',  label: 'Standup',    labelKo: '스탠드업',     icon: <Sun size={11} /> },
  planning:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100',   label: 'Planning',   labelKo: '계획',         icon: <LayoutGrid size={11} /> },
  review:     { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', label: 'Review',     labelKo: '리뷰',         icon: <CheckCircle2 size={11} /> },
  brainstorm: { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100',  label: 'Brainstorm', labelKo: '브레인스토밍', icon: <Zap size={11} /> },
  external:   { bg: 'bg-cyan-50',   text: 'text-cyan-600',   border: 'border-cyan-100',   label: 'External',   labelKo: '외부미팅',     icon: <MapPin size={11} /> },
  other:      { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-100',   label: 'Other',      labelKo: '기타',         icon: <MoreHorizontal size={11} /> },
};

// ─── Meeting Card (with selection) ──────────────────────────────────
function MeetingCard({ meeting, column, isSelecting, isSelected, onToggleSelect, onContextMenu }: {
  meeting: Meeting; column: ColumnKey;
  isSelecting: boolean; isSelected: boolean; onToggleSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();
  const tc = TYPE_COLORS[meeting.type];
  const meetingDate = new Date(meeting.date);

  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE,
    item: { id: meeting.id, column },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar || '';

  const handleClick = () => {
    if (isDragging) return;
    if (isSelecting) onToggleSelect(meeting.id);
    else navigate(`/meetings/${meeting.id}`);
  };

  return (
    <div
      ref={dragRef}
      data-meeting-card
      data-meeting-id={meeting.id}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, meeting.id); }}
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
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(meeting.id); }}
          className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shadow-sm transition-all",
            isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white hover:border-blue-400")}>
          {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      </div>

      <div className="flex justify-between items-start mb-2">
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-0.5", tc.bg, tc.text, tc.border)}>
          {tc.icon} {ko ? tc.labelKo : tc.label}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Participant avatars (top-right) */}
          <div className="flex -space-x-1.5">
            {meeting.attendeeIds.slice(0, 3).map(id => {
              const avatar = getMemberAvatar(id);
              return avatar ? (
                <img key={id} src={avatar} alt="" className="w-5 h-5 rounded-full border-[1.5px] border-white" />
              ) : (
                <div key={id} className="w-5 h-5 rounded-full bg-gray-200 border-[1.5px] border-white flex items-center justify-center">
                  <Users size={8} className="text-gray-400" />
                </div>
              );
            })}
            {meeting.attendeeIds.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-gray-100 border-[1.5px] border-white flex items-center justify-center text-[8px] font-semibold text-gray-500">
                +{meeting.attendeeIds.length - 3}
              </div>
            )}
          </div>
          <button onClick={(e) => e.stopPropagation()} className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <h4 className={cn("font-medium text-sm mb-1 leading-snug",
        meeting.status === 'completed' ? "text-gray-400 line-through" : "text-gray-900"
      )}>{meeting.title || (ko ? '제목 없음' : 'Untitled')}</h4>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="flex items-center gap-1"><CalendarIcon size={11} />
          {meetingDate.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
        </span>
        <span className="flex items-center gap-1"><Clock size={11} />
          {meetingDate.toLocaleTimeString(ko ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-gray-300">·</span>
        <span>{meeting.duration}min</span>
        {meeting.location && (
          <>
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-0.5"><MapPin size={10} /> {meeting.location}</span>
          </>
        )}
        {meeting.actionItems.length > 0 && (
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-lg ml-auto">
            {meeting.actionItems.filter(a => a.done).length}/{meeting.actionItems.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Meeting Column ─────────────────────────────────────────────────
function MeetingColumn({
  title, count, meetings, icon, columnKey, onDrop,
  isAdding, onStartAdd, onCancelAdd, onAddMeeting,
  isSelecting, selectedIds, onToggleSelect, onCardContextMenu,
  completedMonthFilter, completedMonthOptions, onCompletedMonthChange,
}: {
  title: string; count: number; meetings: Meeting[]; icon: React.ReactNode;
  columnKey: ColumnKey; onDrop: (meetingId: string, targetColumn: ColumnKey) => void;
  isAdding?: boolean; onStartAdd?: () => void; onCancelAdd?: () => void;
  onAddMeeting: (title: string, column: ColumnKey) => void;
  isSelecting: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
  completedMonthFilter?: string;
  completedMonthOptions?: string[];
  onCompletedMonthChange?: (month: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showMonthDrop, setShowMonthDrop] = useState(false);
  const monthDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isAdding && inputRef.current) inputRef.current.focus(); }, [isAdding]);
  useEffect(() => {
    if (!showMonthDrop) return;
    const h = (e: MouseEvent) => { if (monthDropRef.current && !monthDropRef.current.contains(e.target as Node)) setShowMonthDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMonthDrop]);

  const handleSubmit = () => { if (newTitle.trim()) { onAddMeeting(newTitle.trim(), columnKey); setNewTitle(''); } };
  const handleCancel = () => { setNewTitle(''); onCancelAdd?.(); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    else if (e.key === 'Escape') handleCancel();
  };

  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE,
    canDrop: (item) => item.column !== columnKey,
    drop: (item) => onDrop(item.id, columnKey),
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    return ko ? `${y}년 ${mo}월` : new Date(y, mo - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <div ref={dropRef} className={cn(
      "flex-1 flex flex-col rounded-2xl border p-4 transition-all duration-200 h-full",
      isOver && canDrop ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200/50 shadow-lg"
        : canDrop ? "bg-gray-50/50 border-gray-200 border-dashed" : "bg-gray-50/50 border-gray-100"
    )}>
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
            isOver && canDrop ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600")}>{count}</span>
          {/* Month filter for completed column */}
          {completedMonthOptions && onCompletedMonthChange && (
            <div className="relative" ref={monthDropRef}>
              <button
                onClick={() => setShowMonthDrop(!showMonthDrop)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border",
                  completedMonthFilter && completedMonthFilter !== 'all'
                    ? "border-blue-200 bg-blue-50 text-blue-600"
                    : "border-gray-200 text-gray-400 hover:text-gray-600"
                )}
              >
                <CalendarIcon size={10} />
                {completedMonthFilter && completedMonthFilter !== 'all'
                  ? monthLabel(completedMonthFilter)
                  : (ko ? '전체' : 'All')}
                <ChevronDown size={9} />
              </button>
              {showMonthDrop && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[140px] py-1 max-h-[240px] overflow-y-auto animate-in fade-in duration-100">
                  <button
                    onClick={() => { onCompletedMonthChange('all'); setShowMonthDrop(false); }}
                    className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-gray-50 transition-colors",
                      (!completedMonthFilter || completedMonthFilter === 'all') && "bg-blue-50/50")}
                  >
                    <span className="text-gray-500">{ko ? '전체' : 'All'}</span>
                    {(!completedMonthFilter || completedMonthFilter === 'all') && <Check size={10} className="ml-auto text-blue-600" />}
                  </button>
                  {completedMonthOptions.map(m => (
                    <button key={m}
                      onClick={() => { onCompletedMonthChange(m); setShowMonthDrop(false); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-gray-50 transition-colors",
                        completedMonthFilter === m && "bg-blue-50/50")}
                    >
                      <span className="text-gray-600">{monthLabel(m)}</span>
                      {completedMonthFilter === m && <Check size={10} className="ml-auto text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={onStartAdd} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[60px]">
        {isAdding && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm ring-2 ring-blue-100 overflow-hidden">
            <input ref={inputRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { if (newTitle.trim()) handleSubmit(); else handleCancel(); }}
              placeholder={ko ? '회의 제목을 입력하세요...' : 'Enter meeting title...'}
              className="w-full px-4 py-3 text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            <div className="flex items-center px-3 py-2 bg-gray-50/80 border-t border-gray-100">
              <span className="text-[10px] text-gray-400">{ko ? 'Enter로 추가 · Esc로 취소' : 'Enter to add · Esc to cancel'}</span>
            </div>
          </div>
        )}
        {meetings.length === 0 && isOver && canDrop && (
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center text-blue-500 text-xs font-medium animate-pulse">
            {ko ? '여기에 놓으세요' : 'Drop here'}
          </div>
        )}
        {meetings.length === 0 && !isOver && !isAdding && (
          <button onClick={onStartAdd}
            className="w-full flex flex-col items-center justify-center py-8 text-gray-300 hover:text-blue-500 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group">
            <Plus size={20} className="mb-1.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            <p className="text-xs font-medium">{ko ? '회의를 추가해보세요' : 'Add a meeting'}</p>
          </button>
        )}
        {meetings.map(m => (
          <MeetingCard key={m.id} meeting={m} column={columnKey}
            isSelecting={isSelecting} isSelected={selectedIds.has(m.id)} onToggleSelect={onToggleSelect}
            onContextMenu={onCardContextMenu} />
        ))}
        {!isAdding && meetings.length > 0 && (
          <button onClick={onStartAdd}
            className="w-full py-2.5 rounded-xl text-gray-400 text-sm hover:text-blue-600 hover:bg-gray-100/80 transition-all flex items-center gap-2 px-3">
            <Plus size={14} /> <span>{ko ? '회의 추가' : 'Add Meeting'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Selection Toolbar ──────────────────────────────────────────────
function MeetingSelectionToolbar({ count, language, onDelete, onClear }: {
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

// ─── Board View ─────────────────────────────────────────────────────
function BoardView({
  todayMeetings, upcomingMeetings, completedMeetings,
  onDrop, onAddMeeting, language,
  addingInColumn, onStartAdd, onCancelAdd,
  isSelecting, selectedIds, onToggleSelect,
  onBulkSelect, onCardContextMenu,
  completedMonthFilter, completedMonthOptions, onCompletedMonthChange,
}: {
  todayMeetings: Meeting[]; upcomingMeetings: Meeting[]; completedMeetings: Meeting[];
  onDrop: (meetingId: string, targetColumn: ColumnKey) => void;
  onAddMeeting: (title: string, column: ColumnKey) => void;
  language: string;
  addingInColumn: ColumnKey | null; onStartAdd: (col: ColumnKey) => void; onCancelAdd: () => void;
  isSelecting: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
  onBulkSelect: (ids: Set<string>) => void;
  onCardContextMenu?: (e: React.MouseEvent, id: string) => void;
  completedMonthFilter: string;
  completedMonthOptions: string[];
  onCompletedMonthChange: (month: string) => void;
}) {
  const ko = language === 'ko';
  const boardRef = useRef<HTMLDivElement>(null);
  const rubberBandElRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const currentSelRef = useRef<Set<string>>(new Set());
  const onBulkSelectRef = useRef(onBulkSelect);
  onBulkSelectRef.current = onBulkSelect;

  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-meeting-card]') || target.closest('button') || target.closest('input') || target.closest('a')) return;
    if (e.button !== 0) return;
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  }, []);

  useEffect(() => {
    function setsEqual(a: Set<string>, b: Set<string>) {
      if (a.size !== b.size) return false;
      for (const x of a) if (!b.has(x)) return false;
      return true;
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (!didDragRef.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      didDragRef.current = true;
      if (boardRef.current) boardRef.current.classList.add('select-none');
      const x1 = startRef.current.x, y1 = startRef.current.y;
      const x2 = e.clientX, y2 = e.clientY;
      const left = Math.min(x1, x2), top = Math.min(y1, y2);
      const right = Math.max(x1, x2), bottom = Math.max(y1, y2);
      if (rubberBandElRef.current) {
        const el = rubberBandElRef.current;
        el.style.display = 'block';
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.width = `${right - left}px`;
        el.style.height = `${bottom - top}px`;
      }
      if (!boardRef.current) return;
      const cards = boardRef.current.querySelectorAll('[data-meeting-card]');
      const ids = new Set<string>();
      cards.forEach(card => {
        const r = card.getBoundingClientRect();
        if (r.left < right && r.right > left && r.top < bottom && r.bottom > top) {
          const id = card.getAttribute('data-meeting-id');
          if (id) ids.add(id);
        }
      });
      if (!setsEqual(currentSelRef.current, ids)) {
        currentSelRef.current = ids;
        onBulkSelectRef.current(ids);
      }
    };
    const handleMouseUp = () => {
      if (startRef.current && !didDragRef.current) {
        onBulkSelectRef.current(new Set());
        currentSelRef.current = new Set();
      }
      startRef.current = null;
      didDragRef.current = false;
      if (rubberBandElRef.current) rubberBandElRef.current.style.display = 'none';
      if (boardRef.current) boardRef.current.classList.remove('select-none');
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={boardRef} className="h-full flex flex-col" onMouseDown={handleBoardMouseDown}>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:min-w-[1000px] h-full">
        <MeetingColumn title={ko ? "오늘" : "Today"} count={todayMeetings.length} meetings={todayMeetings}
          icon={<Sun size={16} className="text-amber-500" />} columnKey="today" onDrop={onDrop} onAddMeeting={onAddMeeting}
          isAdding={addingInColumn === 'today'} onStartAdd={() => onStartAdd('today')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu} />
        <MeetingColumn title={ko ? "예정" : "Upcoming"} count={upcomingMeetings.length} meetings={upcomingMeetings}
          icon={<CalendarIcon size={16} className="text-blue-500" />} columnKey="upcoming" onDrop={onDrop} onAddMeeting={onAddMeeting}
          isAdding={addingInColumn === 'upcoming'} onStartAdd={() => onStartAdd('upcoming')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu} />
        <MeetingColumn title={ko ? "완료" : "Completed"} count={completedMeetings.length} meetings={completedMeetings}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />} columnKey="completed" onDrop={onDrop} onAddMeeting={onAddMeeting}
          isAdding={addingInColumn === 'completed'} onStartAdd={() => onStartAdd('completed')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onCardContextMenu={onCardContextMenu}
          completedMonthFilter={completedMonthFilter} completedMonthOptions={completedMonthOptions} onCompletedMonthChange={onCompletedMonthChange} />
      </div>
      <div
        ref={rubberBandElRef}
        className="fixed border-2 border-blue-400/50 bg-blue-400/10 rounded-lg pointer-events-none z-50"
        style={{ display: 'none' }}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export function MeetingPage() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { meetings, addMeeting, updateMeeting, removeMeeting, getMeeting, isLoading } = useMeetingContext();
  const { moveToTrash } = useTrash();
  const { currentUser } = useTeam();
  const [viewMode, _setMtgView] = useState<'board' | 'list'>(() => {
    try { return (localStorage.getItem('poten_mtg_view') as 'board' | 'list') || 'board'; } catch { return 'board'; }
  });
  const setViewMode = (v: 'board' | 'list') => { _setMtgView(v); localStorage.setItem('poten_mtg_view', v); };
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<ColumnKey | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const monthFilterRef = useRef<HTMLDivElement>(null);
  const [completedMonthFilter, setCompletedMonthFilter] = useState<string>('all');

  const isSelecting = selectedIds.size > 0;
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { clearSelection(); setShowMonthFilter(false); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [clearSelection]);

  useEffect(() => {
    if (!showMonthFilter) return;
    const handler = (e: MouseEvent) => {
      if (monthFilterRef.current && !monthFilterRef.current.contains(e.target as Node)) setShowMonthFilter(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMonthFilter]);

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach(id => {
      const m = getMeeting(id);
      if (m) {
        moveToTrash({ id: m.id, type: 'meeting', title: m.title, data: m, deletedAt: new Date().toISOString() });
      }
      removeMeeting(id);
    });
    clearSelection();
  }, [selectedIds, removeMeeting, getMeeting, moveToTrash, clearSelection]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    meetings.forEach(m => {
      const d = new Date(m.date);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(monthSet).sort().reverse();
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    let result = meetings;
    if (filterMonth !== 'all') {
      const [y, mo] = filterMonth.split('-').map(Number);
      result = result.filter(m => {
        const d = new Date(m.date);
        return d.getFullYear() === y && d.getMonth() + 1 === mo;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q));
    }
    return result;
  }, [meetings, searchQuery, filterMonth]);

  const todayMeetings = useMemo(() =>
    filteredMeetings.filter(m => m.status !== 'completed' && new Date(m.date) < addDays(startOfDay(new Date()), 1))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [filteredMeetings]);
  const upcomingMeetings = useMemo(() =>
    filteredMeetings.filter(m => m.status !== 'completed' && new Date(m.date) >= addDays(startOfDay(new Date()), 1))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [filteredMeetings]);
  const allCompletedMeetings = useMemo(() =>
    filteredMeetings.filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [filteredMeetings]);

  const completedMonthOptions = useMemo(() => {
    const s = new Set<string>();
    allCompletedMeetings.forEach(m => {
      const d = new Date(m.date);
      s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(s).sort().reverse();
  }, [allCompletedMeetings]);

  const completedMeetings = useMemo(() => {
    if (completedMonthFilter === 'all') return allCompletedMeetings;
    const [y, mo] = completedMonthFilter.split('-').map(Number);
    return allCompletedMeetings.filter(m => {
      const d = new Date(m.date);
      return d.getFullYear() === y && d.getMonth() + 1 === mo;
    });
  }, [allCompletedMeetings, completedMonthFilter]);

  const todayCount = meetings.filter(m => m.status !== 'completed' && new Date(m.date) < addDays(startOfDay(new Date()), 1)).length;
  const upcomingCount = meetings.filter(m => m.status !== 'completed' && new Date(m.date) >= addDays(startOfDay(new Date()), 1)).length;
  const completedCount = meetings.filter(m => m.status === 'completed').length;

  const handleDrop = useCallback((meetingId: string, targetColumn: ColumnKey) => {
    const meeting = getMeeting(meetingId);
    if (!meeting) return;
    const oldDate = new Date(meeting.date);

    if (targetColumn === 'today') {
      // 오늘로 이동: 날짜를 오늘로, 시간은 유지
      const ok = confirm(ko ? '이 회의를 오늘로 옮기시겠습니까?\n날짜가 오늘로 변경됩니다.' : 'Move this meeting to today?\nThe date will be changed to today.');
      if (!ok) return;
      const d = new Date();
      d.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
      updateMeeting(meetingId, { status: 'scheduled', date: d.toISOString() });
    } else if (targetColumn === 'completed') {
      // 완료로 이동: 날짜를 오늘로, 시간은 유지
      const ok = confirm(ko ? '이 회의를 완료로 옮기시겠습니까?\n날짜가 오늘로 변경됩니다.' : 'Mark this meeting as completed?\nThe date will be changed to today.');
      if (!ok) return;
      const d = new Date();
      d.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
      updateMeeting(meetingId, { status: 'completed', date: d.toISOString() });
    } else {
      // 예정으로 이동: 날짜를 물어봄
      const input = prompt(ko ? '회의 날짜를 입력하세요 (YYYY-MM-DD)' : 'Enter meeting date (YYYY-MM-DD)', format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      if (!input) return;
      const parsed = new Date(input + 'T00:00:00');
      if (isNaN(parsed.getTime())) { alert(ko ? '올바른 날짜 형식이 아닙니다.' : 'Invalid date format.'); return; }
      parsed.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);
      updateMeeting(meetingId, { status: 'scheduled', date: parsed.toISOString() });
    }
  }, [updateMeeting, getMeeting, ko]);

  // ── Right-click context menu ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const handleCardContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, id });
  }, []);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const handleInlineAdd = useCallback((title: string, column: ColumnKey) => {
    const now = new Date();
    let meetingDate: Date;
    let status: Meeting['status'] = 'scheduled';
    if (column === 'today') { meetingDate = new Date(); meetingDate.setHours(now.getHours() + 1, 0, 0, 0); }
    else if (column === 'upcoming') { meetingDate = new Date(); meetingDate.setDate(meetingDate.getDate() + 1); meetingDate.setHours(10, 0, 0, 0); }
    else { meetingDate = new Date(); status = 'completed'; }
    addMeeting({
      id: `mt-${Date.now()}`, title, date: meetingDate.toISOString(), duration: 60, type: 'other', status,
      attendeeIds: [currentUser.id], organizerId: currentUser.id, notes: '', actionItems: [],
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    });
  }, [addMeeting, currentUser.id]);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{ko ? '회의' : 'Meetings'}</h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {ko ? `오늘 ${todayCount}개 · 예정 ${upcomingCount}개 · 완료 ${completedCount}개`
                : `${todayCount} today · ${upcomingCount} upcoming · ${completedCount} completed`}
            </p>
          </div>
          <button onClick={() => navigate('/meetings/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Plus size={16} /> {ko ? '새 회의' : 'New Meeting'}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <div className="flex-1 sm:max-w-md">
            <div className="flex items-center w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
              <Search className="text-gray-400 mr-2 shrink-0" size={18} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ko ? "회의 검색..." : "Search meetings..."}
                className="w-full text-sm outline-none bg-transparent placeholder-gray-400 text-gray-900" />
            </div>
          </div>
          <div className="relative" ref={monthFilterRef}>
            <button
              onClick={() => setShowMonthFilter(!showMonthFilter)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 bg-white border rounded-xl text-xs font-medium transition-all shadow-sm",
                filterMonth !== 'all'
                  ? "border-blue-300 text-blue-700 ring-1 ring-blue-100"
                  : "border-gray-200 text-gray-500 hover:text-gray-700"
              )}
            >
              <CalendarIcon size={13} />
              {filterMonth === 'all'
                ? (ko ? '월별' : 'Month')
                : (() => {
                    const [y, m] = filterMonth.split('-').map(Number);
                    return ko ? `${y}년 ${m}월` : new Date(y, m - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                  })()
              }
              <ChevronDown size={11} />
            </button>
            {showMonthFilter && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[160px] py-1 max-h-[320px] overflow-y-auto">
                <button
                  onClick={() => { setFilterMonth('all'); setShowMonthFilter(false); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                    filterMonth === 'all' && "bg-blue-50/50")}
                >
                  <span className="text-gray-500">{ko ? '전체' : 'All'}</span>
                  {filterMonth === 'all' && <Check size={12} className="ml-auto text-blue-600" />}
                </button>
                {availableMonths.map(month => {
                  const [y, m] = month.split('-').map(Number);
                  const label = ko ? `${y}년 ${m}월` : new Date(y, m - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                  return (
                    <button
                      key={month}
                      onClick={() => { setFilterMonth(month); setShowMonthFilter(false); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                        filterMonth === month && "bg-blue-50/50")}
                    >
                      <span className="text-gray-600">{label}</span>
                      {filterMonth === month && <Check size={12} className="ml-auto text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            )}
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
          <BoardView
            todayMeetings={todayMeetings} upcomingMeetings={upcomingMeetings} completedMeetings={completedMeetings}
            onDrop={handleDrop} onAddMeeting={handleInlineAdd} language={language}
            addingInColumn={addingInColumn} onStartAdd={setAddingInColumn} onCancelAdd={() => setAddingInColumn(null)}
            isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={toggleSelect}
            onBulkSelect={setSelectedIds} onCardContextMenu={handleCardContextMenu}
            completedMonthFilter={completedMonthFilter} completedMonthOptions={completedMonthOptions} onCompletedMonthChange={setCompletedMonthFilter}
          />
        ) : (
          <MeetingListView meetings={filteredMeetings} />
        )}
      </div>

      <MeetingSelectionToolbar count={selectedIds.size} language={language} onDelete={handleBulkDelete} onClear={clearSelection} />

      {/* Right-click context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={closeCtxMenu} onContextMenu={(e) => { e.preventDefault(); closeCtxMenu(); }} />
          <div
            className="fixed z-[71] bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => { navigate(`/meetings/${ctxMenu.id}`); closeCtxMenu(); }}
              className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Pencil size={13} /> {ko ? '수정' : 'Edit'}
            </button>
            <div className="mx-2 my-0.5 border-t border-gray-100" />
            <button
              onClick={() => {
                const m = getMeeting(ctxMenu.id);
                if (m) moveToTrash({ id: m.id, type: 'meeting', title: m.title, data: m, deletedAt: new Date().toISOString() });
                removeMeeting(ctxMenu.id);
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
