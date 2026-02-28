import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Clock, MapPin, Users, Calendar, Video, CheckCircle2, Circle,
  Plus, Trash2, ArrowRightCircle, Edit3, Check, X,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useMeetingContext, Meeting, ActionItem } from "../context/MeetingContext";
import { useTeam } from "../context/TeamContext";
import { useTaskContext } from "../context/TaskContext";
import { CreateMeetingDialog } from "../components/meeting/CreateMeetingDialog";
import { cn } from "../../lib/utils";

const TYPE_LABELS: Record<Meeting['type'], { labelKo: string; labelEn: string }> = {
  standup: { labelKo: '스탠드업', labelEn: 'Standup' },
  planning: { labelKo: '계획', labelEn: 'Planning' },
  review: { labelKo: '리뷰', labelEn: 'Review' },
  brainstorm: { labelKo: '브레인스토밍', labelEn: 'Brainstorm' },
  other: { labelKo: '기타', labelEn: 'Other' },
};

export function MeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { getMeeting, updateMeeting, removeMeeting } = useMeetingContext();
  const { members } = useTeam();
  const { addTask } = useTaskContext();

  const meeting = getMeeting(meetingId || '');
  const [notes, setNotes] = useState(meeting?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const meetingDate = new Date(meeting.date);
  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || id;
  const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar || '';

  const saveNotes = () => {
    updateMeeting(meeting.id, { notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const toggleStatus = () => {
    updateMeeting(meeting.id, { status: meeting.status === 'completed' ? 'scheduled' : 'completed' });
  };

  const addActionItem = () => {
    if (!newActionTitle.trim()) return;
    const item: ActionItem = {
      id: `ai-${Date.now()}`,
      title: newActionTitle.trim(),
      assigneeId: newActionAssignee || undefined,
      done: false,
    };
    updateMeeting(meeting.id, { actionItems: [...meeting.actionItems, item] });
    setNewActionTitle('');
    setNewActionAssignee('');
  };

  const toggleActionDone = (itemId: string) => {
    const updated = meeting.actionItems.map(a => a.id === itemId ? { ...a, done: !a.done } : a);
    updateMeeting(meeting.id, { actionItems: updated });
  };

  const removeActionItem = (itemId: string) => {
    updateMeeting(meeting.id, { actionItems: meeting.actionItems.filter(a => a.id !== itemId) });
  };

  const convertToTask = (item: ActionItem) => {
    const taskId = `t${Date.now()}`;
    addTask({
      id: taskId,
      title: item.title,
      status: item.done ? 'completed' : 'pending',
      progress: item.done ? 100 : 0,
      level: 'Month' as any,
      assigneeId: item.assigneeId,
    } as any);
    const updated = meeting.actionItems.map(a => a.id === item.id ? { ...a, linkedTaskId: taskId } : a);
    updateMeeting(meeting.id, { actionItems: updated });
  };

  const handleDelete = () => {
    if (!confirm(ko ? '이 회의를 삭제하시겠습니까?' : 'Delete this meeting?')) return;
    removeMeeting(meeting.id);
    navigate('/meetings');
  };

  return (
    <div className="h-full flex flex-col pb-8">
      {/* Header */}
      <header className="mb-6 shrink-0">
        <button onClick={() => navigate('/meetings')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft size={16} /> {ko ? '회의 목록' : 'Meetings'}
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {meetingDate.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {meetingDate.toLocaleTimeString(ko ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · {meeting.duration}min
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} /> {meeting.location}
                </span>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {ko ? TYPE_LABELS[meeting.type].labelKo : TYPE_LABELS[meeting.type].labelEn}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleStatus} className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
              meeting.status === 'completed'
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}>
              {meeting.status === 'completed' ? (ko ? '완료됨' : 'Completed') : (ko ? '완료 처리' : 'Mark Done')}
            </button>
            <button onClick={() => setEditDialogOpen(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <Edit3 size={16} />
            </button>
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left: Notes */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-bold text-gray-700">{ko ? '회의록' : 'Meeting Notes'}</h2>
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
              className="flex-1 w-full px-5 pb-5 text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none bg-transparent leading-relaxed min-h-[200px]"
            />
          </div>
        </div>

        {/* Right: Info + Action Items */}
        <div className="space-y-4">
          {/* Attendees */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users size={12} /> {ko ? '참석자' : 'Attendees'} ({meeting.attendeeIds.length})
            </h3>
            <div className="space-y-2">
              {meeting.attendeeIds.map(id => (
                <div key={id} className="flex items-center gap-2.5">
                  {getMemberAvatar(id) ? (
                    <img src={getMemberAvatar(id)} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"><Users size={12} className="text-gray-400" /></div>
                  )}
                  <span className="text-sm text-gray-700 font-medium">{getMemberName(id)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              {ko ? '액션 아이템' : 'Action Items'} ({meeting.actionItems.filter(a => a.done).length}/{meeting.actionItems.length})
            </h3>

            <div className="space-y-2 mb-3">
              {meeting.actionItems.map(item => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <button onClick={() => toggleActionDone(item.id)} className="mt-0.5 shrink-0">
                    {item.done
                      ? <CheckCircle2 size={18} className="text-emerald-500" />
                      : <Circle size={18} className="text-gray-300 hover:text-blue-400 transition-colors" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", item.done ? "text-gray-400 line-through" : "text-gray-700")}>{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.assigneeId && (
                        <span className="text-[10px] text-gray-400">{getMemberName(item.assigneeId)}</span>
                      )}
                      {item.linkedTaskId ? (
                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                          <Check size={9} /> {ko ? '태스크 연결됨' : 'Linked'}
                        </span>
                      ) : (
                        <button
                          onClick={() => convertToTask(item)}
                          className="text-[10px] text-gray-400 hover:text-blue-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowRightCircle size={10} /> {ko ? '태스크로 변환' : 'Convert to task'}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeActionItem(item.id)}
                    className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add action item */}
            <div className="flex gap-2">
              <input
                value={newActionTitle}
                onChange={e => setNewActionTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addActionItem()}
                placeholder={ko ? '액션 아이템 추가...' : 'Add action item...'}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
        </div>
      </div>

      <CreateMeetingDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} editMeeting={meeting} />
    </div>
  );
}
