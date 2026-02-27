import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Info,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import {
  Role,
  Permission,
  PERMISSION_GROUPS,
  ROLE_INFO,
  getRoleInfo,
  hasPermission,
  canManageRole,
  getRoleLevel,
} from "../../lib/permissions";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createPortal } from "react-dom";

type Tab = "roles" | "members" | "audit";

export function PermissionsPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { can, members, auditLog, changeMemberRole, getMemberRole, canManage, currentUser } = usePermission();
  const [activeTab, setActiveTab] = useState<Tab>("roles");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const canEditRoles = can("team.editRole");

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs: { id: Tab; label: string; labelKo: string; icon: React.ReactNode }[] = [
    { id: "roles", label: "Role Matrix", labelKo: "역할 매트릭스", icon: <Shield size={15} /> },
    { id: "members", label: "Members", labelKo: "멤버 권한", icon: <Users size={15} /> },
    { id: "audit", label: "Activity Log", labelKo: "활동 로그", icon: <Clock size={15} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <button
          onClick={() => navigate("/team")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          {language === "ko" ? "팀으로 돌아가기" : "Back to Team"}
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <Shield size={18} className="text-purple-600" />
              </div>
              {language === "ko" ? "권한 관리" : "Permissions"}
            </h1>
            <p className="text-gray-500 text-sm">
              {language === "ko"
                ? "팀 멤버의 역할과 권한을 관리하세요"
                : "Manage team roles and permissions"}
            </p>
          </div>
          {/* Current user's role badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {language === "ko" ? "내 역할:" : "My role:"}
            </span>
            <RoleBadge role={getMemberRole(currentUser.id)} language={language} />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            {language === "ko" ? tab.labelKo : tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "roles" && (
        <RoleMatrixTab language={language} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />
      )}
      {activeTab === "members" && (
        <MembersTab
          language={language}
          members={members}
          canEditRoles={canEditRoles}
          getMemberRole={getMemberRole}
          changeMemberRole={changeMemberRole}
          canManage={canManage}
          currentUserId={currentUser.id}
        />
      )}
      {activeTab === "audit" && (
        <AuditLogTab language={language} auditLog={auditLog} />
      )}
    </div>
  );
}

// ─── Role Badge ─────────────────────────────────────────────────────────────
function RoleBadge({ role, language, size = "sm" }: { role: Role; language: string; size?: "sm" | "md" }) {
  const info = getRoleInfo(role);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border",
        size === "sm" ? "text-[11px] px-2.5 py-0.5" : "text-xs px-3 py-1"
      )}
      style={{
        backgroundColor: info.bgColor,
        color: info.color,
        borderColor: `${info.color}20`,
      }}
    >
      <span>{info.icon}</span>
      {language === "ko" ? info.labelKo : info.labelEn}
    </span>
  );
}

// ─── Role Matrix Tab ────────────────────────────────────────────────────────
function RoleMatrixTab({
  language,
  expandedGroups,
  toggleGroup,
}: {
  language: string;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
}) {
  const roles: Role[] = ["owner", "admin", "member", "viewer"];

  return (
    <div className="space-y-4">
      {/* Role summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROLE_INFO.map((info) => (
          <div
            key={info.role}
            className="p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xl">{info.icon}</span>
              <span className="font-bold text-gray-900 text-sm">
                {language === "ko" ? info.labelKo : info.labelEn}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {language === "ko" ? info.descKo : info.descEn}
            </p>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[1fr_repeat(4,80px)] sm:grid-cols-[1fr_repeat(4,100px)] items-center border-b border-gray-100 bg-gray-50/80 px-4 py-3 sticky top-0 z-10">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {language === "ko" ? "권한" : "Permission"}
          </span>
          {roles.map((role) => {
            const info = getRoleInfo(role);
            return (
              <div key={role} className="text-center">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: info.bgColor, color: info.color }}
                >
                  {info.icon} {language === "ko" ? info.labelKo : info.labelEn}
                </span>
              </div>
            );
          })}
        </div>

        {/* Permission groups */}
        {PERMISSION_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.key] !== false;
          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full grid grid-cols-[1fr_repeat(4,80px)] sm:grid-cols-[1fr_repeat(4,100px)] items-center px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-sm">{group.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {language === "ko" ? group.labelKo : group.labelEn}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </div>
                {/* Summary: count of permissions per role */}
                {roles.map((role) => {
                  const count = group.permissions.filter((p) => hasPermission(role, p.permission)).length;
                  return (
                    <div key={role} className="text-center">
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          count === group.permissions.length
                            ? "text-emerald-600"
                            : count > 0
                              ? "text-amber-600"
                              : "text-gray-300"
                        )}
                      >
                        {count}/{group.permissions.length}
                      </span>
                    </div>
                  );
                })}
              </button>

              {isExpanded &&
                group.permissions.map((perm) => (
                  <div
                    key={perm.permission}
                    className="grid grid-cols-[1fr_repeat(4,80px)] sm:grid-cols-[1fr_repeat(4,100px)] items-center px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="pl-7">
                      <span className="text-sm text-gray-700">
                        {language === "ko" ? perm.labelKo : perm.labelEn}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">
                        {language === "ko" ? perm.descKo : perm.descEn}
                      </p>
                    </div>
                    {roles.map((role) => {
                      const allowed = hasPermission(role, perm.permission);
                      return (
                        <div key={role} className="flex justify-center">
                          {allowed ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                              <Check size={12} className="text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                              <X size={10} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Members Tab ────────────────────────────────────────────────────────────
function MembersTab({
  language,
  members,
  canEditRoles,
  getMemberRole,
  changeMemberRole,
  canManage,
  currentUserId,
}: {
  language: string;
  members: any[];
  canEditRoles: boolean;
  getMemberRole: (id: string) => Role;
  changeMemberRole: (id: string, role: Role) => boolean;
  canManage: (id: string) => boolean;
  currentUserId: string;
}) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ userId: string; newRole: Role } | null>(null);

  const handleRoleChange = (userId: string, newRole: Role) => {
    setConfirmDialog({ userId, newRole });
  };

  const confirmRoleChange = () => {
    if (confirmDialog) {
      changeMemberRole(confirmDialog.userId, confirmDialog.newRole);
      setConfirmDialog(null);
      setEditingUser(null);
    }
  };

  const assignableRoles: Role[] = ["admin", "member", "viewer"];

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
          <h3 className="text-sm font-semibold text-gray-700">
            {language === "ko" ? "멤버별 권한 관리" : "Member Permissions"}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {language === "ko"
              ? "각 멤버의 역할을 변경하여 권한을 조정합니다"
              : "Adjust permissions by changing each member's role"}
          </p>
        </div>

        <div className="divide-y divide-gray-50">
          {members.map((member) => {
            const role = getMemberRole(member.id);
            const roleInfo = getRoleInfo(role);
            const isMe = member.id === currentUserId;
            const isEditing = editingUser === member.id;
            const editable = canEditRoles && canManage(member.id);

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px]"
                    style={{ backgroundColor: roleInfo.bgColor }}
                  >
                    <span>{roleInfo.icon}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 truncate">
                      {member.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                        {language === "ko" ? "나" : "me"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.jobTitle && (
                      <span className="text-xs text-gray-400">{member.jobTitle}</span>
                    )}
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">
                      {member.name.toLowerCase().replace(" ", ".")}@company.com
                    </span>
                  </div>
                </div>

                {/* Role selector */}
                <div className="flex items-center gap-2">
                  {isEditing && editable ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                      {assignableRoles.map((r) => {
                        const info = getRoleInfo(r);
                        const isCurrentRole = r === role;
                        return (
                          <button
                            key={r}
                            onClick={() => {
                              if (!isCurrentRole) handleRoleChange(member.id, r);
                            }}
                            className={cn(
                              "text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all",
                              isCurrentRole
                                ? "ring-2 ring-offset-1"
                                : "hover:scale-105 opacity-60 hover:opacity-100"
                            )}
                            style={{
                              backgroundColor: info.bgColor,
                              color: info.color,
                              borderColor: isCurrentRole ? info.color : `${info.color}30`,
                              ...(isCurrentRole ? { ringColor: info.color } : {}),
                            }}
                          >
                            {info.icon} {language === "ko" ? info.labelKo : info.labelEn}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setEditingUser(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <RoleBadge role={role} language={language} size="md" />
                      {editable && (
                        <button
                          onClick={() => setEditingUser(member.id)}
                          className="text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          {language === "ko" ? "변경" : "Change"}
                        </button>
                      )}
                      {isMe && (
                        <span className="text-[10px] text-gray-300 italic">
                          {language === "ko" ? "변경 불가" : "Can't change"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission summary for each role */}
      <div className="mt-6 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              {language === "ko" ? "역할 변경 안내" : "Role Change Guide"}
            </h4>
            <ul className="text-xs text-blue-700 space-y-1.5 leading-relaxed">
              <li>
                {language === "ko"
                  ? "• Owner는 모든 권한을 가지며, 역할을 다른 사람에게 양도할 수 없습니다."
                  : "• Owner has full permissions and cannot transfer their role."}
              </li>
              <li>
                {language === "ko"
                  ? "• Admin은 팀 관리, 목표·업무 전체 수정 권한이 있지만 결제 권한은 없습니다."
                  : "• Admin can manage team and all tasks/goals, but has no billing access."}
              </li>
              <li>
                {language === "ko"
                  ? "• Member는 본인의 업무만 생성·수정할 수 있습니다."
                  : "• Member can only create and edit their own tasks."}
              </li>
              <li>
                {language === "ko"
                  ? "• Viewer는 조회만 가능하며 어떤 것도 생성·수정할 수 없습니다."
                  : "• Viewer has read-only access to everything."}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmDialog &&
        createPortal(
          <ConfirmRoleChangeDialog
            language={language}
            member={members.find((m) => m.id === confirmDialog.userId)!}
            currentRole={getMemberRole(confirmDialog.userId)}
            newRole={confirmDialog.newRole}
            onConfirm={confirmRoleChange}
            onCancel={() => setConfirmDialog(null)}
          />,
          document.body
        )}
    </>
  );
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmRoleChangeDialog({
  language,
  member,
  currentRole,
  newRole,
  onConfirm,
  onCancel,
}: {
  language: string;
  member: any;
  currentRole: Role;
  newRole: Role;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const oldInfo = getRoleInfo(currentRole);
  const newInfo = getRoleInfo(newRole);
  const isDowngrade = getRoleLevel(newRole) < getRoleLevel(currentRole);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] max-w-[90vw] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
              isDowngrade ? "bg-amber-50" : "bg-blue-50"
            )}
          >
            {isDowngrade ? (
              <AlertTriangle size={20} className="text-amber-500" />
            ) : (
              <Shield size={20} className="text-blue-500" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900">
              {language === "ko" ? "역할 변경 확인" : "Confirm Role Change"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {member.name}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <RoleBadge role={currentRole} language={language} />
                <span className="text-gray-400">→</span>
                <RoleBadge role={newRole} language={language} />
              </div>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                {language === "ko" ? newInfo.descKo : newInfo.descEn}
              </p>
            </div>
          </div>

          {isDowngrade && (
            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700 leading-relaxed">
                {language === "ko"
                  ? `⚠️ ${member.name}님의 일부 권한이 제거됩니다. 진행하시겠습니까?`
                  : `⚠️ Some of ${member.name}'s permissions will be removed. Continue?`}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {language === "ko" ? "취소" : "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm",
              isDowngrade
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-blue-500 hover:bg-blue-600"
            )}
          >
            {language === "ko" ? "변경 확인" : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Audit Log Tab ──────────────────────────────────────────────────────────
function AuditLogTab({
  language,
  auditLog,
}: {
  language: string;
  auditLog: any[];
}) {
  const actionLabels: Record<string, { en: string; ko: string; color: string; bgColor: string }> = {
    role_changed: { en: "Role Changed", ko: "역할 변경", color: "#0079FF", bgColor: "rgba(0,121,255,0.08)" },
    member_invited: { en: "Member Invited", ko: "멤버 초대", color: "#059669", bgColor: "rgba(5,150,105,0.08)" },
    member_removed: { en: "Member Removed", ko: "멤버 삭제", color: "#DC2626", bgColor: "rgba(220,38,38,0.08)" },
  };

  if (auditLog.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <Clock size={48} className="mx-auto mb-4 text-gray-200" />
        <p className="text-sm text-gray-400">
          {language === "ko" ? "아직 활동 기록이 없습니다" : "No activity yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
        <h3 className="text-sm font-semibold text-gray-700">
          {language === "ko" ? "권한 변경 이력" : "Permission Change History"}
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {auditLog.map((entry) => {
          const actionInfo = actionLabels[entry.action] ?? actionLabels.role_changed;
          return (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{entry.actorName}</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: actionInfo.bgColor, color: actionInfo.color }}
                  >
                    {language === "ko" ? actionInfo.ko : actionInfo.en}
                  </span>
                  {entry.targetName && (
                    <>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-sm text-gray-700">{entry.targetName}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "ko" ? entry.detailsKo : entry.details}
                </p>
                <span className="text-[10px] text-gray-300 mt-1 block">
                  {format(
                    new Date(entry.timestamp),
                    language === "ko" ? "yyyy년 M월 d일 HH:mm" : "MMM d, yyyy HH:mm",
                    { locale: language === "ko" ? ko : undefined }
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
