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
} from "lucide-react";
import { cn } from "../../lib/utils";
import { User, getUserColor, setUserColor, getColorOwner, getMemberColorConfig, MEMBER_COLORS } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate } from "react-router";
import { getRoleInfo, type Role } from "../../lib/permissions";
import { usePermission } from "../context/PermissionContext";
import { PermissionGate } from "../components/layout/PermissionGate";
import { useTaskContext } from "../context/TaskContext";
import { InviteMemberDialog } from "../components/team/InviteMemberDialog";
import { useInvite } from "../context/InviteContext";
import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export function TeamPage() {
  const { t, language } = useLanguage();
  const ko = language === 'ko';
  const navigate = useNavigate();
  const { members, currentUser } = usePermission();
  const { tasks } = useTaskContext();
  const { org, joinRequests, pendingCount, approveRequest, rejectRequest } = useInvite();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      const memberTasks = tasks.filter((t) => t.assigneeId === m.id);
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
                onClick={() => navigate("/team/permissions")}
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

      {/* ── Pending Join Requests ────────────────────────────────── */}
      {pendingRequests.length > 0 && (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...members].sort((a, b) => a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0).map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            stats={memberStats[member.id]}
            onViewTasks={() => navigate(`/team/${member.id}`)}
            currentUser={currentUser}
          />
        ))}
        
        {/* Invite Card */}
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
      </div>

      <InviteMemberDialog 
        open={isInviteDialogOpen} 
        onOpenChange={setIsInviteDialogOpen}
      />
    </div>
  );
}

function TeamMemberCard({
  member,
  stats,
  onViewTasks,
  currentUser,
}: {
  member: User;
  stats: { completed: number; inProgress: number; pending: number; total: number };
  onViewTasks: () => void;
  currentUser: User;
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

      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {member.name}
        {isMe && <span className="ml-1.5 text-sm font-medium text-gray-400">({language === 'ko' ? '나' : 'Me'})</span>}
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
          <span className="truncate">{member.name.toLowerCase().replace(' ', '.')}@company.com</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Briefcase size={16} className="text-gray-400" />
          <span>{member.jobTitle ?? "Product Team"}</span>
        </div>
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
