import { useState } from "react";
import { X, Clock, MapPin, Users, Video } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useTeam } from "../../context/TeamContext";
import { useMeetingContext, Meeting } from "../../context/MeetingContext";
import { cn } from "../../../lib/utils";

const MEETING_TYPES = [
  { value: 'standup', labelKo: '스탠드업', labelEn: 'Standup' },
  { value: 'planning', labelKo: '계획', labelEn: 'Planning' },
  { value: 'review', labelKo: '리뷰', labelEn: 'Review' },
  { value: 'brainstorm', labelKo: '브레인스토밍', labelEn: 'Brainstorm' },
  { value: 'other', labelKo: '기타', labelEn: 'Other' },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editMeeting?: Meeting;
}

export function CreateMeetingDialog({ open, onOpenChange, editMeeting }: Props) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { members, currentUser } = useTeam();
  const { addMeeting, updateMeeting } = useMeetingContext();

  const [title, setTitle] = useState(editMeeting?.title || '');
  const [date, setDate] = useState(editMeeting?.date ? editMeeting.date.slice(0, 16) : '');
  const [duration, setDuration] = useState(editMeeting?.duration || 60);
  const [type, setType] = useState<Meeting['type']>(editMeeting?.type || 'other');
  const [location, setLocation] = useState(editMeeting?.location || '');
  const [attendeeIds, setAttendeeIds] = useState<string[]>(editMeeting?.attendeeIds || []);

  if (!open) return null;

  const toggleAttendee = (id: string) => {
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const now = new Date().toISOString();
    if (editMeeting) {
      updateMeeting(editMeeting.id, {
        title: title.trim(),
        date: new Date(date).toISOString(),
        duration,
        type,
        location: location.trim() || undefined,
        attendeeIds,
      });
    } else {
      const meeting: Meeting = {
        id: crypto.randomUUID(),
        title: title.trim(),
        date: new Date(date).toISOString(),
        duration,
        type,
        location: location.trim() || undefined,
        status: 'scheduled',
        attendeeIds: attendeeIds.length > 0 ? attendeeIds : [currentUser.id],
        organizerId: currentUser.id,
        notes: '',
        actionItems: [],
        createdAt: now,
        updatedAt: now,
      };
      addMeeting(meeting);
    }
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Video size={18} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {editMeeting ? (ko ? '회의 수정' : 'Edit Meeting') : (ko ? '새 회의' : 'New Meeting')}
            </h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{ko ? '제목' : 'Title'}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={ko ? '회의 제목을 입력하세요' : 'Enter meeting title'}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Clock size={11} /> {ko ? '일시' : 'Date & Time'}
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">{ko ? '소요시간 (분)' : 'Duration (min)'}</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hr</option>
                <option value={90}>1.5 hr</option>
                <option value={120}>2 hr</option>
              </select>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{ko ? '유형' : 'Type'}</label>
            <div className="flex flex-wrap gap-2">
              {MEETING_TYPES.map(mt => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setType(mt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    type === mt.value
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {ko ? mt.labelKo : mt.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <MapPin size={11} /> {ko ? '장소 / 링크' : 'Location / Link'}
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder={ko ? '회의실 또는 화상 링크' : 'Room or video link'}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <Users size={11} /> {ko ? '참석자' : 'Attendees'}
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAttendee(m.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    attendeeIds.includes(m.id)
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {m.avatar && <img src={m.avatar} alt="" className="w-4 h-4 rounded-full" />}
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {ko ? '취소' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              {editMeeting ? (ko ? '수정' : 'Update') : (ko ? '생성' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
