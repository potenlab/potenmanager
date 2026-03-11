import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { cn } from "../../lib/utils";
import {
  MEMBER_COLORS,
  getUserColor,
  setUserColor,
  getColorOwner,
  getMemberColorConfig,
  getSpecialColorOwner,
  SpecialColorOwner,
  Task,
  JobRole,
  getAllAssigneeIds,
} from "../../lib/mockData";
import { JOB_ROLE_CONFIG, JOB_ROLES } from "../../lib/jobRoles";
import { api } from "../../lib/api";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { getRoleInfo, ROLE_INFO, Role } from "../../lib/permissions";
import { useTaskContext } from "../context/TaskContext";
import { useMeetingContext } from "../context/MeetingContext";
import { useTeam } from "../context/TeamContext";
import { useAuth } from "../context/AuthContext";
import {
  format,
  isToday,
  isYesterday,
  isBefore,
  startOfDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import { createPortal } from "react-dom";
import {
  Circle,
  CircleDot,
  CheckCircle2,
  Users,
  Shield,
  Mail,
  Briefcase,
  MoreVertical,
  ListFilter,
  UserCog,
  UserMinus,
  Palette,
  Calendar,
  Check,
  ArrowLeft,
  Edit3,
  X,
  Trash2,
  Crown,
  Eye as EyeIcon,
  Video,
  Clock,
  Settings,
} from "lucide-react";

type FilterTab = "all" | "in-progress" | "pending" | "completed";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    labelKo: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
  }
> = {
  pending: {
    label: "To Do",
    labelKo: "할 일",
    icon: <Circle size={14} />,
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
  "in-progress": {
    label: "In Progress",
    labelKo: "진행 중",
    icon: <CircleDot size={14} />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  routine: {
    label: "Routine",
    labelKo: "루틴",
    icon: <Clock size={14} />,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  completed: {
    label: "Done",
    labelKo: "완료",
    icon: <CheckCircle2 size={14} />,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; labelKo: string; color: string; dot: string }
> = {
  low: { label: "Low", labelKo: "낮음", color: "text-blue-600", dot: "bg-blue-400" },
  medium: { label: "Medium", labelKo: "보통", color: "text-green-600", dot: "bg-green-400" },
  high: { label: "High", labelKo: "높음", color: "text-red-600", dot: "bg-red-500" },
  delayed: { label: "Delayed", labelKo: "지연", color: "text-orange-600", dot: "bg-orange-400" },
};

export function TeamMemberPage() {
  const { memberId } = useParams();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { can, canManage, getMemberRole, changeMemberRole, members, currentUser } = usePermission();
  const { tasks } = useTaskContext();
  const { meetings } = useMeetingContext();
  const { user: authUser } = useAuth();
  const { updateMember } = useTeam();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [memberColor, setMemberColor] = useState<string | null>(() =>
    getUserColor(memberId ?? "")
  );

  // memberId가 바뀔 때(다른 팀원 페이지로 이동) 색상 상태를 올바르게 동기화
  useEffect(() => {
    setMemberColor(getUserColor(memberId ?? ""));
  }, [memberId]);

  const [showMenu, setShowMenu] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showJobRoleModal, setShowJobRoleModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const member = members.find((m) => m.id === memberId);

  const isMe = memberId === currentUser.id;
  const canEditRole = !isMe && can('team.editRole') && canManage(memberId ?? "");
  const canRemoveMember = !isMe && can('team.remove') && canManage(memberId ?? "");
  const canPickColor = isMe || can('team.editRole');

  // Get the member's actual role from permission context
  const memberRole = getMemberRole(memberId ?? "") as Role;
  const roleInfo = getRoleInfo(memberRole);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const memberTasks = useMemo(() => {
    return tasks.filter((t) => getAllAssigneeIds(t).includes(memberId));
  }, [tasks, memberId]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return memberTasks;
    return memberTasks.filter((t) => t.status === filter);
  }, [memberTasks, filter]);

  // Stats
  const stats = useMemo(() => {
    const total = memberTasks.length;
    const completed = memberTasks.filter((t) => t.status === "completed").length;
    const inProgress = memberTasks.filter(
      (t) => t.status === "in-progress"
    ).length;
    const pending = memberTasks.filter((t) => t.status === "pending").length;
    const overdue = memberTasks.filter(
      (t) =>
        t.dueDate &&
        isBefore(startOfDay(new Date(t.dueDate)), startOfDay(new Date())) &&
        t.status !== "completed"
    ).length;
    return { total, completed, inProgress, pending, overdue };
  }, [memberTasks]);

  // Member meetings
  const memberMeetings = useMemo(() => {
    return meetings
      .filter((m) => m.attendeeIds.includes(memberId ?? "") || m.organizerId === memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [meetings, memberId]);

  // Sort: in-progress first, then pending, then completed
  const sortedTasks = useMemo(() => {
    const order = { "in-progress": 0, pending: 1, completed: 2 };
    return [...filteredTasks].sort((a, b) => {
      const oa = order[a.status as keyof typeof order] ?? 1;
      const ob = order[b.status as keyof typeof order] ?? 1;
      if (oa !== ob) return oa - ob;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });
  }, [filteredTasks]);

  if (!member) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Users size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {language === "ko" ? "멤버를 찾을 수 없습니다" : "Member not found"}
          </h2>
          <button
            onClick={() => navigate("/team")}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {language === "ko" ? "팀 페이지로 돌아가기" : "Back to Team"}
          </button>
        </div>
      </div>
    );
  }

  const email = isMe ? authUser?.email : member?.email;
  const colorConfig = memberColor ? getMemberColorConfig(memberColor) : null;

  const filterTabs: {
    key: FilterTab;
    label: string;
    labelKo: string;
    count: number;
  }[] = [
    { key: "all", label: "All", labelKo: "전체", count: stats.total },
    {
      key: "in-progress",
      label: "In Progress",
      labelKo: "진행 중",
      count: stats.inProgress,
    },
    { key: "pending", label: "To Do", labelKo: "할 일", count: stats.pending },
    {
      key: "completed",
      label: "Done",
      labelKo: "완료",
      count: stats.completed,
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Back nav */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-6 transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          {language === "ko" ? "뒤로 가기" : "Go back"}
        </button>

        {/* ── Member Profile Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {/* Color accent bar at top */}
          {memberColor && (
            <div
              className="h-1.5"
              style={{
                background: `linear-gradient(90deg, ${memberColor}30, ${memberColor}90, ${memberColor}30)`,
              }}
            />
          )}

          <div className="p-5 sm:p-6">
            {/* Top row: avatar + info + menu */}
            <div className="flex items-start gap-4 sm:gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-gray-100 shadow-sm"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {member.name}
                  </h1>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider"
                    style={{ backgroundColor: roleInfo.bgColor, color: roleInfo.color }}
                  >
                    {memberRole === "owner" ? (
                      <Crown size={10} />
                    ) : memberRole === "admin" ? (
                      <Shield size={10} />
                    ) : memberRole === "viewer" ? (
                      <EyeIcon size={10} />
                    ) : (
                      <Users size={10} />
                    )}
                    {roleInfo.labelEn}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500">
                  {email && (
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-gray-400" />
                      {email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-gray-400" />
                    {member.jobTitle || (language === 'ko' ? '직책 미설정' : 'No title set')}
                  </span>
                  {member.jobRole && JOB_ROLE_CONFIG[member.jobRole] && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                      <span>{JOB_ROLE_CONFIG[member.jobRole].emoji}</span>
                      {language === "ko" ? JOB_ROLE_CONFIG[member.jobRole].labelKo : JOB_ROLE_CONFIG[member.jobRole].label}
                    </span>
                  )}
                </div>
              </div>

              {/* Settings (own profile) + 3-dot menu */}
              <div className="flex items-center gap-1 shrink-0">
              {isMe && (
                <button
                  onClick={() => navigate("/mypage")}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title={language === "ko" ? "설정" : "Settings"}
                >
                  <Settings size={18} />
                </button>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
                {showMenu &&
                  createPortal(
                    <MemberMenu
                      menuRef={menuRef}
                      language={language}
                      isMe={isMe}
                      canEditRole={canEditRole}
                      canRemove={canRemoveMember}
                      canPickColor={canPickColor}
                      memberColor={memberColor}
                      onMyPage={() => {
                        setShowMenu(false);
                        navigate("/mypage");
                      }}
                      onChangeRole={() => {
                        setShowMenu(false);
                        setShowRoleModal(true);
                      }}
                      onRemove={() => {
                        setShowMenu(false);
                        setShowRemoveModal(true);
                      }}
                      onChangeJobRole={() => {
                        setShowMenu(false);
                        setShowJobRoleModal(true);
                      }}
                      onCalendarColor={() => {
                        setShowMenu(false);
                        setShowColorModal(true);
                      }}
                      onClose={() => setShowMenu(false)}
                    />,
                    document.body
                  )}
              </div>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <StatCard
                label={language === "ko" ? "전체 업무" : "Total Tasks"}
                value={stats.total}
                color="text-gray-900"
                bg="bg-gray-50"
              />
              <StatCard
                label={language === "ko" ? "진행 중" : "In Progress"}
                value={stats.inProgress}
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <StatCard
                label={language === "ko" ? "완료" : "Completed"}
                value={stats.completed}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <StatCard
                label={language === "ko" ? "지연됨" : "Overdue"}
                value={stats.overdue}
                color={stats.overdue > 0 ? "text-red-600" : "text-gray-400"}
                bg={stats.overdue > 0 ? "bg-red-50" : "bg-gray-50"}
              />
            </div>
          </div>
        </div>

        {/* ── Task Filter Tabs ── */}
        <div className="flex items-center gap-1 mb-4 bg-gray-50 rounded-xl p-1 border border-gray-100">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
                filter === tab.key
                  ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <span>{language === "ko" ? tab.labelKo : tab.label}</span>
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  filter === tab.key
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tasks List ── */}
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <ListFilter size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {language === "ko"
                  ? "해당하는 업무가 없습니다."
                  : "No tasks found."}
              </p>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                language={language}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))
          )}
        </div>

        {/* ── Meetings ── */}
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Video size={16} className="text-purple-500" />
            {language === "ko" ? "회의" : "Meetings"}
            <span className="text-xs font-medium text-gray-400 ml-1">
              {memberMeetings.length}
            </span>
          </h3>
          <div className="space-y-2">
            {memberMeetings.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                <Video size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">
                  {language === "ko" ? "참여한 회의가 없습니다." : "No meetings found."}
                </p>
              </div>
            ) : (
              memberMeetings.slice(0, 10).map((meeting) => {
                const meetingDate = new Date(meeting.date);
                const dateStr = format(
                  meetingDate,
                  language === "ko" ? "M월 d일 HH:mm" : "MMM d, HH:mm",
                  language === "ko" ? { locale: ko } : undefined
                );
                const durationStr = meeting.duration >= 60
                  ? `${Math.floor(meeting.duration / 60)}h${meeting.duration % 60 ? ` ${meeting.duration % 60}m` : ""}`
                  : `${meeting.duration}m`;
                const typeLabels: Record<string, { ko: string; en: string }> = {
                  standup: { ko: "스탠드업", en: "Standup" },
                  planning: { ko: "기획", en: "Planning" },
                  review: { ko: "리뷰", en: "Review" },
                  brainstorm: { ko: "브레인스토밍", en: "Brainstorm" },
                  other: { ko: "기타", en: "Other" },
                };
                const typeLabel = typeLabels[meeting.type] || typeLabels.other;

                return (
                  <button
                    key={meeting.id}
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-purple-100 transition-all text-left group hover:shadow-md hover:border-purple-200"
                  >
                    <div className="shrink-0 text-purple-500">
                      <Video size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                        {meeting.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {dateStr}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {durationStr}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                      {language === "ko" ? typeLabel.ko : typeLabel.en}
                    </span>
                    <span className={cn(
                      "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      meeting.status === "completed" ? "bg-emerald-50 text-emerald-600" :
                      meeting.status === "cancelled" ? "bg-gray-100 text-gray-400" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {meeting.status === "completed"
                        ? (language === "ko" ? "완료" : "Done")
                        : meeting.status === "cancelled"
                        ? (language === "ko" ? "취소" : "Cancelled")
                        : (language === "ko" ? "예정" : "Scheduled")}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal &&
        member &&
        createPortal(
          <RoleChangeModal
            member={member}
            language={language}
            onClose={() => setShowRoleModal(false)}
          />,
          document.body
        )}

      {/* Remove Member Modal */}
      {showRemoveModal &&
        member &&
        createPortal(
          <RemoveMemberModal
            member={member}
            language={language}
            onClose={() => setShowRemoveModal(false)}
            onConfirm={() => {
              setShowRemoveModal(false);
              navigate("/team");
            }}
          />,
          document.body
        )}

      {/* Color Change Modal */}
      {showColorModal &&
        member &&
        createPortal(
          <ColorChangeModal
            member={member}
            language={language}
            onClose={() => setShowColorModal(false)}
            onConfirm={(c) => {
              setShowColorModal(false);
              setMemberColor(c);
            }}
          />,
          document.body
        )}

      {/* Job Role Modal */}
      {showJobRoleModal &&
        member &&
        createPortal(
          <JobRoleModal
            member={member}
            language={language}
            onClose={() => setShowJobRoleModal(false)}
            onSave={(role) => {
              updateMember(member.id, { jobRole: role });
              api.updateProfile(member.id, { jobRole: role || '' }).catch(() => {});
            }}
          />,
          document.body
        )}
    </div>
  );
}

// ─── 3-dot Menu ─────────────────────────────────────────────────────
function MemberMenu({
  menuRef,
  language,
  isMe,
  canEditRole,
  canRemove,
  canPickColor,
  memberColor,
  onMyPage,
  onChangeRole,
  onChangeJobRole,
  onRemove,
  onCalendarColor,
  onClose,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  language: string;
  isMe: boolean;
  canEditRole: boolean;
  canRemove: boolean;
  canPickColor: boolean;
  memberColor: string | null;
  onMyPage: () => void;
  onChangeRole: () => void;
  onChangeJobRole: () => void;
  onRemove: () => void;
  onCalendarColor: () => void;
  onClose: () => void;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const btn = menuRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.right - 200;
    if (left < 16) left = 16;
    if (top + 200 > window.innerHeight) top = rect.top - 200;
    setPos({ top, left });
  }, [menuRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const colorConfig = memberColor ? getMemberColorConfig(memberColor) : null;

  return (
    <div
      ref={popRef}
      className="fixed z-[9999] w-[200px] bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {isMe && (
        <button
          onClick={onMyPage}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Edit3 size={14} className="text-gray-400" />
          {language === "ko" ? "마이페이지" : "My Page"}
        </button>
      )}
      {canEditRole && !isMe && (
        <button
          onClick={onChangeRole}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <UserCog size={14} className="text-gray-400" />
          {language === "ko" ? "역할 변경" : "Change role"}
        </button>
      )}
      {canEditRole && !isMe && (
        <button
          onClick={onChangeJobRole}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Briefcase size={14} className="text-gray-400" />
          {language === "ko" ? "직무 역할" : "Job Role"}
        </button>
      )}
      {canRemove && !isMe && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={onRemove}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <UserMinus size={14} className="text-red-400" />
            {language === "ko" ? "멤버 제거" : "Remove member"}
          </button>
        </>
      )}
      {canPickColor && (
        <>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={onCalendarColor}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {memberColor ? (
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: memberColor }}
              />
            ) : (
              <Palette size={14} className="text-gray-400" />
            )}
            {language === "ko" ? "색상 변경" : "Change Color"}
            {memberColor && colorConfig && (
              <span
                className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: colorConfig.bg, color: colorConfig.text }}
              >
                {language === "ko" ? colorConfig.labelKo : colorConfig.label}
              </span>
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-xl p-3.5 text-center", bg)}>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-[11px] font-medium text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Task Row ───────────────────────────────────────────────────────
function TaskRow({
  task,
  language,
  onClick,
}: {
  task: Task;
  language: string;
  onClick: () => void;
}) {
  const title = language === "ko" ? task.titleKo || task.title : task.title;
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priorityCfg = PRIORITY_CONFIG[task.priority || "low"] || PRIORITY_CONFIG["low"];

  const formatDueDate = () => {
    if (!task.dueDate) return language === "ko" ? "미정" : "No date";
    const d = new Date(task.dueDate);
    if (isToday(d)) return language === "ko" ? "오늘" : "Today";
    if (isYesterday(d)) return language === "ko" ? "어제" : "Yesterday";
    return format(
      d,
      language === "ko" ? "M월 d일" : "MMM d",
      language === "ko" ? { locale: ko } : undefined
    );
  };

  const isOverdue =
    task.dueDate &&
    isBefore(startOfDay(new Date(task.dueDate)), startOfDay(new Date())) &&
    task.status !== "completed";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 bg-white rounded-xl border transition-all text-left group hover:shadow-md",
        statusCfg.border,
        "hover:border-blue-200"
      )}
    >
      <div className={cn("shrink-0", statusCfg.color)}>{statusCfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate transition-colors group-hover:text-blue-600",
            task.status === "completed"
              ? "text-gray-400 line-through"
              : "text-gray-900"
          )}
        >
          {title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {task.description}
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md",
          priorityCfg.color
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", priorityCfg.dot)} />
        {language === "ko" ? priorityCfg.labelKo : priorityCfg.label}
      </span>
      <span
        className={cn(
          "shrink-0 flex items-center gap-1 text-xs font-medium whitespace-nowrap",
          isOverdue ? "text-red-500" : "text-gray-400"
        )}
      >
        <Calendar size={12} />
        {formatDueDate()}
      </span>
    </button>
  );
}

// ─── Role Change Modal ──────────────────────────────────────────────
function RoleChangeModal({
  member,
  language,
  onClose,
}: {
  member: { id: string; name: string; avatar: string; role: string };
  language: string;
  onClose: () => void;
}) {
  const { changeMemberRole, getMemberRole } = usePermission();
  const currentMemberRole = getMemberRole(member.id) as Role;
  const [selectedRole, setSelectedRole] = useState<Role>(currentMemberRole);
  const [saved, setSaved] = useState(false);

  const ROLE_ICON_MAP: Record<Role, React.ReactNode> = {
    owner: <Crown size={14} style={{ color: ROLE_INFO[0].color }} />,
    admin: <Shield size={14} style={{ color: ROLE_INFO[1].color }} />,
    member: <Users size={14} style={{ color: ROLE_INFO[2].color }} />,
    viewer: <EyeIcon size={14} style={{ color: ROLE_INFO[3].color }} />,
  };

  const handleSave = () => {
    if (selectedRole !== currentMemberRole) {
      changeMemberRole(member.id, selectedRole);
    }
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <img
              src={member.avatar}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {language === "ko" ? "역할 변경" : "Change Role"}
              </h3>
              <p className="text-xs text-gray-500">{member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-2">
          {ROLE_INFO.map((ri) => {
            const isSelected = selectedRole === ri.role;
            const isCurrent = currentMemberRole === ri.role;
            // Owner role cannot be assigned (only transferred)
            const isDisabled = ri.role === "owner";

            return (
              <button
                key={ri.role}
                onClick={() => !isDisabled && setSelectedRole(ri.role)}
                disabled={isDisabled}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-blue-500 bg-blue-50/50"
                    : isDisabled
                    ? "border-gray-50 bg-gray-50/30 opacity-50 cursor-not-allowed"
                    : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: ri.bgColor }}
                >
                  {ROLE_ICON_MAP[ri.role]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {language === "ko" ? ri.labelKo : ri.labelEn}
                    </p>
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                        {language === "ko" ? "현재" : "Current"}
                      </span>
                    )}
                    {isDisabled && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-400 uppercase">
                        {language === "ko" ? "양도만 가능" : "Transfer only"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {language === "ko" ? ri.descKo : ri.descEn}
                  </p>
                </div>
                {isSelected && !isDisabled && (
                  <Check size={16} className="text-blue-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {language === "ko" ? "취소" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={saved || selectedRole === currentMemberRole}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl transition-colors shadow-sm",
              saved
                ? "bg-emerald-500 text-white"
                : selectedRole === currentMemberRole
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            )}
          >
            {saved
              ? language === "ko"
                ? "✓ 저장됨"
                : "✓ Saved"
              : language === "ko"
              ? "저장"
              : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Remove Member Modal ────────────────────────────────────────────
function RemoveMemberModal({
  member,
  language,
  onClose,
  onConfirm,
}: {
  member: { id: string; name: string; avatar: string };
  language: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText === member.name;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {language === "ko" ? "멤버 제거" : "Remove Member"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {language === "ko"
                ? "이 작업은 되돌릴 수 없습니다"
                : "This action cannot be undone"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-3 p-3 bg-red-50/60 rounded-xl border border-red-100 mb-4">
            <img
              src={member.avatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
            <p className="text-sm text-gray-700 leading-relaxed">
              {language === "ko" ? (
                <>
                  <strong>{member.name}</strong>님을 팀에서 제거하면 할당된
                  모든 업무가 미배정 상태로 변경됩니다.
                </>
              ) : (
                <>
                  Removing <strong>{member.name}</strong> will unassign all
                  their tasks.
                </>
              )}
            </p>
          </div>

          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {language === "ko" ? (
              <>
                확인하려면 <strong>{member.name}</strong>을(를) 입력하세요
              </>
            ) : (
              <>
                Type <strong>{member.name}</strong> to confirm
              </>
            )}
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={member.name}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all placeholder:text-gray-300"
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {language === "ko" ? "취소" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl transition-colors shadow-sm",
              canConfirm
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {language === "ko" ? "제거" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Color Change Modal ─────────────────────────────────────────────
function ColorChangeModal({
  member,
  language,
  onClose,
  onConfirm,
}: {
  member: { id: string; name: string; avatar: string };
  language: string;
  onClose: () => void;
  onConfirm: (c: string | null) => void;
}) {
  const { members } = usePermission();
  const initColor = getUserColor(member.id);
  const [selectedColor, setSelectedColor] = useState<string | null>(initColor);

  const handleSelect = (hex: string) => {
    const owner = getColorOwner(hex);
    if (owner && owner !== member.id) return; // locked
    setSelectedColor((prev) => (prev === hex ? null : hex));
  };

  const handleSave = () => {
    // Apply to global map
    setUserColor(member.id, selectedColor);
    onConfirm(selectedColor);
  };

  const colorCfg = selectedColor ? getMemberColorConfig(selectedColor) : null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[380px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={member.avatar}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
              {selectedColor && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: selectedColor }}
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {language === "ko" ? "캘린더 색상 변경" : "Change Calendar Color"}
              </h3>
              <p className="text-xs text-gray-500">{member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Color preview bar */}
        <div className="px-5">
          {selectedColor ? (
            <div
              className="h-2 rounded-full transition-all duration-200"
              style={{ background: `linear-gradient(90deg, ${selectedColor}20, ${selectedColor}80, ${selectedColor}20)` }}
            />
          ) : (
            <div className="h-2 rounded-full bg-gray-100" />
          )}
        </div>

        {/* Color grid */}
        <div className="px-5 py-5">
          <p className="text-xs font-medium text-gray-500 mb-3">
            {language === "ko"
              ? "캘린더에서 이 멤버의 업무에 표시될 색상을 선택하세요."
              : "Choose a color for this member's tasks on the calendar."}
          </p>
          <div className="grid grid-cols-5 gap-3">
            {MEMBER_COLORS.map((mc) => {
              const ownerOfColor = getColorOwner(mc.hex);
              const isTaken = ownerOfColor !== null && ownerOfColor !== member.id;
              const ownerMember = isTaken ? members.find((m) => m.id === ownerOfColor) : null;
              const specialOwner = isTaken ? getSpecialColorOwner(mc.hex) : null;
              const isSelected = selectedColor === mc.hex;

              const ownerDisplayName = ownerMember?.name
                ?? (language === "ko" ? specialOwner?.nameKo : specialOwner?.name)
                ?? "";

              return (
                <button
                  key={mc.id}
                  onClick={() => handleSelect(mc.hex)}
                  disabled={isTaken}
                  title={
                    isTaken
                      ? `${ownerDisplayName} ${language === "ko" ? "사용 중" : "in use"}`
                      : language === "ko" ? mc.labelKo : mc.label
                  }
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                    isTaken
                      ? "cursor-not-allowed"
                      : "hover:bg-gray-50 cursor-pointer",
                    isSelected && "bg-gray-50 ring-2 ring-blue-500/30 ring-offset-1"
                  )}
                >
                  {/* Color dot with owner badge */}
                  <div className="relative">
                    <span
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform",
                        isTaken ? "opacity-50" : "",
                        isSelected ? "scale-110 border-white shadow-md" : "border-black/5"
                      )}
                      style={{ backgroundColor: mc.hex }}
                    >
                      {isSelected && (
                        <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                      )}
                    </span>

                    {/* 팀원 소유: 아바타 뱃지 */}
                    {isTaken && ownerMember && (
                      <img
                        src={ownerMember.avatar}
                        alt={ownerMember.name}
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[1.5px] border-white object-cover shadow-sm"
                      />
                    )}

                    {/* 특수 소유자(긴급미션 등): 이모지 뱃지 */}
                    {isTaken && specialOwner && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[8px] shadow-sm leading-none">
                        {specialOwner.emoji}
                      </span>
                    )}
                  </div>

                  {/* 색상 이름 */}
                  <span className={cn(
                    "text-[9px] font-medium leading-tight text-center",
                    isTaken ? "text-gray-400" : "text-gray-500"
                  )}>
                    {language === "ko" ? mc.labelKo : mc.label}
                  </span>

                  {/* 소유자 이름 (잠금 상태일 때만) */}
                  {isTaken && (
                    <span
                      className="text-[8px] font-semibold leading-tight text-center w-full truncate"
                      style={{ color: mc.hex, opacity: 0.8 }}
                    >
                      {ownerDisplayName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current selection info */}
          {selectedColor && colorCfg && (
            <div className="mt-4 flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: `${selectedColor}10` }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor }} />
                <span className="text-xs font-medium" style={{ color: selectedColor }}>
                  {language === "ko" ? colorCfg.labelKo : colorCfg.label}
                </span>
              </div>
              <button
                onClick={() => setSelectedColor(null)}
                className="text-[10px] text-gray-400 hover:text-red-500 font-medium px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
              >
                {language === "ko" ? "초기화" : "Clear"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {language === "ko" ? "취소" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-sm"
          >
            {language === "ko" ? "저장" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Job Role Modal ──────────────────────────────────────────────────
function JobRoleModal({
  member,
  language,
  onClose,
  onSave,
}: {
  member: { id: string; name: string; avatar: string; jobRole?: JobRole };
  language: string;
  onClose: () => void;
  onSave: (role: JobRole | undefined) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<JobRole | undefined>(member.jobRole);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(selectedRole);
    setSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <img
              src={member.avatar}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {language === "ko" ? "직무 역할 설정" : "Set Job Role"}
              </h3>
              <p className="text-xs text-gray-500">{member.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            {JOB_ROLES.map((role) => {
              const cfg = JOB_ROLE_CONFIG[role];
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(isSelected ? undefined : role)}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <span className="text-lg">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {language === "ko" ? cfg.labelKo : cfg.label}
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-blue-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {language === "ko" ? "취소" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={saved || selectedRole === member.jobRole}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl transition-colors shadow-sm",
              saved
                ? "bg-emerald-500 text-white"
                : selectedRole === member.jobRole
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            )}
          >
            {saved
              ? language === "ko"
                ? "✓ 저장됨"
                : "✓ Saved"
              : language === "ko"
              ? "저장"
              : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}