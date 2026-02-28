import {
  Calendar, Clock, CheckCircle2, Video, Users,
  MapPin, MoreHorizontal, XCircle,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Meeting } from "../../context/MeetingContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTeam } from "../../context/TeamContext";
import { useNavigate } from "react-router";

const TYPE_COLORS: Record<Meeting['type'], { bg: string; text: string; border: string; label: string; labelKo: string }> = {
  standup: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', label: 'Standup', labelKo: '스탠드업' },
  planning: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', label: 'Planning', labelKo: '계획' },
  review: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', label: 'Review', labelKo: '리뷰' },
  brainstorm: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', label: 'Brainstorm', labelKo: '브레인스토밍' },
  other: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', label: 'Other', labelKo: '기타' },
};

interface Props {
  meetings: Meeting[];
  onStatusChange?: (meetingId: string, newStatus: Meeting['status']) => void;
}

export function MeetingListView({ meetings, onStatusChange }: Props) {
  const { language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members } = useTeam();

  const getStatusInfo = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return { icon: <CheckCircle2 size={18} className="text-emerald-500" />, label: ko ? '완료' : 'Done', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'cancelled': return { icon: <XCircle size={18} className="text-gray-400" />, label: ko ? '취소' : 'Cancelled', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
      default: return { icon: <Calendar size={18} className="text-blue-500" />, label: ko ? '예정' : 'Scheduled', cls: 'bg-blue-50 text-blue-600 border-blue-100' };
    }
  };

  const getMemberAvatar = (id: string) => members.find(m => m.id === id)?.avatar || '';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 text-center">#</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[250px]">
                {ko ? '회의명' : 'Meeting'}
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {ko ? '상태' : 'Status'}
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {ko ? '유형' : 'Type'}
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {ko ? '일시' : 'Date & Time'}
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {ko ? '참석자' : 'Attendees'}
              </th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {ko ? '액션' : 'Actions'}
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {meetings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center text-gray-400 italic">
                  {ko ? '회의가 없습니다.' : 'No meetings found.'}
                </td>
              </tr>
            ) : (
              meetings.map((meeting, index) => {
                const meetingDate = new Date(meeting.date);
                const statusInfo = getStatusInfo(meeting.status);
                const tc = TYPE_COLORS[meeting.type];
                const now = new Date();
                const isPast = meetingDate < now && meeting.status === 'scheduled';

                return (
                  <tr
                    key={meeting.id}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono text-center">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (meeting.status === 'completed') {
                              onStatusChange?.(meeting.id, 'scheduled');
                            } else {
                              onStatusChange?.(meeting.id, 'completed');
                            }
                          }}
                          className="shrink-0"
                        >
                          {statusInfo.icon}
                        </button>
                        <div>
                          <p className={cn(
                            "text-sm font-medium text-gray-900 line-clamp-1",
                            meeting.status === 'completed' && "line-through text-gray-400"
                          )}>
                            {meeting.title}
                          </p>
                          {meeting.location && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} /> {meeting.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border",
                        statusInfo.cls
                      )}>
                        {statusInfo.label}
                      </span>
                      {isPast && (
                        <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          {ko ? '지남' : 'Past'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border",
                        tc.bg, tc.text, tc.border
                      )}>
                        {ko ? tc.labelKo : tc.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                          <Calendar size={11} />
                          {meetingDate.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {meetingDate.toLocaleTimeString(ko ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · {meeting.duration}min
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex -space-x-1.5">
                        {meeting.attendeeIds.slice(0, 3).map(id => {
                          const avatar = getMemberAvatar(id);
                          return avatar ? (
                            <img key={id} src={avatar} alt="" className="w-6 h-6 rounded-full border-2 border-white" />
                          ) : (
                            <div key={id} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                              <Users size={10} className="text-gray-400" />
                            </div>
                          );
                        })}
                        {meeting.attendeeIds.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-semibold text-gray-500">
                            +{meeting.attendeeIds.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {meeting.actionItems.length > 0 ? (
                        <span className="text-xs text-gray-500 font-medium">
                          {meeting.actionItems.filter(a => a.done).length}/{meeting.actionItems.length}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
