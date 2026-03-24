import {
  Users,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Briefcase,
  Shield,
  ArrowRight,
  Palette,
  Check,
  Lock,
  AlertTriangle,
  X,
  Settings2,
  UserPlus,
  Clock,
  Loader2,
  LayoutGrid,
  LayoutList,
  Calendar as CalendarIcon,
  ChevronLeft,
  Pencil,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { User, Task, getUserColor, setUserColor, getColorOwner, getMemberColorConfig, MEMBER_COLORS, getAllAssigneeIds } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router";
import { getRoleInfo, type Role } from "../../lib/permissions";
import { usePermission } from "../context/PermissionContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { useTaskContext } from "../context/TaskContext";
import { InviteMemberDialog } from "../components/team/InviteMemberDialog";
import { useInvite } from "../context/InviteContext";
import { useTeam } from "../context/TeamContext";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDrag, useDrop } from "react-dnd";
import { format, isToday, isTomorrow, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useOrgPath } from "../hooks/useOrgPath";
import { api } from "../../lib/api";
import { supabase } from "../context/AuthContext";

const TEAM_TASK_DRAG = "TEAM_TASK_CARD";
const TEAM_COLUMN_DRAG = "TEAM_COLUMN";

interface TeamTaskDragItem {
  id: string;
  fromColumnId: string;
}

interface TeamColumnDragItem {
  memberId: string;
  index: number;
}

export function TeamPage() {
  const { t, language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const p = useOrgPath();
  const { members, currentUser } = usePermission();
  const { tasks, updateTask } = useTaskContext();
  const { org, isLoading: orgLoading, joinRequests, pendingCount, approveRequest, rejectRequest } = useInvite();
  const { removeMember } = useTeam();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<User | null>(null);
  const [memberView, setMemberView] = useState<"list" | "grid">(() => {
    try { return (localStorage.getItem('poten_team_member_view') as "list" | "grid") || "list"; } catch { return "list"; }
  });
  const toggleMemberView = (v: "list" | "grid") => { setMemberView(v); localStorage.setItem('poten_team_member_view', v); };
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, _setTeamTab] = useState<"members" | "tasks" | "attendance">(() => {
    try { return (localStorage.getItem('poten_team_tab') as "members" | "tasks" | "attendance") || "members"; } catch { return "members"; }
  });
  const setActiveTab = (v: "members" | "tasks" | "attendance") => { _setTeamTab(v); localStorage.setItem('poten_team_tab', v); };

  const pendingRequests = joinRequests.filter(r => r.status === 'pending');

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    await approveRequest(userId);
    setProcessingId(null);
  };

  const handleReject = async (userId: string) => {
    setProcessingId(userId);
    await rejectRequest(userId);
    setProcessingId(null);
  };

  // Compute real task counts per member
  const memberStats = useMemo(() => {
    const map: Record<string, { completed: number; inProgress: number; pending: number; total: number }> = {};
    for (const m of members) {
      const memberTasks = tasks.filter((t) => getAllAssigneeIds(t).includes(m.id));
      map[m.id] = {
        completed: memberTasks.filter((t) => t.status === "completed").length,
        inProgress: memberTasks.filter((t) => t.status === "in-progress").length,
        pending: memberTasks.filter((t) => t.status === "pending").length,
        total: memberTasks.length,
      };
    }
    return map;
  }, [members, tasks]);

  return (
    <div className="h-full flex flex-col">
      <header className="mb-6 md:mb-8 shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t("team")}</h1>
            <p className="text-gray-500 text-sm">{ko ? "팀 멤버를 관리하고 협업하세요" : "Manage your team and collaborate"}</p>
          </div>
          <div className="flex items-center gap-2">
            <PermissionGate permission="team.editRole">
              <button
                onClick={() => navigate(p("/team/permissions"))}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Shield size={15} />
                {ko ? "권한 관리" : "Permissions"}
              </button>
            </PermissionGate>
            <PermissionGate permission="team.invite">
              <button 
                onClick={() => setIsInviteDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
              >
                <Plus size={16} />
                {ko ? "멤버 초대" : "Invite Member"}
              </button>
            </PermissionGate>
          </div>
        </div>
      </header>

      {/* ── Tab Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 -mt-2 mb-4">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit shrink-0">
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
              activeTab === "members"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Users size={15} />
            {ko ? "멤버" : "Members"}
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
              activeTab === "tasks"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <LayoutGrid size={15} />
            {ko ? "업무 현황" : "Task Board"}
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
              activeTab === "attendance"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Clock size={15} />
            {ko ? "출근" : "Attendance"}
          </button>
        </div>
        {activeTab === "members" && (
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => toggleMemberView("list")} className={cn("p-1.5 rounded", memberView === "list" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")} title={ko ? "리스트" : "List"}>
              <LayoutList size={15} />
            </button>
            <button onClick={() => toggleMemberView("grid")} className={cn("p-1.5 rounded", memberView === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")} title={ko ? "카드" : "Grid"}>
              <LayoutGrid size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ── Pending Join Requests ────────────────────────────────── */}
      {activeTab === "members" && pendingRequests.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <UserPlus size={14} className="text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-amber-900">
              {ko ? `가입 요청 ${pendingRequests.length}건` : `${pendingRequests.length} Pending Request${pendingRequests.length > 1 ? 's' : ''}`}
            </h3>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.userId}
                className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-amber-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <Users size={16} className="text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {req.userName || req.userId}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(req.requestedAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })}
                      <span className="mx-1">·</span>
                      <span className="capitalize">{req.requestedRole}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(req.userId)}
                    disabled={processingId === req.userId}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {ko ? "거절" : "Reject"}
                  </button>
                  <button
                    onClick={() => handleApprove(req.userId)}
                    disabled={processingId === req.userId}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0079FF] hover:bg-[#006AE0] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {processingId === req.userId && <Loader2 size={12} className="animate-spin" />}
                    {ko ? "승인" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "members" ? (
        <>
          {memberView === "list" ? (
            /* ── List View ── */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 font-medium">
                    <th className="text-left px-4 py-2.5">{ko ? "이름" : "Name"}</th>
                    <th className="text-left px-4 py-2.5">{ko ? "이메일" : "Email"}</th>
                    <th className="text-left px-4 py-2.5">{ko ? "역할" : "Role"}</th>
                    <th className="text-center px-4 py-2.5">{ko ? "완료" : "Done"}</th>
                    <th className="text-center px-4 py-2.5">{ko ? "진행중" : "In Progress"}</th>
                    <th className="text-center px-4 py-2.5">{ko ? "대기" : "Pending"}</th>
                    <th className="text-right px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...members].sort((a, b) => a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0).map((member) => {
                    const stats = memberStats[member.id] || { completed: 0, inProgress: 0, pending: 0, total: 0 };
                    const roleInfo = getRoleInfo(member.role as Role);
                    return (
                      <tr
                        key={member.id}
                        onClick={() => navigate(p(`/team/${member.id}`))}
                        className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                            {member.profileImage ? (
                              <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-blue-400 to-indigo-500">
                                {member.name?.[0] || "?"}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {member.name}
                            {member.id === currentUser.id && <span className="text-xs text-gray-400 ml-1">({ko ? "나" : "Me"})</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", roleInfo.color, roleInfo.bg)}>
                            {ko ? roleInfo.labelKo : roleInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">{stats.completed}</td>
                        <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">{stats.inProgress}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500 font-medium">{stats.pending}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {member.id !== currentUser.id && member.role !== "owner" && (currentUser.role === "owner" || currentUser.role === "admin") && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setKickTarget(member); }}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100"
                                title={ko ? "내보내기" : "Remove"}
                              >
                                <X size={14} />
                              </button>
                            )}
                            <ArrowRight size={14} className="text-gray-400" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Invite row */}
              {org && (
                <button
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Plus size={14} />
                  </div>
                  {ko ? "새 멤버 초대하기" : "Invite New Member"}
                </button>
              )}
            </div>
          ) : (
            /* ── Grid View ── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...members].sort((a, b) => a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0).map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  stats={memberStats[member.id]}
                  onViewTasks={() => navigate(p(`/team/${member.id}`))}
                  currentUser={currentUser}
                  onKick={
                    member.id !== currentUser.id && member.role !== "owner" && (currentUser.role === "owner" || currentUser.role === "admin")
                      ? () => setKickTarget(member)
                      : undefined
                  }
                />
              ))}

              {/* Invite / Create Org Card */}
              {!org && !orgLoading ? (
                <div
                  onClick={() => navigate(p("/organization"))}
                  className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group h-full min-h-[280px]"
                >
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users size={32} className="text-blue-500" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {ko ? "조직을 먼저 생성하세요" : "Create an Organization First"}
                  </h3>
                  <p className="text-sm text-gray-500 text-center px-4">
                    {ko ? "내 조직 페이지에서 조직을 생성하세요." : "Go to My Organization page to create one."}
                  </p>
                </div>
              ) : org ? (
                <button
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group h-full min-h-[280px]"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={32} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {ko ? "새 멤버 초대하기" : "Invite New Member"}
                  </h3>
                  <p className="text-sm text-gray-500 text-center px-4">
                    {ko ? "초대 코드를 생성해 팀원을 초대하세요." : "Generate an invite code to add team members."}
                  </p>
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {activeTab === "attendance" && (
        <AttendanceTab members={members} ko={ko} />
      )}

      {activeTab === "tasks" && (
        <TeamTaskBoard
          members={members}
          currentUser={currentUser}
          tasks={tasks}
          updateTask={updateTask}
          ko={ko}
          navigate={navigate}
        />
      )}

      {/* ── Kick Confirmation Modal ── */}
      {kickTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setKickTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[calc(100vw-32px)] max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {ko ? "멤버 내보내기" : "Remove Member"}
                </h3>
                <p className="text-sm text-gray-500">
                  {ko ? `${kickTarget.name}님을 팀에서 내보내시겠습니까?` : `Remove ${kickTarget.name} from the team?`}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              {ko ? "내보내면 해당 멤버의 모든 업무 배정이 해제됩니다." : "This will unassign all tasks from this member."}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setKickTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                {ko ? "취소" : "Cancel"}
              </button>
              <button
                onClick={async () => {
                  await removeMember(kickTarget.id);
                  setKickTarget(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                {ko ? "내보내기" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />
    </div>
  );
}

// ─── Team Task Kanban Board ──────────────────────────────────────────
function TeamTaskBoard({
  members,
  currentUser,
  tasks,
  updateTask,
  ko,
  navigate,
}: {
  members: User[];
  currentUser: User;
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  ko: boolean;
  navigate: (path: string) => void;
}) {
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow" | "week">("all");

  // Column order: persisted in localStorage
  const [columnOrder, _setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('poten_team_board_order');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const setColumnOrder = (v: string[] | ((prev: string[]) => string[])) => {
    _setColumnOrder((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      localStorage.setItem('poten_team_board_order', JSON.stringify(next));
      return next;
    });
  };

  const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };
  const sortedMembers = useMemo(() => {
    const defaultSort = [...members].sort((a, b) => {
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
    });
    if (columnOrder.length === 0) return defaultSort;
    // Apply saved order, appending any new members not in saved order
    const ordered: User[] = [];
    for (const id of columnOrder) {
      const m = members.find((u) => u.id === id);
      if (m) ordered.push(m);
    }
    for (const m of defaultSort) {
      if (!ordered.some((o) => o.id === m.id)) ordered.push(m);
    }
    return ordered;
  }, [members, currentUser.id, columnOrder]);

  // Filter tasks by date
  const filteredTasks = useMemo(() => {
    if (dateFilter === "all") return tasks;
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      if (dateFilter === "today") return isToday(due);
      if (dateFilter === "tomorrow") return isTomorrow(due);
      if (dateFilter === "week") {
        const now = new Date();
        return isWithinInterval(due, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
      }
      return true;
    });
  }, [tasks, dateFilter]);

  // Group tasks by member
  const columns = useMemo(() => {
    const unassigned: Task[] = [];
    const byMember: Record<string, Task[]> = {};
    for (const m of sortedMembers) byMember[m.id] = [];

    for (const task of filteredTasks) {
      const ids = getAllAssigneeIds(task);
      if (ids.length === 0) {
        unassigned.push(task);
      } else {
        for (const id of ids) {
          if (byMember[id]) byMember[id].push(task);
        }
      }
    }
    return { byMember, unassigned };
  }, [filteredTasks, sortedMembers]);

  const handleDrop = useCallback(
    (taskId: string, targetMemberId: string | null) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (targetMemberId === null) {
        // Move to unassigned
        updateTask(taskId, { assigneeIds: [], assigneeId: undefined });
      } else {
        // Assign to target member
        const currentIds = getAllAssigneeIds(task);
        // Remove from all current, add to target
        const newIds = [targetMemberId];
        updateTask(taskId, { assigneeIds: newIds, assigneeId: targetMemberId });
      }
    },
    [tasks, updateTask]
  );

  const handleColumnMove = useCallback((dragIndex: number, hoverIndex: number) => {
    const ids = sortedMembers.map((m) => m.id);
    const [removed] = ids.splice(dragIndex, 1);
    ids.splice(hoverIndex, 0, removed);
    setColumnOrder(ids);
  }, [sortedMembers]);

  const dateFilterOptions: { key: typeof dateFilter; label: string; labelKo: string }[] = [
    { key: "all", label: "All", labelKo: "전체" },
    { key: "today", label: "Today", labelKo: "오늘" },
    { key: "tomorrow", label: "Tomorrow", labelKo: "내일" },
    { key: "week", label: "This Week", labelKo: "이번 주" },
  ];

  return (
    <div className="flex-1 min-h-0 w-0 min-w-full">
      {/* Date filter chips */}
      <div className="flex items-center gap-1.5 mb-3 px-1">
        {dateFilterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setDateFilter(opt.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              dateFilter === opt.key
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            )}
          >
            {ko ? opt.labelKo : opt.label}
          </button>
        ))}
        {dateFilter !== "all" && (
          <span className="text-[11px] text-gray-400 ml-2">
            {filteredTasks.length} {ko ? "개" : "tasks"}
          </span>
        )}
      </div>
      <div className="overflow-x-auto h-full pb-4">
        <div className="inline-flex gap-4 h-full items-start px-1 pr-4">
          {/* Unassigned column */}
          <TaskColumn
            columnId="__unassigned__"
            title={ko ? "미배정" : "Unassigned"}
            avatar={null}
            memberColor={null}
            tasks={columns.unassigned}
            onDrop={(taskId) => handleDrop(taskId, null)}
            ko={ko}
            navigate={navigate}
          />

          {/* Member columns (reorderable) */}
          {sortedMembers.map((member, index) => (
            <TaskColumn
              key={member.id}
              columnId={member.id}
              title={member.name}
              avatar={member.avatar}
              memberColor={getUserColor(member.id)}
              tasks={columns.byMember[member.id] || []}
              onDrop={(taskId) => handleDrop(taskId, member.id)}
              ko={ko}
              navigate={navigate}
              index={index}
              onColumnMove={handleColumnMove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Task Column ─────────────────────────────────────────────────────
function TaskColumn({
  columnId,
  title,
  avatar,
  memberColor,
  tasks: columnTasks,
  onDrop,
  ko,
  navigate,
  index,
  onColumnMove,
}: {
  columnId: string;
  title: string;
  avatar: string | null;
  memberColor: string | null;
  tasks: Task[];
  onDrop: (taskId: string) => void;
  ko: boolean;
  navigate: (path: string) => void;
  index?: number;
  onColumnMove?: (dragIndex: number, hoverIndex: number) => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);

  const [{ isOver }, taskDropRef] = useDrop({
    accept: TEAM_TASK_DRAG,
    drop: (item: TeamTaskDragItem) => {
      if (item.fromColumnId !== columnId) onDrop(item.id);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  const [{ isDragging: isColDragging }, colDragRef] = useDrag({
    type: TEAM_COLUMN_DRAG,
    item: () => ({ memberId: columnId, index: index ?? -1 }),
    canDrag: () => index !== undefined && onColumnMove !== undefined,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, colDropRef] = useDrop({
    accept: TEAM_COLUMN_DRAG,
    hover: (item: TeamColumnDragItem, monitor) => {
      if (index === undefined || !onColumnMove || !columnRef.current) return;
      const dragIdx = item.index;
      const hoverIdx = index;
      if (dragIdx === hoverIdx) return;

      const hoverRect = columnRef.current.getBoundingClientRect();
      const hoverMiddleX = (hoverRect.right - hoverRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientX = clientOffset.x - hoverRect.left;

      if (dragIdx < hoverIdx && hoverClientX < hoverMiddleX) return;
      if (dragIdx > hoverIdx && hoverClientX > hoverMiddleX) return;

      onColumnMove(dragIdx, hoverIdx);
      item.index = hoverIdx;
    },
  });

  // Combine refs: column drag + column drop + task drop
  const combinedRef = (node: HTMLDivElement | null) => {
    columnRef.current = node;
    taskDropRef(node);
    if (onColumnMove) {
      colDragRef(node);
      colDropRef(node);
    }
  };

  const statusGroups = useMemo(() => {
    const pending = columnTasks.filter((t) => t.status === "pending");
    const inProgress = columnTasks.filter((t) => t.status === "in-progress");
    const completed = columnTasks.filter((t) => t.status === "completed");
    return { pending, inProgress, completed };
  }, [columnTasks]);

  return (
    <div
      ref={combinedRef}
      className={cn(
        "w-[280px] shrink-0 bg-gray-50 rounded-2xl border transition-colors flex flex-col max-h-[calc(100vh-240px)]",
        isOver ? "border-blue-400 bg-blue-50/50" : "border-gray-200",
        isColDragging && "opacity-40",
        onColumnMove && "cursor-grab active:cursor-grabbing"
      )}
    >
      {/* Column header */}
      <div className="p-4 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          {avatar ? (
            <img src={avatar} alt={title} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users size={14} className="text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{title}</h3>
            <p className="text-[11px] text-gray-400">{columnTasks.length} {ko ? "개 업무" : "tasks"}</p>
          </div>
          {memberColor && (
            <span className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: memberColor }} />
          )}
        </div>
        {/* Mini stats bar */}
        {columnTasks.length > 0 && (
          <div className="flex gap-2 mt-2.5 text-[10px] font-medium">
            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              {statusGroups.pending.length} {ko ? "할일" : "todo"}
            </span>
            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {statusGroups.inProgress.length} {ko ? "진행" : "active"}
            </span>
            <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {statusGroups.completed.length} {ko ? "완료" : "done"}
            </span>
          </div>
        )}
      </div>

      {/* Task cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {columnTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Briefcase size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">{ko ? "업무 없음" : "No tasks"}</p>
          </div>
        ) : (
          columnTasks.map((task) => (
            <TaskKanbanCard
              key={task.id}
              task={task}
              columnId={columnId}
              ko={ko}
              navigate={navigate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Task Kanban Card ────────────────────────────────────────────────
function TaskKanbanCard({
  task,
  columnId,
  ko,
  navigate,
}: {
  task: Task;
  columnId: string;
  ko: boolean;
  navigate: (path: string) => void;
}) {
  const [{ isDragging }, dragRef] = useDrag({
    type: TEAM_TASK_DRAG,
    item: { id: task.id, fromColumnId: columnId } as TeamTaskDragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const statusColor: Record<string, string> = {
    pending: "bg-amber-400",
    "in-progress": "bg-blue-500",
    completed: "bg-emerald-500",
    routine: "bg-purple-500",
  };

  const priorityLabel: Record<string, { text: string; color: string }> = {
    high: { text: ko ? "높음" : "High", color: "text-red-600 bg-red-50" },
    delayed: { text: ko ? "지연" : "Delayed", color: "text-orange-600 bg-orange-50" },
    medium: { text: ko ? "보통" : "Med", color: "text-green-600 bg-green-50" },
    low: { text: ko ? "낮음" : "Low", color: "text-gray-500 bg-gray-100" },
  };

  return (
    <div
      ref={dragRef as any}
      onClick={() => navigate(p(`/tasks/${task.id}`))}
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200 transition-all group",
        isDragging && "opacity-40 shadow-lg"
      )}
    >
      {/* Status dot + title */}
      <div className="flex items-start gap-2">
        <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", statusColor[task.status] || "bg-gray-300")} />
        <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{task.titleKo || task.title}</p>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.priority && priorityLabel[task.priority] && (
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", priorityLabel[task.priority].color)}>
            {priorityLabel[task.priority].text}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <CalendarIcon size={9} />
            {format(new Date(task.dueDate), "M/d")}
          </span>
        )}
        {task.category && (
          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded truncate max-w-[80px]">
            {task.category}
          </span>
        )}
      </div>
    </div>
  );
}

function TeamMemberCard({
  member,
  stats,
  onViewTasks,
  currentUser,
  onKick,
}: {
  member: User;
  stats: { completed: number; inProgress: number; pending: number; total: number };
  onViewTasks: () => void;
  currentUser: User;
  onKick?: () => void;
}) {
  const { language } = useLanguage();
  const [memberColor, setMemberColorState] = useState<string | null>(() => getUserColor(member.id));
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showOwnerWarning, setShowOwnerWarning] = useState(false);
  const [pendingHex, setPendingHex] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const colorConfig = memberColor ? getMemberColorConfig(memberColor) : null;
  const isMe = member.id === currentUser.id;
  const isOwner = currentUser.role === "owner";
  const canPickColor = isMe || isOwner;

  // Close popover on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showColorPicker]);

  const applyColor = (hex: string) => {
    if (memberColor === hex) {
      setUserColor(member.id, null);
      setMemberColorState(null);
    } else {
      setUserColor(member.id, hex);
      setMemberColorState(hex);
    }
    setShowColorPicker(false);
  };

  const handleSelectColor = (hex: string) => {
    if (!canPickColor) return;
    const owner = getColorOwner(hex);
    if (owner && owner !== member.id) return;
    if (!isMe && isOwner && !_ownerWarningShownTeam) {
      setPendingHex(hex);
      setShowOwnerWarning(true);
      return;
    }
    applyColor(hex);
  };

  const confirmWarning = () => {
    _ownerWarningShownTeam = true;
    setShowOwnerWarning(false);
    if (pendingHex) {
      applyColor(pendingHex);
      setPendingHex(null);
    }
  };
  const cancelWarning = () => {
    setShowOwnerWarning(false);
    setPendingHex(null);
  };

  return (
    <div
      onClick={onViewTasks}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col items-center relative group cursor-pointer hover:border-blue-200"
    >
      {/* Kick button */}
      {onKick && (
        <button
          onClick={(e) => { e.stopPropagation(); onKick(); }}
          className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
          title={language === "ko" ? "내보내기" : "Remove"}
        >
          <X size={16} />
        </button>
      )}
      {/* Avatar with color ring */}
      <div className="relative mb-4">
        <div
          className={cn(
            "w-[104px] h-[104px] rounded-full flex items-center justify-center transition-colors",
            memberColor ? "" : "bg-gray-50"
          )}
          style={memberColor ? { background: `linear-gradient(135deg, ${memberColor}30, ${memberColor}60)` } : undefined}
        >
          <img 
            src={member.avatar} 
            alt={member.name} 
            className="w-24 h-24 rounded-full object-cover border-[3px] border-white shadow-sm"
          />
        </div>
        <div
          className="absolute bottom-1 right-1 w-5 h-5 border-2 border-white rounded-full transition-colors"
          style={{ backgroundColor: memberColor || "#d1d5db" }}
        />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
        {member.name}
        {isMe && <span className="text-sm font-medium text-gray-400">({language === 'ko' ? '나' : 'Me'})</span>}
        {memberColor && (
          <span
            className="w-3 h-3 rounded-full shrink-0 border border-white shadow-sm"
            style={{ backgroundColor: memberColor }}
            title={language === 'ko' ? '캘린더 색상' : 'Calendar color'}
          />
        )}
      </h3>
      <div className="flex items-center gap-1.5 mb-4">
        {(() => {
          const ri = getRoleInfo(member.role as Role);
          return (
            <span
              className="text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1 border"
              style={{ backgroundColor: ri.bgColor, color: ri.color, borderColor: `${ri.color}20` }}
            >
              <span className="text-[10px]">{ri.icon}</span>
              {ri.labelEn}
            </span>
          );
        })()}
      </div>

      <div className="w-full space-y-3 mb-5">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Mail size={16} className="text-gray-400" />
          {member.email ? (
            <span className="truncate">{member.email}</span>
          ) : (
            <span className="truncate text-gray-400 italic">{language === 'ko' ? '이메일 미설정' : 'No email set'}</span>
          )}
        </div>
        {member.jobTitle && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Briefcase size={16} className="text-gray-400" />
            <span>{member.jobTitle}</span>
          </div>
        )}
      </div>

      {/* ── Calendar Color (clickable to edit) ── */}
      <div className="w-full border-t border-gray-100 pt-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Palette size={11} />
            {language === "ko" ? "캘린더 색상" : "Calendar Color"}
          </span>
          <div className="relative flex items-center gap-2">
            <button
              ref={triggerRef}
              onClick={(e) => {
                e.stopPropagation();
                if (canPickColor) setShowColorPicker((v) => !v);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors",
                canPickColor ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"
              )}
              title={canPickColor ? (language === "ko" ? "색상 변경" : "Change color") : undefined}
            >
              {memberColor && colorConfig ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border border-black/5 shrink-0"
                    style={{ backgroundColor: memberColor }}
                  />
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: colorConfig.bg, color: colorConfig.text }}
                  >
                    {language === "ko" ? colorConfig.labelKo : colorConfig.label}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 shrink-0" />
                  {language === "ko" ? "색상 선택" : "Set color"}
                </span>
              )}
            </button>

            {/* Color Picker Popover */}
            {showColorPicker &&
              createPortal(
                <ColorPickerPopover
                  ref={colorPickerRef}
                  triggerRef={triggerRef}
                  memberId={member.id}
                  memberColor={memberColor}
                  language={language}
                  onSelect={handleSelectColor}
                  onClear={() => {
                    setUserColor(member.id, null);
                    setMemberColorState(null);
                    setShowColorPicker(false);
                  }}
                  onClose={() => setShowColorPicker(false)}
                />,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="w-full border-t border-gray-100 pt-4 mt-auto">
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{language === 'ko' ? "할 일" : "To Do"}</p>
            <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
          </div>
          <div className="border-l border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{language === 'ko' ? "진행 중" : "In Progress"}</p>
            <p className="text-lg font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="border-l border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{language === 'ko' ? "완료" : "Done"}</p>
            <p className="text-lg font-bold text-emerald-600">{stats.completed}</p>
          </div>
          <div className="border-l border-gray-100">
            <p className="text-xs text-gray-500 mb-1">{language === 'ko' ? "전체" : "Total"}</p>
            <p className="text-lg font-bold text-gray-700">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>{language === 'ko' ? "업무 보기" : "View Tasks"}</span>
          <ArrowRight size={12} />
        </div>
      </div>

      {/* Owner Warning Modal */}
      {showOwnerWarning &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); cancelWarning(); }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-[380px] max-w-[90vw] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {language === "ko" ? "멤버 색상 변경" : "Change Member Color"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === "ko" ? "Owner 권한으로 변경합니다" : "Changing as Owner"}
                  </p>
                </div>
                <button
                  onClick={cancelWarning}
                  className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-3">
                <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {language === "ko" ? (
                        <>
                          <strong>{member.name}</strong>님의 색상을 변경하려고 합니다. 멤버 본인이 직접 변경하는 것을 권장하며, 이 경고는 한 번만 표시됩니다.
                        </>
                      ) : (
                        <>
                          You're about to change <strong>{member.name}</strong>'s color. It's recommended to let members choose their own. This warning will only appear once.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={cancelWarning}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {language === "ko" ? "취소" : "Cancel"}
                </button>
                <button
                  onClick={confirmWarning}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-sm"
                >
                  {language === "ko" ? "변경하기" : "Continue"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

let _ownerWarningShownTeam = false;

// ─── Color Picker Popover (portal) ──────────────────────────────────
const ColorPickerPopover = ({
  ref,
  triggerRef,
  memberId,
  memberColor,
  language,
  onSelect,
  onClear,
  onClose,
}: {
  ref: React.Ref<HTMLDivElement>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  memberId: string;
  memberColor: string | null;
  language: string;
  onSelect: (hex: string) => void;
  onClear: () => void;
  onClose: () => void;
}) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const { members } = usePermission();

  useEffect(() => {
    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - 240),
      });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [triggerRef]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-[240px] bg-white rounded-xl border border-gray-200 shadow-xl p-3 animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
          <Palette size={11} />
          {language === "ko" ? "캘린더 색상" : "Calendar Color"}
        </span>
        <div className="flex items-center gap-1">
          {memberColor && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-[10px] text-gray-400 hover:text-red-500 transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              {language === "ko" ? "초기화" : "Clear"}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Color preview bar */}
      {memberColor && (
        <div
          className="h-1.5 rounded-full mb-2.5 transition-colors"
          style={{ background: `linear-gradient(90deg, ${memberColor}20, ${memberColor}70, ${memberColor}20)` }}
        />
      )}

      {/* Color dots */}
      <div className="flex items-center gap-2 flex-wrap">
        {MEMBER_COLORS.map((mc) => {
          const ownerOfColor = getColorOwner(mc.hex);
          const isTaken = ownerOfColor !== null && ownerOfColor !== memberId;
          const ownerMember = isTaken ? members.find((m) => m.id === ownerOfColor) : null;
          const isSelected = memberColor === mc.hex;

          return (
            <button
              key={mc.id}
              onClick={(e) => { e.stopPropagation(); onSelect(mc.hex); }}
              disabled={isTaken}
              title={
                isTaken
                  ? `${ownerMember?.name ?? ""} ${language === "ko" ? "사용 중" : "in use"}`
                  : language === "ko" ? mc.labelKo : mc.label
              }
              className={cn(
                "relative w-6 h-6 rounded-full flex items-center justify-center transition-all",
                isTaken ? "opacity-25 cursor-not-allowed" : "hover:scale-125 cursor-pointer",
                isSelected && "ring-2 ring-offset-1 scale-110"
              )}
              style={isSelected ? { outlineColor: mc.hex } : undefined}
            >
              <span
                className="w-full h-full rounded-full border border-black/5"
                style={{ backgroundColor: mc.hex }}
              />
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check size={11} className="text-white drop-shadow-sm" strokeWidth={3} />
                </span>
              )}
              {isTaken && (
                <span className="absolute -bottom-0.5 -right-0.5">
                  <Lock size={7} className="text-gray-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">
        {language === "ko"
          ? "캘린더에서 이 멤버의 업무가 선택한 색상으로 표시됩니다."
          : "Tasks appear with this color on the calendar."}
      </p>
    </div>
  );
};

// ─── Attendance Tab ──────────────────────────────────────────────
function AttendanceTab({ members, ko }: { members: User[]; ko: boolean }) {
  const { tasks } = useTaskContext();
  const [myRecord, setMyRecord] = useState<any>(null);
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null);
  const [lastResumeTime, setLastResumeTime] = useState<string | null>(null); // last time work resumed
  const [totalBreakMs, setTotalBreakMs] = useState(0); // accumulated break time in ms
  const [elapsed, setElapsed] = useState(0); // force re-render every minute
  const [monthRecords, setMonthRecords] = useState<any[]>([]);
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() + 1 }; });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stampConfigs, setStampConfigs] = useState<Record<string, any>>({});
  const [showStampEditor, setShowStampEditor] = useState(false);
  const [myStamp, setMyStamp] = useState<any>({ text: '', color: '#3B82F6', emoji: '', shape: 'rounded' });

  const STAMP_PRESETS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1', '#F43F5E',
  ];
  const SHAPE_OPTIONS = [
    { value: 'rounded', label: ko ? '네모' : 'Square' },
    { value: 'circle', label: ko ? '동그라미' : 'Circle' },
  ];

  // Load month data + stamp configs
  const loadMonth = useCallback(async (preserveMyRecord?: boolean) => {
    setLoading(true);
    try {
      const [data, stamps] = await Promise.all([
        api.getAttendanceMonth(calMonth.year, calMonth.month),
        api.getOrgStampConfigs(),
      ]);
      setMonthRecords(data);
      setStampConfigs(stamps);
      if (!preserveMyRecord) {
        const uid = (await supabase.auth.getUser()).data.user?.id;
        const today = new Date().toISOString().split('T')[0];
        const found = data.find((r: any) => r.userId === uid && (r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).slice(0, 10)) === today);
        setMyRecord(found || null);
        // Calculate total break time from logs
        if (found) {
          try {
            const logs = await api.getAttendanceLogs(found.id);
            let breakMs = 0;
            let lastBreakStart: number | null = null;
            for (const log of logs) {
              if (log.type === 'break_start') lastBreakStart = new Date(log.timestamp).getTime();
              else if (log.type === 'break_end' && lastBreakStart) {
                breakMs += new Date(log.timestamp).getTime() - lastBreakStart;
                lastBreakStart = null;
              }
            }
            setTotalBreakMs(breakMs);
            if (found.currentStatus === 'break' && lastBreakStart) {
              setBreakStartTime(new Date(lastBreakStart).toISOString());
              setLastResumeTime(null);
            } else {
              setBreakStartTime(null);
              // Find last break_end or check_in as resume time
              const lastEnd = [...logs].reverse().find(l => l.type === 'break_end');
              setLastResumeTime(lastEnd ? lastEnd.timestamp : (found.checkIn || null));
            }
          } catch {}
        }
      }
    } catch (err) { console.error("Attendance load error:", err); }
    setLoading(false);
  }, [calMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // Tick every 30s for live elapsed time
  useEffect(() => {
    if (!myRecord?.checkIn || myRecord?.checkOut) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 30000);
    return () => clearInterval(timer);
  }, [myRecord?.checkIn, myRecord?.checkOut]);

  // Load my stamp config
  useEffect(() => {
    api.getStampConfig().then(c => { if (c && Object.keys(c).length) setMyStamp(c); });
  }, []);

  const notifyAttendance = () => window.dispatchEvent(new CustomEvent('attendance-changed'));

  const handleCheckIn = async () => {
    try {
      if (currentStatus === 'break' && myRecord) {
        const r = await api.endBreak();
        r.currentStatus = 'working';
        if (breakStartTime) {
          setTotalBreakMs(prev => prev + (Date.now() - new Date(breakStartTime).getTime()));
        }
        setBreakStartTime(null);
        setLastResumeTime(new Date().toISOString());
        setMyRecord({ ...r });
        notifyAttendance();
        return;
      }
      const r = await api.checkIn();
      r.checkOut = null;
      r.currentStatus = 'working';
      setBreakStartTime(null);
      setLastResumeTime(new Date().toISOString());
      setTotalBreakMs(0);
      setMyRecord({ ...r });
      api.getAttendanceMonth(calMonth.year, calMonth.month).then(data => setMonthRecords(data)).catch(() => {});
      notifyAttendance();
    } catch (err) { console.error(err); }
  };
  const handleCheckOut = async () => {
    try {
      const r = await api.checkOut();
      r.currentStatus = 'off';
      setMyRecord({ ...r });
      api.getAttendanceMonth(calMonth.year, calMonth.month).then(data => setMonthRecords(data)).catch(() => {});
      notifyAttendance();
    } catch (err) { console.error(err); }
  };
  const handleBreakStart = async () => {
    try {
      const r = await api.startBreak();
      r.currentStatus = 'break';
      setBreakStartTime(new Date().toISOString());
      setLastResumeTime(null);
      setMyRecord({ ...r });
      notifyAttendance();
    } catch (err) { console.error(err); }
  };
  const handleBreakEnd = async () => {
    try {
      const r = await api.endBreak();
      r.currentStatus = 'working';
      if (breakStartTime) {
        setTotalBreakMs(prev => prev + (Date.now() - new Date(breakStartTime).getTime()));
      }
      setBreakStartTime(null);
      setLastResumeTime(new Date().toISOString());
      setMyRecord({ ...r });
      notifyAttendance();
    } catch (err) { console.error(err); }
  };
  const saveStamp = async () => {
    await api.saveStampConfig(myStamp);
    setShowStampEditor(false);
    loadMonth();
  };

  // Load logs when day is selected
  const loadDayLogs = async (dateStr: string) => {
    const recs = byDate[dateStr] || [];
    const allLogs: any[] = [];
    for (const r of recs) {
      try { const logs = await api.getAttendanceLogs(r.id); allLogs.push(...logs); } catch {}
    }
    allLogs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setSelectedLogs(allLogs);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isCurrentMonth = calMonth.year === new Date().getFullYear() && calMonth.month === new Date().getMonth() + 1;
  const checkedIn = !!myRecord?.checkIn;
  const checkedOut = !!(myRecord?.checkOut && myRecord.checkOut !== null);
  const currentStatus = myRecord?.currentStatus || 'off';

  const formatTime = (iso: string | null | Date) => {
    if (!iso) return "-";
    const d = iso instanceof Date ? iso : new Date(iso);
    return d.toLocaleTimeString(ko ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };
  const getWorkHours = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return 0;
    const end = checkOut ? new Date(checkOut) : new Date();
    return (end.getTime() - new Date(checkIn).getTime()) / 3600000;
  };
  const formatDuration = (h: number) => {
    if (h <= 0) return "-";
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${hours}${ko ? "시간" : "h"}${mins > 0 ? ` ${mins}${ko ? "분" : "m"}` : ""}`;
  };
  const getMemberName = (userId: string) => {
    const m = members.find(m => m.id === userId);
    return m?.name || m?.email || userId.slice(0, 8);
  };
  const getStampDisplay = (userId: string) => {
    const cfg = stampConfigs[userId];
    if (cfg?.emoji) return { text: cfg.emoji, color: cfg.color || '#3B82F6', shape: cfg.shape || 'rounded' };
    if (cfg?.text) return { text: cfg.text, color: cfg.color || '#3B82F6', shape: cfg.shape || 'rounded' };
    const name = getMemberName(userId);
    const text = name.length >= 3 ? name.slice(1, 3) : name;
    const fallbackColors = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6', '#EC4899', '#14B8A6'];
    return { text, color: fallbackColors[userId.charCodeAt(0) % fallbackColors.length], shape: 'rounded' };
  };

  const LOG_TYPE_LABELS: Record<string, { ko: string; en: string; icon: string }> = {
    check_in: { ko: '출근', en: 'Check In', icon: '🟢' },
    check_out: { ko: '퇴근', en: 'Check Out', icon: '🔴' },
    break_start: { ko: '휴식 시작', en: 'Break Start', icon: '☕' },
    break_end: { ko: '휴식 끝', en: 'Break End', icon: '💪' },
  };

  // Calendar grid
  const firstDay = new Date(calMonth.year, calMonth.month - 1, 1).getDay();
  const daysInMonth = new Date(calMonth.year, calMonth.month, 0).getDate();
  const dayHeaders = ko ? ["일", "월", "화", "수", "목", "금", "토"] : ["S", "M", "T", "W", "T", "F", "S"];
  const prevMonth = () => setCalMonth(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setCalMonth(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 });

  const byDate: Record<string, any[]> = {};
  monthRecords.forEach(r => { const d = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).slice(0, 10); if (!byDate[d]) byDate[d] = []; byDate[d].push(r); });

  const dayRecords = selectedDay ? (byDate[selectedDay] || []) : [];
  const dayTasks = selectedDay ? tasks.filter((t: any) => {
    if (!t.updatedAt) return false;
    const u = new Date(t.updatedAt).toISOString().split('T')[0];
    return u === selectedDay && t.status === "completed";
  }) : [];

  const STATUS_BADGES: Record<string, { ko: string; en: string; class: string }> = {
    working: { ko: '근무중', en: 'Working', class: 'bg-green-100 text-green-700' },
    break: { ko: '휴식중', en: 'On Break', class: 'bg-amber-100 text-amber-700' },
    off: { ko: '퇴근', en: 'Off', class: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div className="space-y-6">
      {/* My check-in card */}
      {isCurrentMonth && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowStampEditor(true)}
                className={cn("w-12 h-12 flex items-center justify-center text-white font-black text-sm shadow-md hover:scale-110 transition-transform",
                  myStamp.shape === 'circle' ? 'rounded-full' : 'rounded-lg')}
                style={{ backgroundColor: myStamp.color }}
                title={ko ? "도장 수정" : "Edit stamp"}>
                {myStamp.emoji || myStamp.text || '?'}
              </button>
              <div>
                <p className="text-xs text-gray-500">{new Date().toLocaleDateString(ko ? "ko-KR" : "en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                {checkedIn && (() => {
                  void elapsed;
                  const statusLabel = ko ? STATUS_BADGES[currentStatus]?.ko : STATUS_BADGES[currentStatus]?.en;
                  // Current session display: break shows break elapsed, working shows work elapsed
                  const currentBreakMs = (currentStatus === 'break' && breakStartTime) ? (Date.now() - new Date(breakStartTime).getTime()) : 0;
                  const currentMins = currentStatus === 'break' ? Math.floor(currentBreakMs / 60000) : 0;
                  const currentH = Math.floor(currentMins / 60);
                  const currentM = currentMins % 60;
                  return (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_BADGES[currentStatus]?.class || STATUS_BADGES.off.class)}>
                        {statusLabel}
                      </span>
                      {currentStatus === 'break' && (
                        <span className="text-sm font-bold text-amber-600">{currentH > 0 ? `${currentH}${ko ? "시간 " : "h "}` : ""}{currentM}{ko ? "분" : "m"}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            {checkedIn && (() => {
              void elapsed;
              const totalElapsedMs = myRecord?.checkIn ? (myRecord?.checkOut ? new Date(myRecord.checkOut).getTime() : Date.now()) - new Date(myRecord.checkIn).getTime() : 0;
              const currentBreakMs = (currentStatus === 'break' && breakStartTime) ? (Date.now() - new Date(breakStartTime).getTime()) : 0;
              const actualWorkMs = totalElapsedMs - totalBreakMs - currentBreakMs;
              const workMins = Math.max(0, Math.floor(actualWorkMs / 60000));
              const workH = Math.floor(workMins / 60);
              const workM = workMins % 60;
              // Current session: break = break elapsed, working = time since last resume
              const sessionMs = currentStatus === 'break'
                ? currentBreakMs
                : lastResumeTime ? (Date.now() - new Date(lastResumeTime).getTime()) : actualWorkMs;
              const sesMins = Math.max(0, Math.floor(sessionMs / 60000));
              const sesH = Math.floor(sesMins / 60);
              const sesM = sesMins % 60;
              const breakTotalMs = totalBreakMs + currentBreakMs;
              const breakMins = Math.max(0, Math.floor(breakTotalMs / 60000));
              const breakH = Math.floor(breakMins / 60);
              const breakM = breakMins % 60;
              return (
                <div className="text-right space-y-3">
                  <div>
                    <p className="text-[10px] text-amber-400">{ko ? "총 휴식시간" : "Total Break"}</p>
                    <p className="text-xl font-black text-amber-500">{breakH}{ko ? "시간 " : "h "}{String(breakM).padStart(2, '0')}{ko ? "분" : "m"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{ko ? "총 근무시간" : "Total Work"}</p>
                    <p className="text-xl font-black text-gray-900">{workH}{ko ? "시간 " : "h "}{String(workM).padStart(2, '0')}{ko ? "분" : "m"}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Action buttons + status */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {/* 출근 */}
              <button
                onClick={() => { if (!checkedIn || checkedOut || currentStatus === 'break') handleCheckIn(); }}
                disabled={currentStatus === 'working'}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-1.5",
                  currentStatus === 'working' ? "bg-blue-600 text-white cursor-default" :
                  currentStatus === 'break' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer" :
                  (!checkedIn || checkedOut) ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer" :
                  "bg-gray-100 text-gray-400 cursor-default"
                )}>
                🟢 {ko ? "출근" : "In"}
              </button>
              {/* 휴식 */}
              <button
                onClick={() => {
                  if (currentStatus === 'working') handleBreakStart();
                  else if (currentStatus === 'break') handleBreakEnd();
                }}
                disabled={!checkedIn || checkedOut}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-1.5",
                  currentStatus === 'break' ? "bg-amber-500 text-white cursor-pointer" :
                  currentStatus === 'working' ? "bg-amber-50 text-amber-700 hover:bg-amber-100 cursor-pointer" :
                  "bg-gray-100 text-gray-400 cursor-default"
                )}>
                ☕ {ko ? "휴식" : "Break"}
              </button>
              {/* 퇴근 */}
              <button
                onClick={() => { if (checkedIn && !checkedOut) handleCheckOut(); }}
                disabled={!checkedIn || checkedOut}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-1.5",
                  checkedOut ? "bg-gray-200 text-gray-500 cursor-default" :
                  (checkedIn && !checkedOut) ? "bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer" :
                  "bg-gray-100 text-gray-400 cursor-default"
                )}>
                🔴 {ko ? "퇴근" : "Out"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Stamp Editor Modal */}
      {showStampEditor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowStampEditor(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">{ko ? "내 도장 만들기" : "Create My Stamp"}</h3>

            {/* Preview */}
            <div className="flex justify-center">
              <div className={cn("w-20 h-20 flex items-center justify-center text-white font-black text-2xl shadow-lg",
                myStamp.shape === 'circle' ? 'rounded-full' : 'rounded-xl')}
                style={{ backgroundColor: myStamp.color }}>
                {myStamp.emoji || myStamp.text || '?'}
              </div>
            </div>

            {/* Text */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "도장 텍스트 (2자)" : "Stamp Text (2 chars)"}</label>
              <input type="text" maxLength={2} value={myStamp.text}
                onChange={e => setMyStamp((s: any) => ({ ...s, text: e.target.value, emoji: '' }))}
                placeholder={ko ? "예: 대현" : "e.g. DH"}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>

            {/* Emoji */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "또는 이모지" : "Or Emoji"}</label>
              <div className="flex gap-2 flex-wrap">
                {['😎', '🔥', '⚡', '🌟', '💎', '🎯', '🚀', '🐱', '🦊', '🐻'].map(e => (
                  <button key={e} onClick={() => setMyStamp((s: any) => ({ ...s, emoji: e, text: '' }))}
                    className={cn("w-9 h-9 rounded-lg text-lg flex items-center justify-center hover:bg-gray-100",
                      myStamp.emoji === e && "ring-2 ring-blue-500 bg-blue-50")}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "색상" : "Color"}</label>
              <div className="flex gap-2 flex-wrap">
                {STAMP_PRESETS.map(c => (
                  <button key={c} onClick={() => setMyStamp((s: any) => ({ ...s, color: c }))}
                    className={cn("w-8 h-8 rounded-full", myStamp.color === c && "ring-2 ring-offset-2 ring-gray-900")}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>

            {/* Shape */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{ko ? "모양" : "Shape"}</label>
              <div className="flex gap-2">
                {SHAPE_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setMyStamp((st: any) => ({ ...st, shape: s.value }))}
                    className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border",
                      myStamp.shape === s.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowStampEditor(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium">{ko ? "취소" : "Cancel"}</button>
              <button onClick={saveStamp} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">{ko ? "저장" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ChevronLeft size={18} /></button>
          <h3 className="text-sm font-bold text-gray-900">
            {calMonth.year}{ko ? "년 " : "/"}{calMonth.month}{ko ? "월" : ""}
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowStampEditor(true)}
              className="px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors inline-flex items-center gap-1">
              <Pencil size={12} /> {ko ? "도장" : "Stamp"}
            </button>
            <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayHeaders.map((d, i) => (
            <div key={i} className={cn("text-center text-[10px] font-semibold py-1", i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400")}>{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">{ko ? "로딩 중..." : "Loading..."}</div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="h-28" />)}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calMonth.year}-${String(calMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayRecs = byDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              const totalHours = dayRecs.reduce((s: number, r: any) => s + getWorkHours(r.checkIn, r.checkOut), 0);
              const dayOfWeek = new Date(calMonth.year, calMonth.month - 1, day).getDay();

              return (
                <button key={day} onClick={() => { const d = isSelected ? null : dateStr; setSelectedDay(d); if (d) loadDayLogs(d); else setSelectedLogs([]); }}
                  className={cn("h-28 rounded-xl text-left p-1.5 transition-all relative flex flex-col",
                    isSelected ? "bg-blue-50 ring-2 ring-blue-400" : isToday ? "bg-blue-50/50" : "hover:bg-gray-50",
                    dayOfWeek === 0 && "text-red-500", dayOfWeek === 6 && "text-blue-500")}>
                  <span className={cn("text-xs font-medium mb-1", isToday && "bg-blue-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center")}>
                    {day}
                  </span>
                  {dayRecs.length > 0 && (
                    <div className="flex-1 flex flex-col justify-end gap-0.5">
                      <div className="flex flex-wrap gap-0.5">
                        {dayRecs.slice(0, 4).map((r: any, idx: number) => {
                          const s = getStampDisplay(r.userId);
                          return (
                            <div key={idx} className={cn("w-7 h-7 flex items-center justify-center text-[9px] font-black text-white shadow-sm",
                              s.shape === 'circle' ? 'rounded-full' : 'rounded-md')}
                              style={{ backgroundColor: s.color, opacity: r.checkOut ? 0.9 : 0.5 }}
                              title={`${getMemberName(r.userId)} ${r.checkOut ? (ko ? "퇴근" : "Done") : (ko ? "근무중" : "Working")}`}>
                              {s.text}
                            </div>
                          );
                        })}
                      </div>
                      {totalHours > 0 && (
                        <p className="text-[8px] text-gray-400 leading-none">{Math.round(totalHours)}h</p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            {new Date(selectedDay + 'T00:00:00').toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "long", day: "numeric", weekday: "long" })}
          </h3>

          {dayRecords.length === 0 ? (
            <p className="text-sm text-gray-400">{ko ? "출근 기록 없음" : "No attendance records"}</p>
          ) : (
            <div className="space-y-3 mb-4">
              {dayRecords.map((r: any) => {
                const s = getStampDisplay(r.userId);
                const recLogs = selectedLogs.filter(l => l.attendanceId === r.id);
                return (
                  <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-7 h-7 flex items-center justify-center text-[9px] font-black text-white",
                          s.shape === 'circle' ? 'rounded-full' : 'rounded-md')}
                          style={{ backgroundColor: s.color }}>
                          {s.text}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{getMemberName(r.userId)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatTime(r.checkIn)} ~ {formatTime(r.checkOut)}</span>
                        <span className="font-medium text-gray-700">{formatDuration(getWorkHours(r.checkIn, r.checkOut))}</span>
                      </div>
                    </div>
                    {/* Activity logs timeline - collapsible */}
                    {recLogs.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-[11px] text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                          {ko ? `활동 로그 (${recLogs.length}건)` : `Activity Log (${recLogs.length})`}
                        </summary>
                        <div className="ml-3 pl-3 border-l-2 border-gray-200 space-y-1.5 mt-2">
                          {recLogs.map((log: any, li: number) => {
                            const lt = LOG_TYPE_LABELS[log.type] || { ko: log.type, en: log.type, icon: '📝' };
                            return (
                              <div key={li} className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{lt.icon}</span>
                                <span className="font-medium">{formatTime(log.timestamp)}</span>
                                <span className="text-gray-400">{ko ? lt.ko : lt.en}</span>
                                {log.note && <span className="text-gray-500">— {log.note}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {dayTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{ko ? "완료한 업무" : "Completed Tasks"}</p>
              <div className="space-y-1">
                {dayTasks.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm text-gray-700 py-1">
                    <Check size={12} className="text-emerald-500 shrink-0" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
