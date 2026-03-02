import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock,
  Calendar,
  Flag,
  Milestone,
  Target,
  ChevronDown,
  X,
  Check,
  Zap,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { GoalLevel } from "../../lib/mockData";
import { useLanguage } from "../context/LanguageContext";
import { usePermission } from "../context/PermissionContext";
import { useGoalContext } from "../context/GoalContext";
import { useTaskContext } from "../context/TaskContext";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import { NotionDateRangePicker } from "../components/NotionDateRangePicker";

type GoalStatus = "pending" | "in-progress" | "completed";

const STATUS_CONFIG: Record<GoalStatus, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { label: "To Do", labelKo: "예정", icon: <Circle size={14} />, color: "text-gray-500", bg: "bg-gray-100" },
  "in-progress": { label: "In Progress", labelKo: "진행 중", icon: <CircleDot size={14} />, color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "Done", labelKo: "완료", icon: <CheckCircle2 size={14} />, color: "text-emerald-600", bg: "bg-emerald-50" },
};

const LEVEL_CONFIG: Record<string, { label: string; labelKo: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  Year:    { label: "Annual", labelKo: "연간", icon: <Flag size={14} />, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  Quarter: { label: "Quarterly", labelKo: "분기", icon: <Milestone size={14} />, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  Month:   { label: "Monthly", labelKo: "월간", icon: <Target size={14} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  Urgent:  { label: "Urgent", labelKo: "긴급", icon: <Zap size={14} />, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
};

// ─── Inline Editable Text ───────────────────────────────────────────
function InlineText({
  value,
  onChange,
  placeholder,
  className,
  as = "p",
  readOnly = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  as?: "h1" | "p" | "span";
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) {
      ref.current.textContent = value;
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const newVal = ref.current?.textContent?.trim() || "";
    if (newVal !== value) onChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && as !== "p") {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onFocus={() => !readOnly && setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
      className={cn(
        "outline-none rounded-lg transition-colors relative",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none",
        !readOnly && "focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1",
        !readOnly && "hover:bg-gray-50/50",
        readOnly && "cursor-default",
        className
      )}
    />
  );
}

// ─── Portal Position Helper ──────────────────────────────────────────
function usePortalPosition(open: boolean, triggerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) { setPos(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    let left = rect.left;
    if (left + 240 > window.innerWidth - 16) left = window.innerWidth - 256;
    if (top + 300 > window.innerHeight - 16) top = rect.top - 304;
    setPos({ top, left });
  }, [open]);
  return pos;
}

// ─── Dropdown Select (Portal) ───────────────────────────────────────
function InlineDropdown<T extends string>({
  value,
  options,
  onChange,
  renderOption,
  renderValue,
  disabled = false,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderOption: (opt: T) => React.ReactNode;
  renderValue: (val: T) => React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popupRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm",
          disabled ? "cursor-default opacity-70" : "hover:bg-gray-100"
        )}
      >
        {renderValue(value)}
        {!disabled && <ChevronDown size={12} className="text-gray-400" />}
      </button>
      {open && pos && createPortal(
        <div
          ref={popupRef}
          className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[160px] py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                opt === value && "bg-blue-50/50"
              )}
            >
              {renderOption(opt)}
              {opt === value && <Check size={14} className="ml-auto text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Progress Editor ────────────────────────────────────────────────
function ProgressEditor({ value, onChange, language, disabled = false }: { value: number; onChange: (v: number) => void; language: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => { if (open) setTemp(value); }, [open, value]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => !disabled && setOpen(!open)}
        className={cn("flex items-center gap-3 px-2 py-1 rounded-md transition-colors group", disabled ? "cursor-default opacity-70" : "hover:bg-gray-100")}
      >
        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", value === 100 ? "bg-emerald-500" : "bg-[#0079FF]")} style={{ width: `${value}%` }} />
        </div>
        <span className="text-sm font-bold text-gray-700 min-w-[32px]">{value}%</span>
        {!disabled && <Pencil size={11} className="text-gray-300 opacity-0 group-hover:opacity-100" />}
      </button>

      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] w-[240px] p-4" style={{ top: pos.top, left: pos.left }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">{language === "ko" ? "진행률 수정" : "Set Progress"}</p>
          <div className="text-3xl font-bold text-[#0079FF]">{temp}%</div>
          <input 
            type="range" min={0} max={100} step={5} value={temp} 
            onChange={(e) => setTemp(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-gray-100 accent-[#0079FF] cursor-pointer mt-3"
          />
          <div className="flex justify-end gap-2 pt-3">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-gray-500">{language === "ko" ? "취소" : "Cancel"}</button>
            <button onClick={() => { onChange(temp); setOpen(false); }} className="px-3 py-1.5 bg-[#0079FF] text-white text-xs rounded-lg font-bold">OK</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Main Goal Detail Page ────────────────────────────────────────────
export function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { can, currentUser } = usePermission();
  const { allGoals } = useGoalContext();
  const { tasks: allTasks } = useTaskContext();

  const isNew = goalId === "new";
  const allItems = [...allGoals, ...allTasks];
  const goal = isNew ? null : allItems.find((g) => g.id === goalId);

  // Form State
  const [title, setTitle] = useState(goal ? (language === "ko" ? goal.titleKo || goal.title : goal.title) : "");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>((goal?.status as GoalStatus) || "pending");
  const [level, setLevel] = useState<GoalLevel>((goal?.level as GoalLevel) || "Quarter");
  const [progress, setProgress] = useState(goal?.progress || 0);
  const [dateStart, setDateStart] = useState<Date | null>(goal?.startDate ? new Date(goal.startDate) : new Date());
  const [dateEnd, setDateEnd] = useState<Date | null>(goal?.endDate ? new Date(goal.endDate) : null);

  const canEdit = can("goal.editAny") || isNew;
  const canDelete = can("goal.deleteAny");

  const handleDelete = () => {
    if (confirm(language === "ko" ? "정말 삭제하시겠습니까?" : "Are you sure you want to delete?")) {
      navigate(-1);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-32">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/organization")} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {language === "ko" ? "조직으로" : "Organization"}
          </button>
          <div className="flex items-center gap-2">
            {canDelete && !isNew && (
              <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl">
          
          <div className="space-y-6">
            {/* Title */}
            <div>
              <InlineText 
                value={title} onChange={setTitle} readOnly={!canEdit}
                placeholder={language === "ko" ? "목표 제목" : "Goal Title"}
                className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight focus:ring-0 focus:bg-transparent hover:bg-transparent border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
                as="h1"
              />
            </div>

            {/* Properties — one per row, notion style */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <PropertyItem icon={<Clock size={14} />} label={language === "ko" ? "상태" : "Status"}>
                <InlineDropdown 
                  value={status} options={["pending", "in-progress", "completed"] as GoalStatus[]}
                  onChange={setStatus} disabled={!canEdit}
                  renderValue={(v) => {
                    const cfg = STATUS_CONFIG[v];
                    return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {language === "ko" ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", STATUS_CONFIG[o].color)}>{STATUS_CONFIG[o].icon} {language === "ko" ? STATUS_CONFIG[o].labelKo : STATUS_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Milestone size={14} />} label={language === "ko" ? "단계" : "Level"}>
                <InlineDropdown 
                  value={level} options={["Year", "Quarter", "Month", "Urgent"] as GoalLevel[]}
                  onChange={setLevel} disabled={!canEdit}
                  renderValue={(v) => <span className={cn("px-2 py-0.5 rounded-md font-bold", LEVEL_CONFIG[v].bg, LEVEL_CONFIG[v].color)}>{language === "ko" ? LEVEL_CONFIG[v].labelKo : LEVEL_CONFIG[v].label}</span>}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", LEVEL_CONFIG[o].color)}>{LEVEL_CONFIG[o].icon} {language === "ko" ? LEVEL_CONFIG[o].labelKo : LEVEL_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Calendar size={14} />} label={language === "ko" ? "기간" : "Timeline"}>
                <NotionDateRangePicker startDate={dateStart} endDate={dateEnd} onChange={(s, e) => { setDateStart(s); setDateEnd(e); }} language={language} />
              </PropertyItem>

              <PropertyItem icon={<TrendingUp size={14} />} label={language === "ko" ? "진행률" : "Progress"}>
                <ProgressEditor value={progress} onChange={setProgress} language={language} disabled={!canEdit} />
              </PropertyItem>
            </div>

            {/* Description / Editor */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <NotionBlockEditor 
                initialContent={description} 
                onChange={setDescription} 
                readOnly={!canEdit}
                placeholder={language === "ko" ? "내용을 입력하세요..." : "Type something..."}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
