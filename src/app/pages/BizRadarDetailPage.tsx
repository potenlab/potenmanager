import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, Calendar, Compass, Eye, Send, MessageSquare, Trophy,
  CheckCircle2, Plus, Trash2, ArrowRightCircle, Check, X,
  ChevronDown, Building2, User as UserIcon, DollarSign,
  Percent, Tag, FileText, Users, Clock, Link2,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useBizRadar, BizRadarItem, BizStage, BizType, BizCategory, ConnectionType, BizActionItem } from "../context/BizRadarContext";
import { useTeam } from "../context/TeamContext";
import { useTaskContext } from "../context/TaskContext";
import { useTrash } from "../context/TrashContext";
import { cn } from "../../lib/utils";
import { createPortal } from "react-dom";

const STAGE_CONFIG: Record<BizStage, { label: string; labelKo: string; icon: React.ReactNode; color: string }> = {
  discovered: { label: "Discovered", labelKo: "발굴", icon: <Compass size={14} />, color: "text-purple-600" },
  reviewing:  { label: "Reviewing",  labelKo: "검토", icon: <Eye size={14} />,     color: "text-blue-600" },
  proposal:   { label: "Proposal",   labelKo: "제안", icon: <Send size={14} />,    color: "text-amber-600" },
  negotiation:{ label: "Negotiation",labelKo: "협상", icon: <MessageSquare size={14} />, color: "text-rose-600" },
  won:        { label: "Won",        labelKo: "성사", icon: <Trophy size={14} />,  color: "text-emerald-600" },
  lost:       { label: "Lost",       labelKo: "실패", icon: <X size={14} />,       color: "text-gray-500" },
};

const TYPE_CONFIG: Record<BizType, { label: string; labelKo: string; color: string; bg: string }> = {
  project:     { label: "Project",     labelKo: "프로젝트", color: "text-blue-600",   bg: "bg-blue-50" },
  funding:     { label: "Funding",     labelKo: "지원사업", color: "text-green-600",  bg: "bg-green-50" },
  partnership: { label: "Partnership", labelKo: "파트너십", color: "text-purple-600", bg: "bg-purple-50" },
  investment:  { label: "Investment",  labelKo: "투자",     color: "text-amber-600",  bg: "bg-amber-50" },
  other:       { label: "Other",       labelKo: "기타",     color: "text-gray-600",   bg: "bg-gray-50" },
};

const CONNECTION_TYPE_CONFIG: Record<ConnectionType, { label: string; labelKo: string; color: string; bg: string }> = {
  agent:       { label: "Agent",       labelKo: "대리점",   color: "text-indigo-600", bg: "bg-indigo-50" },
  distributor: { label: "Distributor", labelKo: "유통",     color: "text-teal-600",   bg: "bg-teal-50" },
  supplier:    { label: "Supplier",    labelKo: "공급사",   color: "text-orange-600", bg: "bg-orange-50" },
  partner:     { label: "Partner",     labelKo: "파트너",   color: "text-purple-600", bg: "bg-purple-50" },
  client:      { label: "Client",      labelKo: "고객사",   color: "text-blue-600",   bg: "bg-blue-50" },
  other:       { label: "Other",       labelKo: "기타",     color: "text-gray-600",   bg: "bg-gray-50" },
};

// ─── Inline Editable Title ──────────────────────────────────────
function InlineTitle({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && !isFocused) ref.current.textContent = value;
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const v = ref.current?.textContent?.trim() || "";
    if (v !== value) onChange(v);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ref.current?.blur(); } }}
      data-placeholder={placeholder}
      className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight tracking-tight outline-none rounded-lg empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:pointer-events-none hover:bg-gray-50/50 focus:bg-gray-50 focus:ring-2 focus:ring-blue-100 px-1 -mx-1 border-b-2 border-transparent focus:border-gray-200 rounded-none pb-0.5"
    />
  );
}

// ─── Portal Dropdown ────────────────────────────────────────────
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

function InlineDropdown<T extends string>({
  value, options, onChange, renderOption, renderValue,
}: {
  value: T; options: T[]; onChange: (v: T) => void;
  renderOption: (opt: T) => React.ReactNode; renderValue: (val: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm hover:bg-gray-100">
        {renderValue(value)}
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[160px] py-1" style={{ top: pos.top, left: pos.left }}>
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors", opt === value && "bg-blue-50/50")}>
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

// ─── Assignee Picker ──────────────────────────────────────────
function AssigneePicker({ selectedId, onChange, language }: { selectedId?: string; onChange: (id: string | undefined) => void; language: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pos = usePortalPosition(open, triggerRef);
  const { members } = useTeam();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || popupRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = selectedId ? members.find(m => m.id === selectedId) : null;

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-sm hover:bg-gray-100">
        {selected ? (
          <div className="flex items-center gap-1.5">
            {selected.avatar ? <img src={selected.avatar} alt="" className="w-5 h-5 rounded-full ring-1 ring-gray-200 object-cover" /> : null}
            <span className="font-medium text-gray-700">{selected.name}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">{language === 'ko' ? '선택 없음' : 'None'}</span>
        )}
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && pos && createPortal(
        <div ref={popupRef} className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] min-w-[200px] py-1" style={{ top: pos.top, left: pos.left }}>
          <button onClick={() => { onChange(undefined); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-400">
            {language === 'ko' ? '선택 없음' : 'None'}
          </button>
          {members.map(m => (
            <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors", selectedId === m.id && "bg-blue-50/50")}>
              {m.avatar ? <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><Users size={10} className="text-gray-400" /></div>}
              <span className="flex-1 text-left">{m.name}</span>
              {selectedId === m.id && <Check size={14} className="text-blue-600" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Property Row ───────────────────────────────────────────────
function PropertyItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50/80 transition-colors group">
      <div className="flex items-center gap-2 w-[110px] shrink-0 text-gray-400 font-medium text-xs">
        {icon} <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function formatValue(v?: number): string {
  if (!v) return '-';
  if (v >= 100000000) return `${(v / 100000000).toFixed(1)}억`;
  if (v >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
}

// ─── Main Detail Page ───────────────────────────────────────────
export function BizRadarDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const ko = language === 'ko';
  const { getItem, addItem, updateItem, removeItem } = useBizRadar();
  const { members, currentUser } = useTeam();
  const { addTask } = useTaskContext();
  const { moveToTrash } = useTrash();
  const createdRef = useRef(false);

  // Handle /radar/new
  useEffect(() => {
    if (itemId === 'new' && !createdRef.current) {
      createdRef.current = true;
      const id = `biz-${Date.now()}`;
      const now = new Date().toISOString();
      const cat = (searchParams.get('category') as BizCategory) || 'sales';
      const newItem: BizRadarItem = {
        id,
        title: '',
        category: cat,
        type: 'other',
        connectionType: cat === 'connection' ? 'other' : undefined,
        stage: 'discovered',
        assigneeId: currentUser.id,
        actionItems: [],
        createdAt: now,
        updatedAt: now,
      };
      addItem(newItem);
      navigate(`/radar/${id}`, { replace: true });
    }
  }, [itemId]);

  const item = getItem(itemId || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [valueInput, setValueInput] = useState(item?.value?.toString() || '');
  const [probInput, setProbInput] = useState(item?.probability?.toString() || '');
  const [tagsInput, setTagsInput] = useState(item?.tags?.join(', ') || '');

  if (itemId === 'new') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
        <Compass size={40} className="text-gray-300" />
        <p>{ko ? '기회를 찾을 수 없습니다' : 'Opportunity not found'}</p>
        <button onClick={() => navigate('/radar')} className="text-sm text-blue-600 hover:underline">
          {ko ? '비즈 레이더로' : 'Back to Biz Radar'}
        </button>
      </div>
    );
  }

  const isConnection = (item.category || 'sales') === 'connection';
  const handleTitleChange = (v: string) => updateItem(item.id, { title: v });
  const handleStageChange = (s: BizStage) => updateItem(item.id, { stage: s });
  const handleTypeChange = (t: BizType) => updateItem(item.id, { type: t });
  const handleConnectionTypeChange = (t: ConnectionType) => updateItem(item.id, { connectionType: t });
  const handleAssigneeChange = (id: string | undefined) => updateItem(item.id, { assigneeId: id });
  const handleDeadlineChange = (dateStr: string) => {
    updateItem(item.id, { deadline: dateStr ? new Date(dateStr).toISOString() : undefined });
  };
  const handleValueBlur = () => {
    const v = parseInt(valueInput.replace(/[^0-9]/g, ''));
    updateItem(item.id, { value: isNaN(v) ? undefined : v });
  };
  const handleProbBlur = () => {
    const v = parseInt(probInput);
    updateItem(item.id, { probability: isNaN(v) ? undefined : Math.min(100, Math.max(0, v)) });
  };
  const handleTagsBlur = () => {
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    updateItem(item.id, { tags });
  };
  const handleContactNameChange = (v: string) => updateItem(item.id, { contactName: v || undefined });
  const handleContactCompanyChange = (v: string) => updateItem(item.id, { contactCompany: v || undefined });
  const handleSourceChange = (v: string) => updateItem(item.id, { source: v || undefined });

  const saveNotes = () => {
    updateItem(item.id, { notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const addActionItem = () => {
    if (!newActionTitle.trim()) return;
    const ai: BizActionItem = { id: `ai-${Date.now()}`, title: newActionTitle.trim(), assigneeId: newActionAssignee || undefined, done: false };
    updateItem(item.id, { actionItems: [...item.actionItems, ai] });
    setNewActionTitle('');
    setNewActionAssignee('');
  };

  const toggleActionDone = (aiId: string) => {
    updateItem(item.id, { actionItems: item.actionItems.map(a => a.id === aiId ? { ...a, done: !a.done } : a) });
  };

  const removeActionItem = (aiId: string) => {
    updateItem(item.id, { actionItems: item.actionItems.filter(a => a.id !== aiId) });
  };

  const convertToTask = (ai: BizActionItem) => {
    const taskId = `t${Date.now()}`;
    addTask({ id: taskId, title: ai.title, status: ai.done ? 'completed' : 'pending', progress: ai.done ? 100 : 0, level: 'Month' as any, assigneeId: ai.assigneeId } as any);
    updateItem(item.id, { actionItems: item.actionItems.map(a => a.id === ai.id ? { ...a, linkedTaskId: taskId } : a) });
  };

  const handleDelete = () => {
    if (!confirm(ko ? '이 기회를 삭제하시겠습니까?' : 'Delete this opportunity?')) return;
    moveToTrash({ id: item.id, type: 'radar', title: item.title, data: item, deletedAt: new Date().toISOString() });
    removeItem(item.id);
    navigate('/radar');
  };

  const deadlineLocal = item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : '';

  return (
    <div className="h-full overflow-y-auto bg-white scrollbar-hide">
      <div className="max-w-6xl mx-auto py-4 sm:py-7 px-4 sm:px-8 pb-32">

        {/* Navigation & Actions */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/radar')} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {ko ? '비즈 레이더' : 'Biz Radar'}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="max-w-3xl">
          <div className="space-y-6">

            {/* Category Badge */}
            {isConnection && (
              <div className="flex items-center gap-1.5 mb-1">
                <Link2 size={14} className="text-purple-500" />
                <span className="text-xs font-semibold text-purple-600">{ko ? '연결' : 'Connection'}</span>
              </div>
            )}

            {/* Title */}
            <InlineTitle value={item.title} onChange={handleTitleChange}
              placeholder={ko
                ? (isConnection ? '연결 제목' : '기회 제목')
                : (isConnection ? 'Connection Title' : 'Opportunity Title')} />

            {/* Properties */}
            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <PropertyItem icon={<Compass size={14} />} label={ko ? '단계' : 'Stage'}>
                <InlineDropdown
                  value={item.stage}
                  options={['discovered', 'reviewing', 'proposal', 'negotiation', 'won', 'lost'] as BizStage[]}
                  onChange={handleStageChange}
                  renderValue={(v) => {
                    const cfg = STAGE_CONFIG[v];
                    return <span className={cn("flex items-center gap-1.5 font-bold", cfg.color)}>{cfg.icon} {ko ? cfg.labelKo : cfg.label}</span>;
                  }}
                  renderOption={(o) => <span className={cn("flex items-center gap-2", STAGE_CONFIG[o].color)}>{STAGE_CONFIG[o].icon} {ko ? STAGE_CONFIG[o].labelKo : STAGE_CONFIG[o].label}</span>}
                />
              </PropertyItem>

              <PropertyItem icon={<Tag size={14} />} label={ko ? '유형' : 'Type'}>
                {isConnection ? (
                  <InlineDropdown
                    value={item.connectionType || 'other'}
                    options={['agent', 'distributor', 'supplier', 'partner', 'client', 'other'] as ConnectionType[]}
                    onChange={handleConnectionTypeChange}
                    renderValue={(v) => {
                      const cfg = CONNECTION_TYPE_CONFIG[v];
                      return <span className={cn("px-2 py-0.5 rounded-md font-bold", cfg.bg, cfg.color)}>{ko ? cfg.labelKo : cfg.label}</span>;
                    }}
                    renderOption={(o) => <span className={CONNECTION_TYPE_CONFIG[o].color}>{ko ? CONNECTION_TYPE_CONFIG[o].labelKo : CONNECTION_TYPE_CONFIG[o].label}</span>}
                  />
                ) : (
                  <InlineDropdown
                    value={item.type}
                    options={['project', 'funding', 'partnership', 'investment', 'other'] as BizType[]}
                    onChange={handleTypeChange}
                    renderValue={(v) => <span className={cn("px-2 py-0.5 rounded-md font-bold", TYPE_CONFIG[v].bg, TYPE_CONFIG[v].color)}>{ko ? TYPE_CONFIG[v].labelKo : TYPE_CONFIG[v].label}</span>}
                    renderOption={(o) => <span className={TYPE_CONFIG[o].color}>{ko ? TYPE_CONFIG[o].labelKo : TYPE_CONFIG[o].label}</span>}
                  />
                )}
              </PropertyItem>

              <PropertyItem icon={<DollarSign size={14} />} label={ko ? '예상 가치' : 'Value'}>
                <input
                  value={valueInput}
                  onChange={(e) => setValueInput(e.target.value)}
                  onBlur={handleValueBlur}
                  placeholder={ko ? '예: 50000000' : 'e.g. 50000000'}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-full max-w-[200px]"
                />
              </PropertyItem>

              <PropertyItem icon={<Percent size={14} />} label={ko ? '확률' : 'Probability'}>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={100}
                    value={probInput}
                    onChange={(e) => setProbInput(e.target.value)}
                    onBlur={handleProbBlur}
                    placeholder="0-100"
                    className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-20"
                  />
                  <span className="text-xs text-gray-400">%</span>
                  {item.value && item.probability ? (
                    <span className="text-[10px] text-gray-400 ml-2">
                      {ko ? '가중 가치' : 'Weighted'}: {formatValue(item.value * item.probability / 100)}
                    </span>
                  ) : null}
                </div>
              </PropertyItem>

              <PropertyItem icon={<Calendar size={14} />} label={ko ? '마감일' : 'Deadline'}>
                <input
                  type="date"
                  value={deadlineLocal}
                  onChange={(e) => handleDeadlineChange(e.target.value)}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700"
                />
              </PropertyItem>

              <PropertyItem icon={<UserIcon size={14} />} label={ko ? '담당자' : 'Assignee'}>
                <AssigneePicker selectedId={item.assigneeId} onChange={handleAssigneeChange} language={language} />
              </PropertyItem>

              <PropertyItem icon={<Building2 size={14} />} label={ko ? '거래처' : 'Company'}>
                <input
                  value={item.contactCompany || ''}
                  onChange={(e) => handleContactCompanyChange(e.target.value)}
                  placeholder={ko ? '회사명' : 'Company name'}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-full"
                />
              </PropertyItem>

              <PropertyItem icon={<UserIcon size={14} />} label={ko ? '담당자명' : 'Contact'}>
                <input
                  value={item.contactName || ''}
                  onChange={(e) => handleContactNameChange(e.target.value)}
                  placeholder={ko ? '상대방 담당자' : 'Contact person'}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-full"
                />
              </PropertyItem>

              <PropertyItem icon={<Compass size={14} />} label={ko ? '출처' : 'Source'}>
                <input
                  value={item.source || ''}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  placeholder={ko ? '예: 소개, 웹사이트, 박람회' : 'e.g. Referral, Website'}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-full"
                />
              </PropertyItem>

              <PropertyItem icon={<Tag size={14} />} label={ko ? '태그' : 'Tags'}>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onBlur={handleTagsBlur}
                  placeholder={ko ? '쉼표로 구분' : 'Comma separated'}
                  className="px-2 py-1 rounded-md text-sm bg-transparent hover:bg-gray-100 focus:bg-gray-100 outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-medium text-gray-700 placeholder-gray-300 w-full"
                />
              </PropertyItem>
            </div>

            {/* Action Items */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 size={14} className="text-gray-400" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  {ko ? '액션 아이템' : 'Action Items'}
                </span>
                <span className="text-[11px] text-gray-300 ml-auto">
                  {item.actionItems.filter(a => a.done).length}/{item.actionItems.length}
                </span>
              </div>

              {item.actionItems.length > 0 && (
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${item.actionItems.length > 0 ? (item.actionItems.filter(a => a.done).length / item.actionItems.length) * 100 : 0}%` }}
                  />
                </div>
              )}

              <div className="space-y-0.5">
                {item.actionItems.map(ai => (
                  <div key={ai.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                    <button
                      onClick={() => toggleActionDone(ai.id)}
                      className={cn(
                        "shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all",
                        ai.done ? "bg-blue-500 border-blue-500" : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {ai.done && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", ai.done ? "text-gray-400 line-through" : "text-gray-700")}>{ai.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {ai.assigneeId && <span className="text-[10px] text-gray-400">{members.find(m => m.id === ai.assigneeId)?.name}</span>}
                        {ai.linkedTaskId ? (
                          <span className="text-[10px] text-blue-500 flex items-center gap-0.5"><Check size={9} /> {ko ? '태스크 연결됨' : 'Linked'}</span>
                        ) : (
                          <button onClick={() => convertToTask(ai)} className="text-[10px] text-gray-400 hover:text-blue-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRightCircle size={10} /> {ko ? '태스크로 변환' : 'Convert to task'}
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeActionItem(ai.id)} className="p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add action item */}
              <div className="flex gap-2 px-2">
                <input
                  value={newActionTitle}
                  onChange={e => setNewActionTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addActionItem()}
                  placeholder={ko ? '액션 아이템 추가...' : 'Add action item...'}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newActionAssignee}
                  onChange={e => setNewActionAssignee(e.target.value)}
                  className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[100px]"
                >
                  <option value="">{ko ? '담당자' : 'Assign'}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button
                  onClick={addActionItem}
                  disabled={!newActionTitle.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="min-h-[200px] border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{ko ? '메모' : 'Notes'}</span>
                <button
                  onClick={saveNotes}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    notesSaved ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                >
                  {notesSaved ? (ko ? '저장됨!' : 'Saved!') : (ko ? '저장' : 'Save')}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={ko ? '기회에 대한 메모를 작성하세요...' : 'Write notes about this opportunity...'}
                className="w-full text-sm text-gray-700 placeholder-gray-300 resize-none focus:outline-none bg-transparent leading-relaxed min-h-[200px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
