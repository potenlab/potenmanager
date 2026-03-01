import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Camera,
  Mail,
  Phone,
  Briefcase,
  MapPin,
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
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  getUserColor,
  setUserColor,
  getColorOwner,
  getMemberColorConfig,
  MEMBER_COLORS,
} from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { useTeam } from "../context/TeamContext";
import { useAuth } from "../context/AuthContext";
import { useInvite } from "../context/InviteContext";
import { api } from "../../lib/api";

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
  const { currentUser, members, updateMember } = useTeam();
  const { user: authUser, signOut } = useAuth();
  const { org } = useInvite();

  // Profile fields from server
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

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
      if (profile.company) setCompany(profile.company);
      if (profile.location) setLocation(profile.location);
      if (profile.avatar) setCustomAvatar(profile.avatar);
    }).catch(() => {});
  }, [currentUser.id]);

  // Derived values from auth
  const name = currentUser.name || authUser?.user_metadata?.full_name || authUser?.email || "User";
  const email = authUser?.email || "";
  const avatar = customAvatar || currentUser.avatar || authUser?.user_metadata?.avatar_url || "";
  const role = currentUser.role === "owner" ? "Founder / CEO" : "Team Member";

  const handleSelectMyColor = (hex: string) => {
    const owner = getColorOwner(hex);
    if (owner && owner !== currentUser.id) return;
    if (myColor === hex) {
      setUserColor(currentUser.id, null);
      setMyColor(null);
    } else {
      setUserColor(currentUser.id, hex);
      setMyColor(hex);
    }
  };

  const profileFields: ProfileField[] = [
    { key: "name", label: "Name", labelKo: "이름", value: name, icon: <UserIcon size={16} />, editable: true },
    { key: "email", label: "Email", labelKo: "이메일", value: email, icon: <Mail size={16} /> },
    { key: "phone", label: "Phone", labelKo: "전화번호", value: phone || (language === "ko" ? "미설정" : "Not set"), icon: <Phone size={16} />, editable: true },
    { key: "role", label: "Role", labelKo: "역할", value: role, icon: <Briefcase size={16} /> },
    { key: "company", label: "Company", labelKo: "회사", value: company || (language === "ko" ? "미설정" : "Not set"), icon: <Globe size={16} />, editable: true },
    { key: "location", label: "Location", labelKo: "위치", value: location || (language === "ko" ? "미설정" : "Not set"), icon: <MapPin size={16} />, editable: true },
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
      case "company":
        setCompany(v);
        api.updateProfile(currentUser.id, { company: v }).catch(() => {});
        break;
      case "location":
        setLocation(v);
        api.updateProfile(currentUser.id, { location: v }).catch(() => {});
        break;
    }
    setEditingField(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
            <p className="text-sm text-gray-500 mt-0.5">{role}</p>
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
                  onClick={() => navigate("/goals")}
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
                  onClick={() => navigate("/goals")}
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
            {/* Color preview bar */}
            {myColor && (
              <div
                className="h-2 rounded-full mb-4 transition-colors"
                style={{ background: `linear-gradient(90deg, ${myColor}20, ${myColor}70, ${myColor}20)` }}
              />
            )}

            {/* My color */}
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

            {/* Team member colors overview */}
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
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/5"
                              style={{ backgroundColor: mColor }}
                            />
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: mConfig.bg, color: mConfig.text }}
                            >
                              {language === "ko" ? mConfig.labelKo : mConfig.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            {language === "ko" ? "미설정" : "Not set"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">
              {language === "ko" ? "설정" : "Settings"}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {/* Language (read-only, controlled from sidebar) */}
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Globe size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900">
                    {language === "ko" ? "언어" : "Language"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {language === "ko" ? "한국어" : "English"}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
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
