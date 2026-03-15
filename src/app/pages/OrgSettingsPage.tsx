import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Camera,
  Building2,
  Check,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useInvite } from "../context/InviteContext";
import { generateSlug } from "../hooks/useOrgPath";
import { usePermission } from "../context/PermissionContext";
import { hasPermission, type Role } from "../../lib/permissions";

/* ── Inline field (Notion-style underline) ── */
function InlineField({
  label,
  value,
  placeholder,
  onSave,
  disabled,
  multiline,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const savedRef = useRef(value);

  useEffect(() => { setText(value); savedRef.current = value; }, [value]);

  const commit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed !== savedRef.current) {
      onSave(trimmed);
      savedRef.current = trimmed;
    } else {
      setText(savedRef.current);
    }
  }, [text, onSave]);

  const sharedProps = {
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => { setFocused(false); commit(); },
    placeholder,
    disabled,
    className: cn(
      "w-full bg-transparent outline-none transition-all duration-150 text-sm text-gray-900",
      "border-b-2 py-2",
      disabled
        ? "border-transparent text-gray-400 cursor-not-allowed"
        : focused
          ? "border-blue-400"
          : "border-gray-100 hover:border-gray-300",
    ),
  };

  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      {multiline ? (
        <textarea
          {...sharedProps}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setText(savedRef.current); e.currentTarget.blur(); }
          }}
          className={cn(sharedProps.className, "resize-none border-2 rounded-lg px-3")}
        />
      ) : (
        <input
          {...sharedProps}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") { setText(savedRef.current); e.currentTarget.blur(); }
          }}
        />
      )}
    </div>
  );
}

export function OrgSettingsPage() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === "ko";
  const { org, updateOrgName, updateOrgLogo, updateOrgField } = useInvite();
  const { currentUser } = usePermission();
  const [saved, setSaved] = useState(false);

  const canEdit = hasPermission(currentUser.role as Role, "org.edit");
  const canDelete = hasPermission(currentUser.role as Role, "org.delete");

  // Logo upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      alert(ko ? "200KB 이하 이미지만 가능합니다" : "Max 200KB image allowed");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateOrgLogo(reader.result as string);
      flashSaved();
    };
    reader.readAsDataURL(file);
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!org) return null;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-20">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3"
      >
        <ArrowLeft size={14} />
        <span>{ko ? "뒤로가기" : "Back"}</span>
      </button>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">
            {ko ? "조직 정보" : "Organization Info"}
          </h1>
          <p className="text-xs text-gray-400">
            {ko ? "기본 회사 정보를 관리합니다" : "Manage basic company information"}
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-in fade-in">
            <Check size={12} />
            {ko ? "저장됨" : "Saved"}
          </span>
        )}
      </div>

      {/* Logo Section */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-500 mb-3">
          {ko ? "조직 로고" : "Organization Logo"}
        </p>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={() => canEdit && logoInputRef.current?.click()}
            disabled={!canEdit}
            className={cn(
              "w-20 h-20 rounded-2xl overflow-hidden relative group border-2 border-dashed border-gray-200 shrink-0",
              canEdit && "cursor-pointer hover:border-blue-300"
            )}
          >
            {org.logoUrl ? (
              <img src={org.logoUrl} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Building2 size={32} className="text-gray-300" />
              </div>
            )}
            {canEdit && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </button>
          <div className="text-xs text-gray-400 space-y-1">
            <p>{ko ? "클릭해서 로고를 업로드하세요" : "Click to upload a logo"}</p>
            <p>{ko ? "PNG, JPG (최대 200KB)" : "PNG, JPG (max 200KB)"}</p>
            {org.logoUrl && canEdit && (
              <button
                onClick={() => { updateOrgLogo(""); flashSaved(); }}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                {ko ? "로고 삭제" : "Remove logo"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mb-6" />

      {/* Company Info Fields */}
      <div className="space-y-5 mb-8">
        <InlineField
          label={ko ? "조직명" : "Organization Name"}
          value={org.name}
          placeholder={ko ? "조직 이름을 입력하세요" : "Enter organization name"}
          onSave={(v) => { if (v) { updateOrgName(v); flashSaved(); } }}
          disabled={!canEdit}
        />
        <InlineField
          label={ko ? "URL 슬러그 (영문)" : "URL Slug (English)"}
          value={org.slug || generateSlug(org.name)}
          placeholder={ko ? "예: potenlab" : "e.g. potenlab"}
          onSave={(v) => {
            const slug = generateSlug(v || org.name);
            updateOrgField("slug", slug);
            try { localStorage.setItem("poten_org_slug", slug); } catch {}
            flashSaved();
          }}
          disabled={!canEdit}
        />
        <InlineField
          label={ko ? "대표자명" : "Representative"}
          value={(org as any).representative || ""}
          placeholder={ko ? "예: 홍길동" : "e.g. John Doe"}
          onSave={(v) => { updateOrgField("representative", v); flashSaved(); }}
          disabled={!canEdit}
        />
        <InlineField
          label={ko ? "회사 소개" : "Description"}
          value={(org as any).description || ""}
          placeholder={ko ? "회사에 대한 간단한 소개를 적어주세요" : "Brief description of your company"}
          onSave={(v) => { updateOrgField("description", v); flashSaved(); }}
          disabled={!canEdit}
          multiline
        />
        <InlineField
          label={ko ? "업종" : "Industry"}
          value={(org as any).industry || ""}
          placeholder={ko ? "예: IT/소프트웨어" : "e.g. IT/Software"}
          onSave={(v) => { updateOrgField("industry", v); flashSaved(); }}
          disabled={!canEdit}
        />
        <InlineField
          label={ko ? "연락처" : "Contact"}
          value={(org as any).contact || ""}
          placeholder={ko ? "예: contact@company.com" : "e.g. contact@company.com"}
          onSave={(v) => { updateOrgField("contact", v); flashSaved(); }}
          disabled={!canEdit}
        />
        <InlineField
          label={ko ? "주소" : "Address"}
          value={(org as any).address || ""}
          placeholder={ko ? "예: 서울시 강남구" : "e.g. Seoul, Korea"}
          onSave={(v) => { updateOrgField("address", v); flashSaved(); }}
          disabled={!canEdit}
        />
      </div>

      {/* Danger Zone */}
      {canDelete && (
        <>
          <div className="border-t border-gray-100 mb-6" />
          <div>
            <p className="text-xs font-semibold text-red-400 mb-3">
              {ko ? "위험 구역" : "Danger Zone"}
            </p>
            <button
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
              onClick={() => {
                if (window.confirm(ko ? "정말 조직을 삭제하시겠습니까? 모든 데이터가 삭제됩니다." : "Are you sure? All data will be deleted.")) {
                  console.log("[OrgSettings] Delete org requested");
                }
              }}
            >
              <Trash2 size={14} />
              {ko ? "조직 삭제" : "Delete Organization"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
