import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useDrag, useDrop } from "react-dnd";
import {
  Plus, Search, Video, Clock, Calendar as CalendarIcon,
  LayoutGrid, List as ListIcon, Users, MapPin,
  MoreHorizontal, CheckCircle2, Sun, Trash2, X, Check, Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useMeetingContext, Meeting } from "../context/MeetingContext";
import { useTeam } from "../context/TeamContext";
import { MeetingListView } from "../components/meeting/MeetingListView";
import { isToday } from "date-fns";
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
function MeetingCard({ meeting, column, isSelecting, isSelected, onToggleSelect }: {
  meeting: Meeting; column: ColumnKey;
  isSelecting: boolean; isSelected: boolean; onToggleSelect: (id: string) => void;
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
        <button onClick={(e) => e.stopPropagation()} className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h4 className={cn("font-medium text-sm mb-1 leading-snug",
        meeting.status === 'completed' ? "text-gray-400 line-through" : "text-gray-900"
      )}>{meeting.title || (ko ? '제목 없음' : 'Untitled')}</h4>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1"><CalendarIcon size={11} />
          {meetingDate.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
        </span>
        <span className="flex items-center gap-1"><Clock size={11} />
          {meetingDate.toLocaleTimeString(ko ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-gray-300">·</span>
        <span>{meeting.duration}min</span>
      </div>

      {meeting.location && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin size={11} /> {meeting.location}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
        <div className="flex -space-x-1.5">
          {meeting.attendeeIds.slice(0, 4).map(id => {
            const avatar = getMemberAvatar(id);
            return avatar ? (
              <img key={id} src={avatar} alt="" className="w-6 h-6 rounded-full border-2 border-white" />
            ) : (
              <div key={id} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                <Users size={10} className="text-gray-400" />
              </div>
            );
          })}
          {meeting.attendeeIds.length > 4 && (
            <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-gray-500">
              +{meeting.attendeeIds.length - 4}
            </div>
          )}
        </div>
        {meeting.actionItems.length > 0 && (
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
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
  isSelecting, selectedIds, onToggleSelect,
}: {
  title: string; count: number; meetings: Meeting[]; icon: React.ReactNode;
  columnKey: ColumnKey; onDrop: (meetingId: string, targetColumn: ColumnKey) => void;
  isAdding?: boolean; onStartAdd?: () => void; onCancelAdd?: () => void;
  onAddMeeting: (title: string, column: ColumnKey) => void;
  isSelecting: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isAdding && inputRef.current) inputRef.current.focus(); }, [isAdding]);

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
            isSelecting={isSelecting} isSelected={selectedIds.has(m.id)} onToggleSelect={onToggleSelect} />
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
}: {
  todayMeetings: Meeting[]; upcomingMeetings: Meeting[]; completedMeetings: Meeting[];
  onDrop: (meetingId: string, targetColumn: ColumnKey) => void;
  onAddMeeting: (title: string, column: ColumnKey) => void;
  language: string;
  addingInColumn: ColumnKey | null; onStartAdd: (col: ColumnKey) => void; onCancelAdd: () => void;
  isSelecting: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
}) {
  const ko = language === 'ko';
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:min-w-[1000px] h-full">
        <MeetingColumn title={ko ? "오늘" : "Today"} count={todayMeetings.length} meetings={todayMeetings}
          icon={<Sun size={16} className="text-amber-500" />} columnKey="today" onDrop={onDrop} onAddMeeting={onAddMeeting}
          isAdding={addingInColumn === 'today'} onStartAdd={() => onStartAdd('today')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
        <MeetingColumn title={ko ? "예정" : "Upcoming"} count={upcomingMeetings.length} meetings={upcomingMeetings}
          icon={<CalendarIcon size={16} className="text-blue-500" />} columnKey="upcoming" onDrop={onDrop} onAddMeeting={onAddMeeting}
          isAdding={addingInColumn === 'upcoming'} onStartAdd={() => onStartAdd('upcoming')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
        <MeetingColumn title={ko ? "완료" : "Completed"} count={completedMeetings.length} meetings={completedMeetings}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />} columnKey="completed" onDrop={onDrop} onAddMeeting={onAddMeeting}
          isAdding={addingInColumn === 'completed'} onStartAdd={() => onStartAdd('completed')} onCancelAdd={onCancelAdd}
          isSelecting={isSelecting} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
      </div>
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
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<ColumnKey | null>(null);
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
      const m = getMeeting(id);
      if (m) {
        moveToTrash({ id: m.id, type: 'meeting', title: m.title, data: m, deletedAt: new Date().toISOString() });
      }
      removeMeeting(id);
    });
    clearSelection();
  }, [selectedIds, removeMeeting, getMeeting, moveToTrash, clearSelection]);

  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    const q = searchQuery.toLowerCase();
    return meetings.filter(m => m.title.toLowerCase().includes(q) || m.location?.toLowerCase().includes(q));
  }, [meetings, searchQuery]);

  const todayMeetings = useMemo(() =>
    filteredMeetings.filter(m => m.status !== 'completed' && isToday(new Date(m.date)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [filteredMeetings]);
  const upcomingMeetings = useMemo(() =>
    filteredMeetings.filter(m => m.status !== 'completed' && !isToday(new Date(m.date)) && new Date(m.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [filteredMeetings]);
  const completedMeetings = useMemo(() =>
    filteredMeetings.filter(m => m.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [filteredMeetings]);

  const todayCount = meetings.filter(m => m.status !== 'completed' && isToday(new Date(m.date))).length;
  const upcomingCount = meetings.filter(m => m.status !== 'completed' && !isToday(new Date(m.date)) && new Date(m.date) >= new Date()).length;
  const completedCount = meetings.filter(m => m.status === 'completed').length;

  const handleDrop = useCallback((meetingId: string, targetColumn: ColumnKey) => {
    if (targetColumn === 'completed') updateMeeting(meetingId, { status: 'completed' });
    else if (targetColumn === 'today') {
      const d = new Date(); d.setHours(10, 0, 0, 0);
      updateMeeting(meetingId, { status: 'scheduled', date: d.toISOString() });
    } else {
      const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0);
      updateMeeting(meetingId, { status: 'scheduled', date: d.toISOString() });
    }
  }, [updateMeeting]);

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
          />
        ) : (
          <MeetingListView meetings={filteredMeetings} />
        )}
      </div>

      <MeetingSelectionToolbar count={selectedIds.size} language={language} onDelete={handleBulkDelete} onClear={clearSelection} />
    </div>
  );
}
