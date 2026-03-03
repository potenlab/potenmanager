import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Clock, MapPin, Users, Calendar, Video,
  CheckCircle2, Circle, Plus, Trash2, ArrowRightCircle,
  Edit3, Check, X, ChevronDown, CircleDot, XCircle,
  Timer, User as UserIcon, Sun, Sparkles, ClipboardList,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useMeetingContext, Meeting, ActionItem } from "../context/MeetingContext";
import { useTeam } from "../context/TeamContext";
import { useTaskContext } from "../context/TaskContext";
import { usePermission } from "../context/PermissionContext";
import { cn } from "../../lib/utils";
import { createPortal } from "react-dom";
import { useTrash } from "../context/TrashContext";
import { TaskCategory } from "../../lib/mockData";
import { TASK_CATEGORY_CONFIG, findBestAssignee } from "../../lib/jobRoles";
import { AiAssistantSidebar } from "../components/AiAssistantSidebar";

type MeetingStatus = Meeting['status'];
type MeetingType = Meeting['type'];

const STATUS_CONFIG: Record<MeetingStatus, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", labelKo: "예정", icon: <Calendar size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "Completed", labelKo: "완료", icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled: { label: "Cancelled", labelKo: "취소", icon: <XCircle size={14} />, color: "text-gray-500", bg: "bg-gray-100" },
};

const TYPE_CONFIG: Record<MeetingType, { label: string; labelKo: string; color: string; bg: string; icon: React.ReactNode }> = {
  standup:    { label: "Standup",    labelKo: "스탠드업",     color: "text-green-600",  bg: "bg-green-50",  icon: <Sun size={12} /> },
  planning:   { label: "Planning",   labelKo: "계획",         color: "text-blue-600",   bg: "bg-blue-50",   icon: <Calendar size={12} /> },
  review:     { label: "Review",     labelKo: "리뷰",         color: "text-purple-600", bg: "bg-purple-50", icon: <CheckCircle2 size={12} /> },
  brainstorm: { label: "Brainstorm", labelKo: "브레인스토밍", color: "text-amber-600",  bg: "bg-amber-50",  icon: <Sparkles size={12} /> },
  external:   { label: "External",   labelKo: "외부미팅",     color: "text-cyan-600",   bg: "bg-cyan-50",   icon: <MapPin size={12} /> },
  other:      { label: "Other",      labelKo: "기타",         color: "text-gray-600",   bg: "bg-gray-50",   icon: <Circle size={12} /> },
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// ─── Inline Editable Title ──────────────────────────────────────────
function InlineTitle({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) ref.current.textContent = value;
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const v = ref.current?.textContent?.trim() || "";
    if (v !== value) onChange(v);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ref.current?.blur(); } }}
      data-placeholder={placeholder}
      className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight outline-none rounded-lg empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none hover:bg-gray-50/50 focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1 border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
    />
  );
}

// ─── Portal Dropdown ────────────────────────────────────────────────
function usePortalPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256;
    if (top + 300 > window.innerHeight - 16) top = rect.top - 304;
    setPos({ top, left });
  }, [open]);
  return pos;
}

function InlineDropdown<T extends string>({
  value, options, onChange, renderOption, renderValue,
}: {
  value: T; options: T[]; onChange: (v: T) => void;
  renderOption: (opt: T) => React.ReactNode; renderValue: (val: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm hover:bg-gray-100">
        {renderValue(value)}
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[160px] py-1" style={{ top: pos.top, left: pos.left }}>
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors", opt === value && "bg-blue-50/50")}>
              {renderOption(opt)}
              {opt === value && <Check size={14} className="ml-auto text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Attendee Multi-Select ──────────────────────────────────────────
function AttendeePicker({ selectedIds, onChange, language }: { selectedIds: string[]; onChange: (ids: string[]) => void; language: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);
  const { members } = useTeam();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedMembers = selectedIds.map(id => members.find(m => m.id === id)).filter(Boolean) as typeof members;
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar || '';

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm hover:bg-gray-100">
        {selectedMembers.length === 0 ? (
          <span className="text-sm text-gray-400">{language === 'ko' ? '선택 없음' : 'None'}</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {selectedMembers.slice(0, 4).map(m => (
                m.avatar ? <img key={m.id} src={m.avatar} alt="" className="w-5 h-5 rounded-full ring-2 ring-white object-cover" />
                  : <div key={m.id} className="w-5 h-5 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center"><Users size={9} className="text-gray-400" /></div>
              ))}
              {selectedMembers.length > 4 && (
                <div className="w-5 h-5 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[8px] font-bold text-gray-500">+{selectedMembers.length - 4}</div>
              )}
            </div>
            <span className="font-medium text-gray-700">{selectedMembers.length}{language === 'ko' ? '명' : ''}</span>
          </div>
        )}
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[200px] py-1" style={{ top: pos.top, left: pos.left }}>
          {members.map(m => (
            <button key={m.id} onClick={() => toggle(m.id)}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors", selectedIds.includes(m.id) && "bg-blue-50/50")}>
              {m.avatar ? <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><Users size={10} className="text-gray-400" /></div>}
              <span className="flex-1 text-left">{m.name}</span>
              {selectedIds.includes(m.id) && <Check size={14} className="text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Property Row ───────────────────────────────────────────────────
function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon} <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Main Detail Page ───────────────────────────────────────────────
export function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { getMeeting, addMeeting, updateMeeting, removeMeeting } = useMeetingContext();
  const { members, currentUser } = useTeam();
  const { addTask } = useTaskContext();
  const { moveToTrash } = useTrash();
  const { can } = usePermission();
  const createdRef = useRef(false);

  // Handle /meetings/new — create a meeting and redirect
  useEffect(() => {
    if (meetingId === 'new' && !createdRef.current) {
      createdRef.current = true;
      const id = `mt-${Date.now()}`;
      const now = new Date();
      const meetingDate = new Date();
      meetingDate.setHours(now.getHours() + 1, 0, 0, 0);
      const newMeeting: Meeting = {
        id,
        title: '',
        date: meetingDate.toISOString(),
        duration: 60,
        type: 'other',
        status: 'scheduled',
        attendeeIds: [currentUser.id],
        organizerId: currentUser.id,
        notes: '',
        actionItems: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      addMeeting(newMeeting);
      navigate(`/meetings/${id}`, { replace: true });
    }
  }, [meetingId]);

  const meeting = getMeeting(meetingId || '');
  const [notes, setNotes] = useState(meeting?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [newActionCategory, setNewActionCategory] = useState<TaskCategory | ''>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  if (meetingId === 'new') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
        <Video size={40} className="text-gray-300" />
        <p>{ko ? '회의를 찾을 수 없습니다' : 'Meeting not found'}</p>
        <button onClick={() => navigate('/meetings')} className="text-sm text-blue-600 hover:underline">
          {ko ? '회의 목록으로' : 'Back to meetings'}
        </button>
      </div>
    );
  }

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || id;

  const handleTitleChange = (v: string) => updateMeeting(meeting.id, { title: v });

  const handleStatusChange = (s: MeetingStatus) => updateMeeting(meeting.id, { status: s });
  const handleTypeChange = (t: MeetingType) => updateMeeting(meeting.id, { type: t });
  const handleDurationChange = (d: string) => updateMeeting(meeting.id, { duration: Number(d) });
  const handleLocationChange = (loc: string) => updateMeeting(meeting.id, { location: loc || undefined });
  const handleAttendeeChange = (ids: string[]) => updateMeeting(meeting.id, { attendeeIds: ids });
  const handleDateChange = (dateStr: string) => {
    if (dateStr) updateMeeting(meeting.id, { date: new Date(dateStr).toISOString() });
  };

  const saveNotes = () => {
    updateMeeting(meeting.id, { notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const addActionItem = () => {
    if (!newActionTitle.trim()) return;
    const item: ActionItem = {
      id: `ai-${Date.now()}`, title: newActionTitle.trim(),
      assigneeId: newActionAssignee || undefined, done: false,
      category: newActionCategory || undefined,
    };
    updateMeeting(meeting.id, { actionItems: [...meeting.actionItems, item] });
    setNewActionTitle('');
    setNewActionAssignee('');
    setNewActionCategory('');
  };

  const toggleActionDone = (itemId: string) => {
    updateMeeting(meeting.id, { actionItems: meeting.actionItems.map(a => a.id === itemId ? { ...a, done: !a.done } : a) });
  };

  const removeActionItem = (itemId: string) => {
    updateMeeting(meeting.id, { actionItems: meeting.actionItems.filter(a => a.id !== itemId) });
  };

  const convertToTask = (item: ActionItem, overrideAssignee?: string, overrideCategory?: TaskCategory) => {
    const taskId = `t${Date.now()}`;
    const category = overrideCategory || item.category;
    const assigneeId = overrideAssignee || item.assigneeId || (category ? findBestAssignee(members, category)?.id : undefined);
    addTask({ id: taskId, title: item.title, status: item.done ? 'completed' : 'pending', progress: item.done ? 100 : 0, level: 'Day' as any, assigneeId, category } as any);
    updateMeeting(meeting.id, { actionItems: meeting.actionItems.map(a => a.id === item.id ? { ...a, linkedTaskId: taskId } : a) });
  };

  const canAssignTasks = can('task.assignOthers');
  const unassignedItems = meeting.actionItems.filter(a => !a.linkedTaskId);

  const handleBulkAssign = () => {
    unassignedItems.forEach((item, idx) => {
      setTimeout(() => {
        const category = item.category;
        const assignee = category ? findBestAssignee(members, category) : undefined;
        convertToTask(item, assignee?.id, category);
      }, idx * 50);
    });
    setShowAssignDialog(false);
  };

  const handleDelete = () => {
    if (!confirm(ko ? '이 회의를 삭제하시겠습니까?' : 'Delete this meeting?')) return;
    moveToTrash({ id: meeting.id, type: 'meeting', title: meeting.title, data: meeting, deletedAt: new Date().toISOString() });
    removeMeeting(meeting.id);
    navigate('/meetings');
  };

  const meetingDate = new Date(meeting.date);
  const dateLocalStr = meetingDate.toISOString().slice(0, 16);

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-64">

        {/* Navigation & Actions */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/meetings')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {ko ? '회의 목록' : 'Meetings'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex gap-6">
        <div className="flex-1 min-w-0 max-w-3xl">
          <div className="space-y-6">

            {/* Title */}
            <InlineTitle value={meeting.title} onChange={handleTitleChange} placeholder={ko ? '회의 제목' : 'Meeting Title'} />

            {/* Properties */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <PropertyItem icon={<CircleDot size={14} />} label={ko ? '상태' : 'Status'}>
                <InlineDropdown
                  value={meeting.status}
                  options={['scheduled', 'completed', 'cancelled'] as MeetingStatus[]}
                  onChange={handleStatusChange}
                  renderValue={(v) => {
                    const cfg = STATUS_CONFIG[v];
                    return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {ko ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", STATUS_CONFIG[o].color)}>{STATUS_CONFIG[o].icon} {ko ? STATUS_CONFIG[o].labelKo : STATUS_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Video size={14} />} label={ko ? '유형' : 'Type'}>
                <InlineDropdown
                  value={meeting.type}
                  options={['standup', 'planning', 'review', 'brainstorm', 'external', 'other'] as MeetingType[]}
                  onChange={handleTypeChange}
                  renderValue={(v) => <span className={cn("px-2 py-0.5 rounded-md font-bold flex items-center gap-1", TYPE_CONFIG[v].bg, TYPE_CONFIG[v].color)}>{TYPE_CONFIG[v].icon} {ko ? TYPE_CONFIG[v].labelKo : TYPE_CONFIG[v].label}</span>}
                  renderOption={(o) => <span className={cn("flex items-center gap-1.5", TYPE_CONFIG[o].color)}>{TYPE_CONFIG[o].icon} {ko ? TYPE_CONFIG[o].labelKo : TYPE_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Calendar size={14} />} label={ko ? '일시' : 'Date & Time'}>
                <input
                  type="datetime-local"
                  value={dateLocalStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700"
                />
              </PropertyItem>

              <PropertyItem icon={<Timer size={14} />} label={ko ? '소요시간' : 'Duration'}>
                <InlineDropdown
                  value={String(meeting.duration)}
                  options={DURATION_OPTIONS.map(String)}
                  onChange={(v) => handleDurationChange(v)}
                  renderValue={(v) => <span className="font-medium text-gray-700">{Number(v) >= 60 ? `${Number(v) / 60}h` : `${v}min`}</span>}
                  renderOption={(o) => <span>{Number(o) >= 60 ? `${Number(o) / 60} hour${Number(o) > 60 ? 's' : ''}` : `${o} min`}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<MapPin size={14} />} label={ko ? '장소' : 'Location'}>
                <input
                  value={meeting.location || ''}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder={ko ? '장소 또는 링크' : 'Room or link'}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-full"
                />
              </PropertyItem>

              <PropertyItem icon={<Users size={14} />} label={ko ? '참석자' : 'Attendees'}>
                <AttendeePicker selectedIds={meeting.attendeeIds} onChange={handleAttendeeChange} language={language} />
              </PropertyItem>

              <PropertyItem icon={<UserIcon size={14} />} label={ko ? '주최자' : 'Organizer'}>
                <span className="px-2 py-1 text-sm font-medium text-gray-700">{getMemberName(meeting.organizerId)}</span>
              </PropertyItem>
            </div>

            {/* Action Items */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 size={14} className="text-gray-400" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {ko ? '액션 아이템' : 'Action Items'}
                </span>
                <span className="text-[11px] text-gray-300 ml-auto mr-2">
                  {meeting.actionItems.filter(a => a.done).length}/{meeting.actionItems.length}
                </span>
                {canAssignTasks && unassignedItems.length > 0 && (
                  <button
                    onClick={() => setShowAssignDialog(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <ClipboardList size={12} />
                    {ko ? '업무 할당' : 'Assign Tasks'}
                    <span className="ml-0.5 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unassignedItems.length}</span>
                  </button>
                )}
              </div>

              {meeting.actionItems.length > 0 && (
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${meeting.actionItems.length > 0 ? (meeting.actionItems.filter(a => a.done).length / meeting.actionItems.length) * 100 : 0}%` }}
                  />
                </div>
              )}

              <div className="space-y-0.5">
                {meeting.actionItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                    <button
                      onClick={() => toggleActionDone(item.id)}
                      className={cn(
                        "shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all",
                        item.done ? "bg-blue-500 border-blue-500" : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {item.done && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", item.done ? "text-gray-400 line-through" : "text-gray-700")}>{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.category && TASK_CATEGORY_CONFIG[item.category] && (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", TASK_CATEGORY_CONFIG[item.category].bg, TASK_CATEGORY_CONFIG[item.category].color)}>
                            {TASK_CATEGORY_CONFIG[item.category].icon}
                            {ko ? TASK_CATEGORY_CONFIG[item.category].labelKo : TASK_CATEGORY_CONFIG[item.category].label}
                          </span>
                        )}
                        {item.assigneeId && <span className="text-[10px] text-gray-400">{getMemberName(item.assigneeId)}</span>}
                        {item.linkedTaskId ? (
                          <button onClick={() => navigate(`/tasks/${item.linkedTaskId}`)} className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 hover:underline transition-colors"><Check size={9} /> {ko ? '태스크 보기' : 'View task'}</button>
                        ) : (
                          <button onClick={() => convertToTask(item)} className="text-[10px] text-gray-400 hover:text-blue-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRightCircle size={10} /> {ko ? '태스크로 변환' : 'Convert to task'}
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeActionItem(item.id)} className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add action item */}
              <div className="flex gap-2 px-2">
                <input
                  value={newActionTitle}
                  onChange={e => setNewActionTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addActionItem()}
                  placeholder={ko ? '액션 아이템 추가...' : 'Add action item...'}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newActionCategory}
                  onChange={e => setNewActionCategory(e.target.value as TaskCategory | '')}
                  className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[90px]"
                >
                  <option value="">{ko ? '카테고리' : 'Category'}</option>
                  {(Object.entries(TASK_CATEGORY_CONFIG) as [TaskCategory, typeof TASK_CATEGORY_CONFIG[TaskCategory]][]).map(([key, cfg]) => (
                    <option key={key} value={key}>{ko ? cfg.labelKo : cfg.label}</option>
                  ))}
                </select>
                <select
                  value={newActionAssignee}
                  onChange={e => setNewActionAssignee(e.target.value)}
                  className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[100px]"
                >
                  <option value="">{ko ? '담당자' : 'Assign'}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button
                  onClick={addActionItem}
                  disabled={!newActionTitle.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{ko ? '회의록' : 'Meeting Notes'}</span>
                <button
                  onClick={saveNotes}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    notesSaved ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                >
                  {notesSaved ? (ko ? '저장됨!' : 'Saved!') : (ko ? '저장' : 'Save')}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={ko ? '회의 내용을 기록하세요...' : 'Write meeting notes here...'}
                className="w-full text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none bg-transparent leading-relaxed min-h-[200px]"
              />
            </div>
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <AiAssistantSidebar
          title={meeting.title}
          description={notes}
          entityType="meeting"
          language={language}
        />
        </div>
      </div>

      {/* Task Assignment Dialog */}
      {showAssignDialog && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAssignDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardList size={16} className="text-blue-600" />
                  {ko ? '업무 할당' : 'Assign Tasks'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {ko ? '액션 아이템을 역할에 맞는 담당자에게 업무로 할당합니다' : 'Assign action items as tasks to matching team members'}
                </p>
              </div>
              <button onClick={() => setShowAssignDialog(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[50vh] space-y-2">
              {unassignedItems.map(item => {
                const suggested = item.category ? findBestAssignee(members, item.category) : undefined;
                const catCfg = item.category ? TASK_CATEGORY_CONFIG[item.category] : undefined;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {catCfg && (
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5", catCfg.bg, catCfg.color)}>
                            {catCfg.icon} {ko ? catCfg.labelKo : catCfg.label}
                          </span>
                        )}
                        {suggested ? (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                            → {suggested.name}
                          </span>
                        ) : item.assigneeId ? (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {getMemberName(item.assigneeId)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">
                            {ko ? '매칭 없음' : 'No match'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[11px] text-gray-400">
                {unassignedItems.length}{ko ? '개 아이템' : ' items'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAssignDialog(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {ko ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={handleBulkAssign}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <ClipboardList size={12} />
                  {ko ? '전체 할당' : 'Assign All'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
