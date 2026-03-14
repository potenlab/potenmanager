import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Camera,
  Mail,
  Phone,
  Briefcase,
  Globe,
  Building2,
  Shield,
  LogOut,
  ChevronRight,
  Check,
  Pencil,
  X,
  Palette,
  Lock,
  User as UserIcon,
  CheckSquare,
  Circle,
  CircleDot,
  CheckCircle2,
  Video,
  Calendar,
  ArrowRight,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  getUserColor,
  setUserColor,
  getColorOwner,
  getMemberColorConfig,
  MEMBER_COLORS,
  JobRole,
  getAllAssigneeIds,
} from "../../lib/mockData";
import { JOB_ROLE_CONFIG, JOB_ROLES } from "../../lib/jobRoles";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { useAuth } from "../context/AuthContext";
import { useInvite } from "../context/InviteContext";
import { useTaskContext } from "../context/TaskContext";
import { useMeetingContext } from "../context/MeetingContext";
import { api } from "../../lib/api";
import { useOrgPath } from "../hooks/useOrgPath";

interface ProfileField {
  key: string;
  label: string;
  labelKo: string;
  value: string;
  icon: React.ReactNode;
  editable?: boolean;
}

export function MyPage() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const p = useOrgPath();
  const { currentUser, members, updateMember } = useTeam();
  const { user: authUser, signOut } = useAuth();
  const { org } = useInvite();
  const { tasks } = useTaskContext();
  const { meetings } = useMeetingContext();

  const ko = language === "ko";

  // My tasks (recent 5, sorted by due date)
  const myAllTasks = tasks.filter(t => getAllAssigneeIds(t).includes(currentUser.id));
  const myTasks = [...myAllTasks]
    .sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    })
    .slice(0, 5);

  const myTaskStats = {
    total: myAllTasks.length,
    pending: myAllTasks.filter(t => t.status === "pending").length,
    inProgress: myAllTasks.filter(t => t.status === "in-progress").length,
    completed: myAllTasks.filter(t => t.status === "completed").length,
  };

  // My meetings (upcoming, sorted by date)
  const myMeetings = meetings
    .filter(m => m.attendeeIds.includes(currentUser.id) || m.organizerId === currentUser.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Profile fields from server
  const [phone, setPhone] = useState("");
  const [jobRole, setJobRole] = useState<JobRole | undefined>(currentUser.jobRole);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Avatar upload
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx?.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCustomAvatar(dataUrl);
      updateMember(currentUser.id, { avatar: dataUrl });
      api.updateProfile(currentUser.id, { avatar: dataUrl }).catch(() => {});
    };
    img.src = URL.createObjectURL(file);
  };

  // Calendar color
  const [myColor, setMyColor] = useState<string | null>(() => getUserColor(currentUser.id));
  const myColorConfig = myColor ? getMemberColorConfig(myColor) : null;

  // Load profile from server on mount
  const profileLoaded = useRef(false);
  useEffect(() => {
    if (!currentUser.id || profileLoaded.current) return;
    profileLoaded.current = true;
    api.getProfile(currentUser.id).then((profile: any) => {
      if (profile.phone) setPhone(profile.phone);
      if (profile.avatar) setCustomAvatar(profile.avatar);
      if (profile.jobRole) {
        setJobRole(profile.jobRole as JobRole);
        updateMember(currentUser.id, { jobRole: profile.jobRole as JobRole });
      }
      if (profile.calendarColor) {
        setUserColor(currentUser.id, profile.calendarColor);
        setMyColor(profile.calendarColor);
      }
    }).catch(() => {});
  }, [currentUser.id]);

  // Derived values from auth
  const name = currentUser.name || authUser?.user_metadata?.full_name || authUser?.email || "User";
  const email = authUser?.email || "";
  const avatar = customAvatar || currentUser.avatar || authUser?.user_metadata?.avatar_url || "";
  const role = currentUser.role === "owner" ? "Founder / CEO" : "Team Member";
  const title = currentUser.role === "owner" ? "Founder / CEO" : (ko ? "팀 멤버" : "Team Member");

  const handleSelectMyColor = (hex: string) => {
    const owner = getColorOwner(hex);
    if (owner && owner !== currentUser.id) return;
    if (myColor === hex) {
      setUserColor(currentUser.id, null);
      setMyColor(null);
      api.updateProfile(currentUser.id, { calendarColor: '' }).catch(() => {});
    } else {
      setUserColor(currentUser.id, hex);
      setMyColor(hex);
      api.updateProfile(currentUser.id, { calendarColor: hex }).catch(() => {});
    }
  };

  const profileFields: ProfileField[] = [
    { key: "name", label: "Name", labelKo: "이름", value: name, icon: <UserIcon size={16} />, editable: true },
    { key: "email", label: "Email", labelKo: "이메일", value: email, icon: <Mail size={16} /> },
    { key: "phone", label: "Phone", labelKo: "전화번호", value: phone || (language === "ko" ? "미설정" : "Not set"), icon: <Phone size={16} />, editable: true },
    { key: "role", label: "Title", labelKo: "직책", value: title, icon: <Briefcase size={16} /> },
  ];

  const startEdit = (key: string, currentValue: string) => {
    const isPlaceholder = currentValue === "미설정" || currentValue === "Not set";
    setEditingField(key);
    setEditValue(isPlaceholder ? "" : currentValue);
  };

  const commitEdit = async () => {
    if (!editingField) {
      setEditingField(null);
      return;
    }
    const v = editValue.trim();
    switch (editingField) {
      case "name":
        if (v) await updateMember(currentUser.id, { name: v });
        break;
      case "phone":
        setPhone(v);
        api.updateProfile(currentUser.id, { phone: v }).catch(() => {});
        break;
    }
    setEditingField(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleJobRoleSelect = (role: JobRole) => {
    const newRole = jobRole === role ? undefined : role;
    setJobRole(newRole);
    updateMember(currentUser.id, { jobRole: newRole });
    api.updateProfile(currentUser.id, { jobRole: newRole || '' }).catch(() => {});
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(p("/"));
  };

  return (
    <div className="min-h-full bg-gray-50/30">
      {/* Page header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {language === "ko" ? "마이페이지" : "My Page"}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-0 sm:px-2 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M0%2020h40M20%200v40%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.05)%22%20fill%3D%22none%22/%3E%3C/svg%3E')] opacity-50" />
          </div>

          {/* Avatar */}
          <div className="px-6 -mt-14 relative z-[1]">
            <div className="relative inline-block group">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg bg-blue-100 flex items-center justify-center">
                  <UserIcon size={40} className="text-blue-400" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Name & Role */}
          <div className="px-6 pt-3 pb-5">
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                <Shield size={12} />
                {currentUser.role === "owner"
                  ? language === "ko" ? "관리자" : "Admin"
                  : language === "ko" ? "멤버" : "Member"
                }
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                <Check size={12} />
                {language === "ko" ? "활성" : "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">
              {language === "ko" ? "기본 정보" : "Basic Info"}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {profileFields.map((field) => (
              <div
                key={field.key}
                className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group"
              >
                <span className="text-gray-400 shrink-0">{field.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">
                    {language === "ko" ? field.labelKo : field.label}
                  </p>
                  {editingField === field.key ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 text-sm text-gray-900 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        onClick={commitEdit}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className={cn(
                      "text-sm truncate",
                      (field.value === "미설정" || field.value === "Not set") ? "text-gray-400 italic" : "text-gray-900"
                    )}>{field.value}</p>
                  )}
                </div>
                {field.editable && editingField !== field.key && (
                  <button
                    onClick={() => startEdit(field.key, field.value)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Job Role */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Briefcase size={16} className="text-gray-400" />
                {ko ? "직무 역할" : "Job Role"}
              </h3>
              {jobRole && JOB_ROLE_CONFIG[jobRole] && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {JOB_ROLE_CONFIG[jobRole].emoji} {ko ? JOB_ROLE_CONFIG[jobRole].labelKo : JOB_ROLE_CONFIG[jobRole].label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {ko ? "업무 할당 시 역할에 맞는 업무가 자동 배정됩니다" : "Tasks will be auto-assigned based on your role"}
            </p>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {JOB_ROLES.map((role) => {
                const cfg = JOB_ROLE_CONFIG[role];
                const isSelected = jobRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleJobRoleSelect(role)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    )}
                  >
                    {cfg.emoji} {ko ? cfg.labelKo : cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Building2 size={16} className="text-gray-400" />
              {language === "ko" ? "소속 조직" : "Organization"}
            </h3>
          </div>
          <div className="px-6 py-4">
            {org ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Building2 size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(p("/organization"))}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {language === "ko" ? "보기" : "View"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 italic">
                  {language === "ko" ? "소속된 조직이 없습니다" : "No organization"}
                </p>
                <button
                  onClick={() => navigate(p("/organization"))}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {language === "ko" ? "가입하기" : "Join"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Color */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900">
                  {language === "ko" ? "캘린더 색상" : "Calendar Color"}
                </h3>
              </div>
              {myColor && myColorConfig && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: myColorConfig.bg, color: myColorConfig.text }}
                  >
                    {language === "ko" ? myColorConfig.labelKo : myColorConfig.label}
                  </span>
                  <button
                    onClick={() => {
                      setUserColor(currentUser.id, null);
                      setMyColor(null);
                      api.updateProfile(currentUser.id, { calendarColor: '' }).catch(() => {});
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500 transition-colors font-medium"
                  >
                    {language === "ko" ? "초기화" : "Clear"}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 py-4">
            {myColor && (
              <div
                className="h-2 rounded-full mb-4 transition-colors"
                style={{ background: `linear-gradient(90deg, ${myColor}20, ${myColor}70, ${myColor}20)` }}
              />
            )}
            <p className="text-xs text-gray-500 mb-3">
              {language === "ko"
                ? "캘린더에서 내 업무가 이 색상으로 표시됩니다."
                : "Your tasks will appear with this color on the calendar."}
            </p>
            <div className="flex items-center gap-2.5 flex-wrap">
              {MEMBER_COLORS.map((mc) => {
                const ownerOfColor = getColorOwner(mc.hex);
                const isTaken = ownerOfColor !== null && ownerOfColor !== currentUser.id;
                const ownerMember = isTaken ? members.find((m) => m.id === ownerOfColor) : null;
                const isSelected = myColor === mc.hex;
                return (
                  <button
                    key={mc.id}
                    onClick={() => handleSelectMyColor(mc.hex)}
                    disabled={isTaken}
                    title={
                      isTaken
                        ? `${ownerMember?.name ?? ""} ${language === "ko" ? "사용 중" : "in use"}`
                        : language === "ko" ? mc.labelKo : mc.label
                    }
                    className={cn(
                      "relative w-8 h-8 rounded-full flex items-center justify-center transition-all",
                      isTaken ? "opacity-25 cursor-not-allowed" : "hover:scale-110 cursor-pointer",
                      isSelected && "ring-2 ring-offset-2 scale-110"
                    )}
                    style={isSelected ? { ringColor: mc.hex } : undefined}
                  >
                    <span
                      className="w-full h-full rounded-full border border-black/5"
                      style={{ backgroundColor: mc.hex }}
                    />
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check size={14} className="text-white drop-shadow-sm" strokeWidth={3} />
                      </span>
                    )}
                    {isTaken && (
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <Lock size={8} className="text-gray-500" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {currentUser.role === "owner" && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {language === "ko" ? "팀원 색상" : "Team Colors"}
                </p>
                <div className="space-y-2">
                  {members.filter(m => m.id !== currentUser.id).map((member) => {
                    const mColor = getUserColor(member.id);
                    const mConfig = mColor ? getMemberColorConfig(mColor) : null;
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon size={12} className="text-gray-400" />
                          </div>
                        )}
                        <span className="text-sm text-gray-700 flex-1">{member.name}</span>
                        {mColor && mConfig ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-black/5" style={{ backgroundColor: mColor }} />
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: mConfig.bg, color: mConfig.text }}>
                              {language === "ko" ? mConfig.labelKo : mConfig.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">{language === "ko" ? "미설정" : "Not set"}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Settings size={16} className="text-gray-400" />
              {ko ? "환경설정" : "Display Settings"}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">{ko ? "조직 목표 배너" : "Organization Goal Banner"}</p>
                <p className="text-xs text-gray-400 mt-0.5">{ko ? "대시보드 상단에 연간 목표를 표시합니다" : "Show annual goal on dashboard header"}</p>
              </div>
              <button
                onClick={() => {
                  const next = localStorage.getItem('poten_hide_goal_banner') === 'true';
                  if (next) localStorage.removeItem('poten_hide_goal_banner');
                  else localStorage.setItem('poten_hide_goal_banner', 'true');
                  window.dispatchEvent(new CustomEvent('poten_settings_changed'));
                }}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors",
                  localStorage.getItem('poten_hide_goal_banner') !== 'true' ? "bg-blue-500" : "bg-gray-300"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  localStorage.getItem('poten_hide_goal_banner') !== 'true' ? "left-5.5 translate-x-0" : "left-0.5"
                )}
                style={{ left: localStorage.getItem('poten_hide_goal_banner') !== 'true' ? '22px' : '2px' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3
              onClick={() => navigate(p("/tasks"))}
              className="text-sm font-bold text-gray-900 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
            >
              <CheckSquare size={16} className="text-gray-400" />
              {ko ? "내 업무" : "My Tasks"}
            </h3>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="text-gray-400">{myTaskStats.pending} {ko ? "할 일" : "to do"}</span>
              <span className="text-blue-500">{myTaskStats.inProgress} {ko ? "진행" : "active"}</span>
              <span className="text-emerald-500">{myTaskStats.completed} {ko ? "완료" : "done"}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {myTasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                {ko ? "배정된 업무가 없습니다" : "No tasks assigned"}
              </div>
            ) : (
              myTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => navigate(p(`/tasks/${task.id}`))}
                  className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <span className="shrink-0">
                    {task.status === "completed" ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                     task.status === "in-progress" ? <CircleDot size={16} className="text-blue-500" /> :
                     <Circle size={16} className="text-gray-300" />}
                  </span>
                  <span className={cn("text-sm flex-1 truncate", task.status === "completed" && "line-through text-gray-400")}>
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className={cn("text-[11px] shrink-0",
                      new Date(task.dueDate) < new Date() && task.status !== "completed" ? "text-red-500 font-medium" : "text-gray-400"
                    )}>
                      {new Date(task.dueDate).toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
          {myTaskStats.total > 5 && (
            <div className="px-6 py-3 border-t border-gray-100">
              <button onClick={() => navigate(p("/tasks"))} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                {ko ? "전체 보기" : "View all"} ({myTaskStats.total})
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* My Meetings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3
              onClick={() => navigate(p("/meetings"))}
              className="text-sm font-bold text-gray-900 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
            >
              <Video size={16} className="text-gray-400" />
              {ko ? "내 회의" : "My Meetings"}
            </h3>
            <button onClick={() => navigate(p("/meetings"))} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              {ko ? "전체 보기" : "View all"}
              <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {myMeetings.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                {ko ? "예정된 회의가 없습니다" : "No meetings scheduled"}
              </div>
            ) : (
              myMeetings.map(meeting => {
                const meetDate = new Date(meeting.date);
                const typeColors: Record<string, string> = {
                  standup: "bg-green-50 text-green-600",
                  planning: "bg-blue-50 text-blue-600",
                  review: "bg-purple-50 text-purple-600",
                  brainstorm: "bg-amber-50 text-amber-600",
                  other: "bg-gray-50 text-gray-600",
                };
                return (
                  <div
                    key={meeting.id}
                    onClick={() => navigate(p(`/meetings/${meeting.id}`))}
                    className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <Video size={14} className="text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{meeting.title}</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                        <Calendar size={10} />
                        {meetDate.toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" })}
                        <span className="mx-0.5">·</span>
                        {meeting.duration}{ko ? "분" : "min"}
                      </p>
                    </div>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", typeColors[meeting.type] || typeColors.other)}>
                      {meeting.type}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center gap-4 hover:bg-red-50 hover:border-red-100 transition-colors group"
        >
          <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="text-sm text-gray-700 group-hover:text-red-600 font-medium transition-colors">
            {language === "ko" ? "로그아웃" : "Log out"}
          </span>
        </button>

        <div className="text-center pb-8">
          <p className="text-xs text-gray-300">
            Poten Manager v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
