import { useState } from "react";
import { useNavigate } from "react-router";
import { Video, Plus, Clock, MapPin, Users, Calendar, ChevronRight } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useMeetingContext, Meeting } from "../context/MeetingContext";
import { useTeam } from "../context/TeamContext";
import { CreateMeetingDialog } from "../components/meeting/CreateMeetingDialog";
import { cn } from "../../lib/utils";

type Tab = 'upcoming' | 'completed' | 'all';

const TYPE_COLORS: Record<Meeting['type'], { bg: string; text: string; label: string; labelKo: string }> = {
  standup: { bg: 'bg-green-50', text: 'text-green-600', label: 'Standup', labelKo: '스탠드업' },
  planning: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Planning', labelKo: '계획' },
  review: { bg: 'bg-purple-50', text: 'text-purple-600', label: 'Review', labelKo: '리뷰' },
  brainstorm: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Brainstorm', labelKo: '브레인스토밍' },
  other: { bg: 'bg-gray-50', text: 'text-gray-600', label: 'Other', labelKo: '기타' },
};

export function MeetingPage() {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { meetings, isLoading } = useMeetingContext();
  const { members } = useTeam();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [dialogOpen, setDialogOpen] = useState(false);

  const now = new Date();
  const filtered = meetings.filter(m => {
    if (tab === 'upcoming') return m.status === 'scheduled';
    if (tab === 'completed') return m.status === 'completed';
    return true;
  }).sort((a, b) => {
    if (tab === 'completed') return new Date(b.date).getTime() - new Date(a.date).getTime();
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: ko ? '예정' : 'Upcoming', count: meetings.filter(m => m.status === 'scheduled').length },
    { key: 'completed', label: ko ? '완료' : 'Completed', count: meetings.filter(m => m.status === 'completed').length },
    { key: 'all', label: ko ? '전체' : 'All', count: meetings.length },
  ];

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || '';
  const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar || '';

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{ko ? '회의' : 'Meetings'}</h1>
            <p className="text-gray-500 text-sm">{ko ? '팀 회의를 관리하고 회의록을 기록하세요' : 'Manage team meetings and take notes'}</p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus size={16} />
            {ko ? '새 회의' : 'New Meeting'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", tab === t.key ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Meeting List */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
            <Video size={28} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-500 mb-1">
              {tab === 'upcoming' ? (ko ? '예정된 회의가 없습니다' : 'No upcoming meetings') : (ko ? '회의가 없습니다' : 'No meetings')}
            </p>
            <p className="text-sm">{ko ? '새 회의를 만들어보세요' : 'Create a new meeting to get started'}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {filtered.map(meeting => {
            const meetingDate = new Date(meeting.date);
            const isPast = meetingDate < now && meeting.status === 'scheduled';
            const tc = TYPE_COLORS[meeting.type];

            return (
              <div
                key={meeting.id}
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                className={cn(
                  "bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group",
                  isPast && "border-amber-200 bg-amber-50/30"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", tc.bg, tc.text)}>
                        {ko ? tc.labelKo : tc.label}
                      </span>
                      {meeting.status === 'completed' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                          {ko ? '완료' : 'Done'}
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          {ko ? '지남' : 'Past due'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2 truncate">{meeting.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {meetingDate.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {meetingDate.toLocaleTimeString(ko ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-gray-300 mx-0.5">·</span>
                        {meeting.duration}min
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {meeting.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Attendee avatars */}
                    <div className="flex -space-x-2">
                      {meeting.attendeeIds.slice(0, 4).map(id => {
                        const avatar = getMemberAvatar(id);
                        return avatar ? (
                          <img key={id} src={avatar} alt="" className="w-7 h-7 rounded-full border-2 border-white" />
                        ) : (
                          <div key={id} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                            <Users size={12} className="text-gray-400" />
                          </div>
                        );
                      })}
                      {meeting.attendeeIds.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-gray-500">
                          +{meeting.attendeeIds.length - 4}
                        </div>
                      )}
                    </div>

                    {meeting.actionItems.length > 0 && (
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                        {meeting.actionItems.filter(a => a.done).length}/{meeting.actionItems.length}
                      </span>
                    )}

                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateMeetingDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
