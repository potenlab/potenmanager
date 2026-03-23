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
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRecord, setMyRecord] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAttendance(selectedDate);
      setRecords(data);
      const uid = (await supabase.auth.getUser()).data.user?.id;
      setMyRecord(data.find((r: any) => r.userId === uid) || null);
    } catch (err) { console.error("Attendance load error:", err); }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const handleCheckIn = async () => {
    try {
      const r = await api.checkIn();
      setMyRecord(r);
      loadAttendance();
    } catch (err) { console.error("Check-in error:", err); }
  };

  const handleCheckOut = async () => {
    try {
      const r = await api.checkOut();
      setMyRecord(r);
      loadAttendance();
    } catch (err) { console.error("Check-out error:", err); }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const checkedIn = myRecord?.checkIn;
  const checkedOut = myRecord?.checkOut;

  const formatTime = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString(ko ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getWorkDuration = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return "-";
    const end = checkOut ? new Date(checkOut) : new Date();
    const diff = end.getTime() - new Date(checkIn).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}${ko ? "시간" : "h"} ${m}${ko ? "분" : "m"}`;
  };

  const getMemberName = (userId: string) => {
    const m = members.find(m => m.id === userId);
    return m?.name || m?.email || userId.slice(0, 8);
  };

  const getMemberAvatar = (userId: string) => {
    const m = members.find(m => m.id === userId);
    return m?.avatar;
  };

  return (
    <div className="space-y-6">
      {/* My check-in card */}
      {isToday && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{ko ? "오늘 출근" : "Today"}</h3>
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString(ko ? "ko-KR" : "en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
            {checkedIn && (
              <div className="text-right">
                <p className="text-xs text-gray-400">{ko ? "근무 시간" : "Duration"}</p>
                <p className="text-lg font-bold text-gray-900">{getWorkDuration(myRecord?.checkIn, myRecord?.checkOut)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">{ko ? "출근" : "Check In"}</p>
              <p className="text-xl font-bold text-gray-900">{formatTime(myRecord?.checkIn)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] uppercase font-semibold text-gray-400 mb-1">{ko ? "퇴근" : "Check Out"}</p>
              <p className="text-xl font-bold text-gray-900">{formatTime(myRecord?.checkOut)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {!checkedIn ? (
              <button onClick={handleCheckIn}
                className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Clock size={16} /> {ko ? "출근하기" : "Check In"}
              </button>
            ) : !checkedOut ? (
              <button onClick={handleCheckOut}
                className="flex-1 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <Clock size={16} /> {ko ? "퇴근하기" : "Check Out"}
              </button>
            ) : (
              <div className="flex-1 py-3 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl text-center flex items-center justify-center gap-2">
                <Check size={16} /> {ko ? "퇴근 완료" : "Done for today"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Date picker + team list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{ko ? "팀 출근 현황" : "Team Attendance"}</h3>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{ko ? "로딩 중..." : "Loading..."}</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">{ko ? "출근 기록이 없습니다" : "No records"}</div>
        ) : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "멤버" : "Member"}</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "출근" : "In"}</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "퇴근" : "Out"}</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "근무시간" : "Duration"}</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "상태" : "Status"}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getMemberAvatar(r.userId) ? (
                        <img src={getMemberAvatar(r.userId)} className="w-7 h-7 rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {getMemberName(r.userId).charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900">{getMemberName(r.userId)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatTime(r.checkIn)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatTime(r.checkOut)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{getWorkDuration(r.checkIn, r.checkOut)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                      r.checkOut ? "bg-emerald-100 text-emerald-700" : r.checkIn ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500")}>
                      {r.checkOut ? (ko ? "퇴근" : "Done") : r.checkIn ? (ko ? "근무 중" : "Working") : (ko ? "미출근" : "Absent")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
