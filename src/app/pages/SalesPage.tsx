import React, { useState, useEffect, useRef } from "react";
import {
  DollarSign, Plus, Search, Users, FileText, BarChart3,
  MoreHorizontal, X, Trash2, ChevronLeft, Edit2, Phone, Mail,
  TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronDown,
  Clock, Wallet, Check, CircleDot, Send, Upload,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../../lib/api";
import { NotionBlockEditor } from "../components/NotionBlockEditor";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────
interface Payment {
  id: string; type: "advance" | "interim" | "final"; label: string;
  amount: number; status: "pending" | "invoiced" | "paid"; paidAt?: string; note?: string;
}

interface Client {
  id: string; name: string; company: string; stage: string; value: number;
  contactName?: string; contactEmail?: string; contactPhone?: string;
  notes?: string; projectId?: string; payments?: Payment[]; memoContent?: string; createdAt?: Date; updatedAt?: Date;
}

interface Estimate {
  id: string; clientId: string; title: string; status: string;
  items: { name: string; qty: number; unitPrice: number }[];
  totalAmount: number; discountRate: number; notes?: string;
  clientName?: string; clientCompany?: string; createdAt?: Date;
}

const STAGES = [
  { id: "inquiry", labelKo: "문의", labelEn: "Inquiry", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "proposal", labelKo: "제안/견적", labelEn: "Proposal", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "negotiation", labelKo: "협상 중", labelEn: "Negotiation", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "contract", labelKo: "계약 검토", labelEn: "Contract", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "won", labelKo: "계약 완료", labelEn: "Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "lost", labelKo: "실패", labelEn: "Lost", color: "bg-gray-100 text-gray-500 border-gray-200" },
];

const EST_STATUS = [
  { id: "draft", labelKo: "초안", labelEn: "Draft", color: "bg-gray-100 text-gray-600" },
  { id: "sent", labelKo: "발송", labelEn: "Sent", color: "bg-blue-100 text-blue-700" },
  { id: "accepted", labelKo: "수락", labelEn: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  { id: "rejected", labelKo: "거절", labelEn: "Rejected", color: "bg-red-100 text-red-600" },
];

// ─── Stage Pill (clickable button with popover) ─────────────────
function StagePill({ currentStage, onChange, ko }: { currentStage: string; onChange: (stage: string) => void; ko: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  const stage = STAGES.find(s => s.id === currentStage);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 220);
    }
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-all hover:shadow-sm flex items-center gap-1", stage?.color)}>
        {ko ? stage?.labelKo : stage?.labelEn}
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn("absolute left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[130px]",
          dropUp ? "bottom-full mb-1" : "top-full mt-1")}>
          {STAGES.map(s => (
            <button key={s.id} onClick={() => { onChange(s.id); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-xs font-medium flex items-center gap-2 hover:bg-gray-50",
                s.id === currentStage && "bg-gray-50")}>
              <span className={cn("w-2 h-2 rounded-full", s.color.split(" ")[0].replace("100", "500"))} />
              {ko ? s.labelKo : s.labelEn}
              {s.id === currentStage && <span className="ml-auto text-blue-500">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Client Dialog ──────────────────────────────────────────────
function ClientDialog({ open, onClose, onSave, client, ko }: {
  open: boolean; onClose: () => void; onSave: (d: Partial<Client>) => void; client?: Client | null; ko: boolean;
}) {
  const [name, setName] = useState(""); const [company, setCompany] = useState("");
  const [stage, setStage] = useState("inquiry"); const [value, setValue] = useState("");
  const [contactName, setContactName] = useState(""); const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState(""); const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) {
    setName(client?.name || ""); setCompany(client?.company || ""); setStage(client?.stage || "inquiry");
    setValue(client?.value?.toString() || ""); setContactName(client?.contactName || "");
    setContactEmail(client?.contactEmail || ""); setContactPhone(client?.contactPhone || "");
    setNotes(client?.notes || "");
  }}, [open, client]);

  if (!open) return null;
  const handleSave = async () => {
    if (!name.trim()) return; setSaving(true);
    await onSave({ name: name.trim(), company: company.trim(), stage, value: parseInt(value) || 0,
      contactName: contactName.trim() || undefined, contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined, notes: notes.trim() || undefined });
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold">{client ? (ko ? "클라이언트 수정" : "Edit") : (ko ? "클라이언트 추가" : "Add Client")}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "프로젝트/건명 *" : "Project *"}</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder={ko ? "예: 쇼핑몰 앱 개발" : "e.g. App Dev"}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "회사/클라이언트명" : "Company"}</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder={ko ? "예: 패션브랜드Z" : "e.g. Brand Z"}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "영업 단계" : "Stage"}</label>
              <select value={stage} onChange={e => setStage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                {STAGES.map(s => <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "예상 매출 (원)" : "Value"}</label>
              <input value={value} onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{ko ? "담당자 정보" : "Contact"}</p>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder={ko ? "담당자 이름" : "Name"}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none mb-2" />
            <div className="grid grid-cols-2 gap-3">
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder={ko ? "이메일" : "Email"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder={ko ? "전화번호" : "Phone"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "메모" : "Notes"}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={ko ? "추가 메모..." : "Notes..."}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none" />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">{ko ? "취소" : "Cancel"}</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold", !name.trim() || saving ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700")}>
            {saving ? "..." : (ko ? "저장" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Estimate Dialog ────────────────────────────────────────────
function EstimateDialog({ open, onClose, onSave, clients, estimate, ko }: {
  open: boolean; onClose: () => void; onSave: (d: any) => void; clients: Client[]; estimate?: Estimate | null; ko: boolean;
}) {
  const [title, setTitle] = useState(""); const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("draft"); const [discountRate, setDiscountRate] = useState("0");
  const [items, setItems] = useState<{ name: string; qty: number; unitPrice: number }[]>([{ name: "", qty: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) {
    setTitle(estimate?.title || ""); setClientId(estimate?.clientId || clients[0]?.id || "");
    setStatus(estimate?.status || "draft"); setDiscountRate(estimate?.discountRate?.toString() || "0");
    setItems(estimate?.items?.length ? estimate.items : [{ name: "", qty: 1, unitPrice: 0 }]);
    setNotes(estimate?.notes || "");
  }}, [open, estimate, clients]);

  if (!open) return null;
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = Math.round(subtotal * (1 - (parseInt(discountRate) || 0) / 100));

  const addItem = () => setItems([...items, { name: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, val: any) => {
    const next = [...items]; (next[idx] as any)[field] = val; setItems(next);
  };

  const handleSave = async () => {
    if (!title.trim()) return; setSaving(true);
    await onSave({ title: title.trim(), clientId: clientId || null, status, items: items.filter(i => i.name.trim()),
      totalAmount: total, discountRate: parseInt(discountRate) || 0, notes: notes.trim() || undefined });
    setSaving(false); onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold">{estimate ? (ko ? "견적서 수정" : "Edit") : (ko ? "견적서 작성" : "New Estimate")}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "견적서 제목 *" : "Title *"}</label>
              <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder={ko ? "예: 쇼핑몰 앱 개발 견적" : "e.g. App Dev Estimate"}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "클라이언트" : "Client"}</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none">
                <option value="">{ko ? "선택 안함" : "None"}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>)}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{ko ? "항목" : "Items"}</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} placeholder={ko ? "항목명" : "Item"}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none" />
                  <input value={item.qty} onChange={e => updateItem(idx, "qty", parseInt(e.target.value) || 0)} type="number" min={1}
                    className="w-16 px-2 py-2 rounded-lg border border-gray-200 text-sm outline-none text-center" />
                  <input value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseInt(e.target.value) || 0)} type="number"
                    placeholder={ko ? "단가" : "Price"} className="w-28 px-2 py-2 rounded-lg border border-gray-200 text-sm outline-none text-right" />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus size={12} /> {ko ? "항목 추가" : "Add Item"}
            </button>
          </div>

          {/* Discount + Total */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{ko ? "소계" : "Subtotal"}</span>
              <span className="font-medium">{subtotal.toLocaleString()}{ko ? "원" : ""}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{ko ? "할인율" : "Discount"}</span>
              <div className="flex items-center gap-1">
                <input value={discountRate} onChange={e => setDiscountRate(e.target.value.replace(/[^0-9]/g, ""))}
                  className="w-12 px-2 py-1 rounded-lg border border-gray-200 text-sm text-right outline-none" />
                <span className="text-gray-500">%</span>
              </div>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
              <span>{ko ? "합계" : "Total"}</span>
              <span className="text-blue-600">{total.toLocaleString()}{ko ? "원" : ""}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "상태" : "Status"}</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none">
                {EST_STATUS.map(s => <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>)}
              </select>
            </div>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={ko ? "메모..." : "Notes..."}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none" />
        </div>
        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">{ko ? "취소" : "Cancel"}</button>
          <button onClick={handleSave} disabled={!title.trim() || saving}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold", !title.trim() || saving ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700")}>
            {saving ? "..." : (ko ? "저장" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Client Detail ──────────────────────────────────────────────
function ClientDetail({ client, estimates, onBack, onEdit, onStageChange, onPaymentsUpdate, onMemoUpdate, ko }: {
  client: Client; estimates: Estimate[]; onBack: () => void; onEdit: () => void; onStageChange: (stage: string) => void; onPaymentsUpdate: (payments: Payment[]) => void; onMemoUpdate: (content: string) => void; ko: boolean;
}) {
  const [detailTab, setDetailTab] = useState<"overview" | "estimates" | "payments" | "memos" | "activity">("overview");
  const clientEstimates = estimates.filter(e => e.clientId === client.id);
  const estimateTotal = clientEstimates.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const acceptedTotal = clientEstimates.filter(e => e.status === "accepted").reduce((s, e) => s + (e.totalAmount || 0), 0);

  // Build activity timeline from available data
  const activities: { date: string; type: string; title: string; detail?: string }[] = [];
  if (client.createdAt) activities.push({ date: new Date(client.createdAt).toISOString(), type: "created", title: ko ? "클라이언트 등록" : "Client created", detail: client.company || undefined });
  clientEstimates.forEach(est => {
    if (est.createdAt) activities.push({ date: new Date(est.createdAt).toISOString(), type: "estimate", title: est.title, detail: `${(est.totalAmount || 0).toLocaleString()}${ko ? "원" : ""}` });
  });
  if (client.updatedAt && client.createdAt && new Date(client.updatedAt).getTime() - new Date(client.createdAt).getTime() > 60000) {
    activities.push({ date: new Date(client.updatedAt).toISOString(), type: "updated", title: ko ? "정보 수정" : "Info updated" });
  }
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const payments: Payment[] = client.payments || [];
  const paidTotal = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPayments = payments.reduce((s, p) => s + p.amount, 0);

  const PAYMENT_TYPES = [
    { type: "advance" as const, label: ko ? "착수금" : "Advance", defaultPct: 30 },
    { type: "interim" as const, label: ko ? "중도금" : "Progress", defaultPct: 40 },
    { type: "final" as const, label: ko ? "완수금" : "Final", defaultPct: 30 },
  ];

  const initPayments = () => {
    const base = client.value || estimateTotal || 0;
    const newPayments: Payment[] = PAYMENT_TYPES.map(pt => ({
      id: crypto.randomUUID(),
      type: pt.type,
      label: pt.label,
      amount: Math.round(base * pt.defaultPct / 100),
      status: "pending" as const,
    }));
    onPaymentsUpdate(newPayments);
  };

  const updatePayment = (id: string, updates: Partial<Payment>) => {
    const next = payments.map(p => p.id === id ? { ...p, ...updates } : p);
    onPaymentsUpdate(next);
  };

  const addPayment = () => {
    const newP: Payment = { id: crypto.randomUUID(), type: "interim", label: ko ? "추가 대금" : "Additional", amount: 0, status: "pending" };
    onPaymentsUpdate([...payments, newP]);
  };

  const removePayment = (id: string) => {
    onPaymentsUpdate(payments.filter(p => p.id !== id));
  };

  const detailTabs = [
    { id: "overview" as const, label: ko ? "개요" : "Overview" },
    { id: "estimates" as const, label: ko ? `견적서 (${clientEstimates.length})` : `Estimates (${clientEstimates.length})` },
    { id: "payments" as const, label: ko ? "대금" : "Payments" },
    { id: "memos" as const, label: ko ? "메모" : "Memo" },
    { id: "activity" as const, label: ko ? "활동 기록" : "Activity" },
  ];

  return (
    <div className="max-w-4xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ChevronLeft size={16} /> {ko ? "클라이언트 목록" : "Clients"}
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            {client.company && <p className="text-sm text-gray-500 mt-0.5">{client.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StagePill currentStage={client.stage} onChange={onStageChange} ko={ko} />
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Edit2 size={16} />
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">{ko ? "전체 금액" : "Total"}</p>
            <p className="text-lg font-bold text-gray-900">{(client.value || 0).toLocaleString()}<span className="text-xs font-normal text-gray-400">{ko ? "원" : ""}</span></p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">{ko ? "수령 금액" : "Received"}</p>
            <p className="text-lg font-bold text-emerald-600">{paidTotal.toLocaleString()}<span className="text-xs font-normal text-gray-400">{ko ? "원" : ""}</span></p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">{ko ? "남은 금액" : "Remaining"}</p>
            <p className={cn("text-lg font-bold", (totalPayments - paidTotal) > 0 ? "text-amber-600" : "text-gray-400")}>{(totalPayments - paidTotal).toLocaleString()}<span className="text-xs font-normal text-gray-400">{ko ? "원" : ""}</span></p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-semibold text-gray-400 mb-0.5">{ko ? "담당자" : "Contact"}</p>
            <p className="text-sm font-medium text-gray-900 truncate">{client.contactName || "-"}</p>
            {client.contactPhone && <p className="text-[10px] text-gray-400 truncate">{client.contactPhone}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {detailTabs.map(tab => (
          <button key={tab.id} onClick={() => setDetailTab(tab.id)}
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px",
              detailTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {detailTab === "overview" && (
        <div className="space-y-4">
          {/* Contact Info */}
          {(client.contactName || client.contactEmail || client.contactPhone) && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">{ko ? "담당자 정보" : "Contact Info"}</h3>
              <div className="space-y-2">
                {client.contactName && <p className="text-sm text-gray-900 font-medium">{client.contactName}</p>}
                {client.contactEmail && (
                  <p className="text-sm text-gray-600 flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {client.contactEmail}</p>
                )}
                {client.contactPhone && (
                  <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {client.contactPhone}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">{ko ? "메모" : "Notes"}</h3>
            {client.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">{ko ? "메모가 없습니다. 수정 버튼을 눌러 추가하세요." : "No notes yet. Click edit to add."}</p>
            )}
          </div>

          {/* Quick estimate summary */}
          {clientEstimates.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase">{ko ? "최근 견적서" : "Recent Estimates"}</h3>
                <button onClick={() => setDetailTab("estimates")} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                  {ko ? "전체 보기" : "View all"} <ChevronRight size={12} />
                </button>
              </div>
              {clientEstimates.slice(0, 3).map(est => {
                const st = EST_STATUS.find(s => s.id === est.status);
                return (
                  <div key={est.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{est.title}</p>
                      <p className="text-xs text-gray-500">{(est.totalAmount || 0).toLocaleString()}{ko ? "원" : ""}</p>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", st?.color)}>{ko ? st?.labelKo : st?.labelEn}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Estimates Tab */}
      {detailTab === "estimates" && (
        <div>
          {clientEstimates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              {ko ? "이 클라이언트에 연결된 견적서가 없습니다" : "No estimates linked to this client"}
            </div>
          ) : (
            <div className="space-y-3">
              {clientEstimates.map(est => {
                const st = EST_STATUS.find(s => s.id === est.status);
                return (
                  <div key={est.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{est.title}</p>
                        {est.createdAt && <p className="text-xs text-gray-400 mt-0.5">{new Date(est.createdAt).toLocaleDateString()}</p>}
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", st?.color)}>{ko ? st?.labelKo : st?.labelEn}</span>
                    </div>
                    {est.items && est.items.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-2">
                        {est.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1">
                            <span className="text-gray-600">{item.name} × {item.qty}</span>
                            <span className="text-gray-900 font-medium">{(item.qty * item.unitPrice).toLocaleString()}{ko ? "원" : ""}</span>
                          </div>
                        ))}
                        {est.discountRate > 0 && (
                          <div className="flex justify-between text-xs py-1 text-red-500 border-t border-gray-200 mt-1 pt-1">
                            <span>{ko ? "할인" : "Discount"}</span><span>-{est.discountRate}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold py-1 border-t border-gray-200 mt-1 pt-1">
                          <span>{ko ? "합계" : "Total"}</span>
                          <span className="text-blue-600">{(est.totalAmount || 0).toLocaleString()}{ko ? "원" : ""}</span>
                        </div>
                      </div>
                    )}
                    {est.notes && <p className="text-xs text-gray-500 mt-2 italic">{est.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {detailTab === "payments" && (
        <div>
          {payments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Wallet size={28} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-3">{ko ? "대금 항목이 없습니다" : "No payment items yet"}</p>
              <button onClick={initPayments}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
                {ko ? "착수금 / 중도금 / 완수금 자동 생성" : "Auto-generate payment milestones"}
              </button>
              <p className="text-[10px] text-gray-400 mt-2">{ko ? `예상 매출 ${(client.value || 0).toLocaleString()}원 기준 30/40/30 분배` : `Based on ${(client.value || 0).toLocaleString()} value, 30/40/30 split`}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{ko ? "수금 현황" : "Collection Status"}</h3>
                  <p className="text-xs text-gray-500">
                    {ko ? `${paidTotal.toLocaleString()}원 / ${totalPayments.toLocaleString()}원 수금` : `${paidTotal.toLocaleString()} / ${totalPayments.toLocaleString()} collected`}
                  </p>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  {payments.map(p => {
                    const pct = totalPayments > 0 ? (p.amount / totalPayments) * 100 : 0;
                    return (
                      <div key={p.id} style={{ width: `${pct}%` }}
                        className={cn("h-full transition-all",
                          p.status === "paid" ? "bg-emerald-500" : p.status === "invoiced" ? "bg-blue-400" : "bg-gray-300")} />
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{ko ? "수금 완료" : "Paid"}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />{ko ? "청구 완료" : "Invoiced"}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />{ko ? "대기" : "Pending"}</span>
                </div>
              </div>

              {/* Payment items */}
              {payments.map((p, idx) => {
                const statusInfo = p.status === "paid"
                  ? { bg: "border-emerald-200 bg-emerald-50/30", badge: "bg-emerald-100 text-emerald-700", badgeLabel: ko ? "수금 완료" : "Paid" }
                  : p.status === "invoiced"
                  ? { bg: "border-blue-200 bg-blue-50/30", badge: "bg-blue-100 text-blue-700", badgeLabel: ko ? "청구 완료" : "Invoiced" }
                  : { bg: "border-gray-200 bg-white", badge: "bg-gray-100 text-gray-500", badgeLabel: ko ? "대기 중" : "Pending" };
                return (
                  <div key={p.id} className={cn("rounded-xl border p-4 transition-colors", statusInfo.bg)}>
                    {/* Top row: label + status badge + delete */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          p.status === "paid" ? "bg-emerald-500 text-white" : p.status === "invoiced" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500")}>
                          {p.status === "paid" ? <Check size={14} /> : idx + 1}
                        </div>
                        <div>
                          <input value={p.label} onChange={e => updatePayment(p.id, { label: e.target.value })}
                            className="text-sm font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-blue-400" />
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {p.type === "advance" ? (ko ? "착수금" : "Advance") : p.type === "interim" ? (ko ? "중도금" : "Progress") : (ko ? "완수금" : "Final")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", statusInfo.badge)}>{statusInfo.badgeLabel}</span>
                        <button onClick={() => removePayment(p.id)} className="p-1 text-gray-300 hover:text-red-400"><X size={14} /></button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <input value={p.amount.toLocaleString()} onChange={e => updatePayment(p.id, { amount: parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
                          className="text-2xl font-bold text-gray-900 bg-transparent outline-none w-40 border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400" />
                        <span className="text-sm text-gray-400">{ko ? "원" : ""}</span>
                      </div>
                    </div>

                    {/* Status buttons - full text labels */}
                    <div className="flex gap-2">
                      {([
                        { id: "pending" as const, label: ko ? "대기" : "Pending", icon: <CircleDot size={13} />,
                          active: "bg-gray-200 text-gray-700 border-gray-300", inactive: "bg-white text-gray-400 border-gray-200 hover:bg-gray-50" },
                        { id: "invoiced" as const, label: ko ? "청구 완료" : "Invoiced", icon: <Send size={13} />,
                          active: "bg-blue-100 text-blue-700 border-blue-300", inactive: "bg-white text-gray-400 border-gray-200 hover:bg-blue-50" },
                        { id: "paid" as const, label: ko ? "수금 완료" : "Paid", icon: <Check size={13} />,
                          active: "bg-emerald-100 text-emerald-700 border-emerald-300", inactive: "bg-white text-gray-400 border-gray-200 hover:bg-emerald-50" },
                      ] as const).map(st => (
                        <button key={st.id}
                          onClick={() => updatePayment(p.id, { status: st.id, ...(st.id === "paid" ? { paidAt: new Date().toISOString() } : { paidAt: undefined }) })}
                          className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                            p.status === st.id ? st.active : st.inactive)}>
                          {st.icon} {st.label}
                        </button>
                      ))}
                    </div>

                    {p.paidAt && p.status === "paid" && (
                      <p className="text-[10px] text-emerald-600 mt-2 flex items-center gap-1">
                        <Check size={10} /> {ko ? "수금일" : "Paid on"}: {new Date(p.paidAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}

              <button onClick={addPayment}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-1">
                <Plus size={14} /> {ko ? "대금 항목 추가" : "Add payment item"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Memos Tab */}
      {detailTab === "memos" && (
        <div className="min-h-[400px]">
          <NotionBlockEditor
            value={client.memoContent || ""}
            onChange={onMemoUpdate}
            placeholder={ko ? "'/' 를 입력하여 블록을 추가하세요 (미팅 노트, 진행 상황, 특이사항 등)" : "Type '/' for blocks..."}
            language={ko ? "ko" : "en"}
          />
        </div>
      )}

      {/* Activity Tab */}
      {detailTab === "activity" && (
        <div>
          {activities.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              {ko ? "활동 기록이 없습니다" : "No activity yet"}
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200" />
              {activities.map((act, idx) => (
                <div key={idx} className="relative mb-4 last:mb-0">
                  <div className={cn("absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white",
                    act.type === "created" ? "bg-emerald-100" : act.type === "estimate" ? "bg-blue-100" : "bg-gray-100")}>
                    {act.type === "created" ? <Plus size={10} className="text-emerald-600" />
                      : act.type === "estimate" ? <FileText size={10} className="text-blue-600" />
                      : <Clock size={10} className="text-gray-500" />}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-3 ml-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{act.title}</p>
                      <p className="text-[10px] text-gray-400">{new Date(act.date).toLocaleDateString()}</p>
                    </div>
                    {act.detail && <p className="text-xs text-gray-500 mt-0.5">{act.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Revenue Tab ────────────────────────────────────────────────
function RevenueTab({ clients, estimates, ko }: { clients: Client[]; estimates: Estimate[]; ko: boolean }) {
  const wonClients = clients.filter(c => c.stage === "won");
  const totalRevenue = wonClients.reduce((s, c) => s + (c.value || 0), 0);
  const pipelineValue = clients.filter(c => !["won", "lost"].includes(c.stage)).reduce((s, c) => s + (c.value || 0), 0);
  const lostValue = clients.filter(c => c.stage === "lost").reduce((s, c) => s + (c.value || 0), 0);
  const acceptedEstimates = estimates.filter(e => e.status === "accepted");
  const totalEstimated = acceptedEstimates.reduce((s, e) => s + (e.totalAmount || 0), 0);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><TrendingUp size={16} className="text-emerald-600" /></div>
            <span className="text-xs text-gray-500">{ko ? "계약 완료 매출" : "Won Revenue"}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()}<span className="text-sm font-normal text-gray-500">{ko ? "원" : ""}</span></p>
          <p className="text-xs text-emerald-600 mt-1">{wonClients.length}{ko ? "건" : " deals"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center"><ArrowUpRight size={16} className="text-blue-600" /></div>
            <span className="text-xs text-gray-500">{ko ? "진행 중 파이프라인" : "Pipeline"}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pipelineValue.toLocaleString()}<span className="text-sm font-normal text-gray-500">{ko ? "원" : ""}</span></p>
          <p className="text-xs text-blue-600 mt-1">{clients.filter(c => !["won", "lost"].includes(c.stage)).length}{ko ? "건 진행 중" : " active"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><FileText size={16} className="text-amber-600" /></div>
            <span className="text-xs text-gray-500">{ko ? "수락된 견적" : "Accepted Estimates"}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalEstimated.toLocaleString()}<span className="text-sm font-normal text-gray-500">{ko ? "원" : ""}</span></p>
          <p className="text-xs text-amber-600 mt-1">{acceptedEstimates.length}{ko ? "건" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center"><ArrowDownRight size={16} className="text-red-500" /></div>
            <span className="text-xs text-gray-500">{ko ? "실패" : "Lost"}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{lostValue.toLocaleString()}<span className="text-sm font-normal text-gray-500">{ko ? "원" : ""}</span></p>
          <p className="text-xs text-red-500 mt-1">{clients.filter(c => c.stage === "lost").length}{ko ? "건" : ""}</p>
        </div>
      </div>

      {/* Won Clients List */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{ko ? "계약 완료 목록" : "Won Deals"}</h3>
      {wonClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          {ko ? "아직 계약 완료된 건이 없습니다" : "No won deals yet"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "프로젝트" : "Project"}</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "회사" : "Company"}</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "매출" : "Value"}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {wonClients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.company || "-"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">{(c.value || 0).toLocaleString()}{ko ? "원" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Sales Page ────────────────────────────────────────────
export function SalesPage() {
  const { language } = useLanguage();
  const { currentOrg } = useWorkspace();
  const ko = language === "ko";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"clients" | "estimates" | "revenue">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [estimateDialogOpen, setEstimateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getClients(), api.getEstimates()])
      .then(([c, e]) => { setClients(c); setEstimates(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentOrg]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleAddClient = async (d: Partial<Client>) => { const c = await api.createClient(d); setClients(p => [c, ...p]); };
  const handleEditClient = async (d: Partial<Client>) => { if (!editingClient) return; const u = await api.updateClient(editingClient.id, d); setClients(p => p.map(c => c.id === editingClient.id ? u : c)); setEditingClient(null); };
  const handleDeleteClient = async (id: string) => { await api.deleteClient(id); setClients(p => p.filter(c => c.id !== id)); setMenuOpenId(null); };
  const handleStageChange = async (id: string, stage: string) => { const u = await api.updateClient(id, { stage }); setClients(p => p.map(c => c.id === id ? u : c)); if (selectedClient?.id === id) setSelectedClient(u); };
  const handleAddEstimate = async (d: any) => { const e = await api.createEstimate(d); setEstimates(p => [e, ...p]); };
  const handleEditEstimate = async (d: any) => { if (!editingEstimate) return; const u = await api.updateEstimate(editingEstimate.id, d); setEstimates(p => p.map(e => e.id === editingEstimate.id ? u : e)); setEditingEstimate(null); };
  const handleDeleteEstimate = async (id: string) => { await api.deleteEstimate(id); setEstimates(p => p.filter(e => e.id !== id)); };

  // Excel/CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState<{ headers: string[]; rows: any[]; mapping: Record<string, string> } | null>(null);

  const FIELD_OPTIONS = [
    { value: "", labelKo: "-- 건너뛰기 --", labelEn: "-- Skip --" },
    { value: "name", labelKo: "건명/프로젝트", labelEn: "Project Name" },
    { value: "company", labelKo: "회사", labelEn: "Company" },
    { value: "stage", labelKo: "단계", labelEn: "Stage" },
    { value: "value", labelKo: "금액", labelEn: "Value" },
    { value: "contactName", labelKo: "담당자", labelEn: "Contact Name" },
    { value: "contactEmail", labelKo: "이메일", labelEn: "Email" },
    { value: "contactPhone", labelKo: "전화번호", labelEn: "Phone" },
    { value: "notes", labelKo: "메모", labelEn: "Notes" },
  ];

  const HEADER_GUESS: Record<string, string> = {
    "건명": "name", "프로젝트": "name", "프로젝트명": "name", "이름": "name", "name": "name", "project": "name", "title": "name",
    "회사": "company", "회사명": "company", "클라이언트": "company", "company": "company", "client": "company",
    "단계": "stage", "상태": "stage", "stage": "stage", "status": "stage",
    "금액": "value", "매출": "value", "예상매출": "value", "계약금액": "value", "value": "value", "amount": "value",
    "담당자": "contactName", "담당자명": "contactName", "contact": "contactName",
    "이메일": "contactEmail", "메일": "contactEmail", "email": "contactEmail",
    "전화": "contactPhone", "전화번호": "contactPhone", "연락처": "contactPhone", "phone": "contactPhone",
    "메모": "notes", "비고": "notes", "notes": "notes", "memo": "notes",
  };

  const STAGE_MAP: Record<string, string> = {
    "문의": "inquiry", "제안": "proposal", "견적": "proposal", "제안/견적": "proposal",
    "협상": "negotiation", "협상 중": "negotiation",
    "계약": "contract", "계약 검토": "contract",
    "완료": "won", "계약 완료": "won", "성공": "won",
    "실패": "lost", "취소": "lost",
    "inquiry": "inquiry", "proposal": "proposal", "negotiation": "negotiation",
    "contract": "contract", "won": "won", "lost": "lost",
  };

  // Step 1: parse file → show mapping UI
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (rows.length === 0) return;
        const headers = Object.keys(rows[0]);
        // Auto-guess mapping
        const mapping: Record<string, string> = {};
        for (const h of headers) {
          const norm = h.trim().toLowerCase().replace(/\s+/g, " ");
          mapping[h] = HEADER_GUESS[norm] || HEADER_GUESS[h.trim()] || "";
        }
        setUploadData({ headers, rows, mapping });
      } catch {
        alert(ko ? "파일을 읽을 수 없습니다" : "Failed to read file");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Step 2: confirm mapping → create clients
  const handleConfirmUpload = async () => {
    if (!uploadData) return;
    setUploading(true);
    const { rows, mapping } = uploadData;

    const created: Client[] = [];
    for (const row of rows) {
      const c: any = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (!field) continue;
        const val = row[header];
        if (val === undefined || val === "") continue;
        if (field === "value") c[field] = parseInt(String(val).replace(/[^0-9]/g, "")) || 0;
        else if (field === "stage") c[field] = STAGE_MAP[String(val).trim()] || STAGE_MAP[String(val).trim().toLowerCase()] || "inquiry";
        else c[field] = String(val).trim();
      }
      if (c.name) {
        if (!c.stage) c.stage = "inquiry";
        if (!c.value) c.value = 0;
        try {
          const client = await api.createClient(c);
          created.push(client);
        } catch { /* skip */ }
      }
    }
    setClients(p => [...created, ...p]);
    setUploadData(null);
    setUploading(false);
    if (created.length > 0) alert(ko ? `${created.length}건 업로드 완료` : `${created.length} clients imported`);
  };

  const filtered = clients.filter(c => { if (!searchQuery.trim()) return true; const q = searchQuery.toLowerCase(); return c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q); });
  const pipelineValue = clients.filter(c => !["won", "lost"].includes(c.stage)).reduce((s, c) => s + (c.value || 0), 0);
  const totalValue = clients.filter(c => c.stage === "won").reduce((s, c) => s + (c.value || 0), 0);

  // Client detail view
  if (selectedClient) {
    return (
      <div>
        <ClientDetail client={selectedClient} estimates={estimates} onBack={() => setSelectedClient(null)}
          onEdit={() => { setEditingClient(selectedClient); setClientDialogOpen(true); }}
          onStageChange={(stage) => handleStageChange(selectedClient.id, stage)}
          onPaymentsUpdate={async (payments) => {
            const u = await api.updateClient(selectedClient.id, { payments });
            setClients(p => p.map(c => c.id === selectedClient.id ? u : c));
            setSelectedClient(u);
          }}
          onMemoUpdate={async (memoContent) => {
            const u = await api.updateClient(selectedClient.id, { memoContent });
            setClients(p => p.map(c => c.id === selectedClient.id ? u : c));
            setSelectedClient(u);
          }}
          ko={ko} />
        <ClientDialog open={clientDialogOpen} onClose={() => { setClientDialogOpen(false); setEditingClient(null); }}
          onSave={handleEditClient} client={editingClient} ko={ko} />
      </div>
    );
  }

  const tabs = [
    { id: "clients" as const, labelKo: "클라이언트 관리", labelEn: "Clients", icon: <Users size={16} /> },
    { id: "estimates" as const, labelKo: "견적서/계약", labelEn: "Estimates", icon: <FileText size={16} /> },
    { id: "revenue" as const, labelKo: "매출 현황", labelEn: "Revenue", icon: <BarChart3 size={16} /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={22} className="text-emerald-600" />
            {ko ? "영업/세일즈" : "Sales"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ko ? `진행 중 ${pipelineValue.toLocaleString()}원 · 계약 완료 ${totalValue.toLocaleString()}원` : `Pipeline ${pipelineValue.toLocaleString()} · Won ${totalValue.toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "clients" && (
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                {uploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Upload size={15} />}
                {ko ? "엑셀 업로드" : "Upload"}
              </button>
            </>
          )}
          <button onClick={() => { if (activeTab === "estimates") { setEditingEstimate(null); setEstimateDialogOpen(true); } else { setEditingClient(null); setClientDialogOpen(true); } }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            {activeTab === "estimates" ? (ko ? "견적서 작성" : "New Estimate") : (ko ? "클라이언트 추가" : "Add Client")}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {tab.icon} {ko ? tab.labelKo : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ── Clients Tab ── */}
      {activeTab === "clients" && (
        <div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={ko ? "클라이언트 검색..." : "Search..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {STAGES.map(stage => (
              <div key={stage.id} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{clients.filter(c => c.stage === stage.id).length}</p>
                <p className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1", stage.color)}>{ko ? stage.labelKo : stage.labelEn}</p>
              </div>
            ))}
          </div>
          {loading ? <div className="text-center py-12 text-gray-400">{ko ? "로딩 중..." : "Loading..."}</div>
          : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Users size={28} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">{ko ? "아직 클라이언트가 없습니다" : "No clients yet"}</h3>
              <button onClick={() => { setEditingClient(null); setClientDialogOpen(true); }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
                <Plus size={14} className="inline mr-1" />{ko ? "클라이언트 추가" : "Add Client"}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200">
              <div>
                <table className="w-full text-left table-fixed">
                  <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[20%]">{ko ? "건명" : "Project"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[12%] hidden md:table-cell">{ko ? "회사" : "Company"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[14%]">{ko ? "단계" : "Stage"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[13%] hidden sm:table-cell">{ko ? "전체 금액" : "Value"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[13%] hidden sm:table-cell">{ko ? "수령 대금" : "Received"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[11%] hidden md:table-cell">{ko ? "담당자" : "Contact"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-[10%] text-center">{ko ? "상세" : "Detail"}</th>
                    <th className="px-4 py-3 w-[7%]"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(client => {
                      return (
                        <tr key={client.id} onClick={() => setSelectedClient(client)}
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                          <td className="px-4 py-3.5">
                            <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell text-sm text-gray-500 truncate">{client.company || "-"}</td>
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <StagePill currentStage={client.stage} onChange={(stage) => handleStageChange(client.id, stage)} ko={ko} />
                          </td>
                          <td className="px-4 py-3.5 hidden sm:table-cell text-sm font-medium text-gray-700">{(client.value || 0).toLocaleString()}{ko ? "원" : ""}</td>
                          <td className="px-4 py-3.5 hidden sm:table-cell">
                            {(() => {
                              const paid = (client.payments || []).filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
                              return paid > 0
                                ? <span className="text-sm font-medium text-emerald-600">{paid.toLocaleString()}{ko ? "원" : ""}</span>
                                : <span className="text-sm text-gray-400">-</span>;
                            })()}
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell text-sm text-gray-600 truncate">{client.contactName || "-"}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                              {ko ? "상세" : "Detail"} <ChevronRight size={12} />
                            </span>
                          </td>
                          <td className="px-4 py-3.5 relative" onClick={e => e.stopPropagation()} ref={menuOpenId === client.id ? menuRef : undefined}>
                            <button onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100"><MoreHorizontal size={16} /></button>
                            {menuOpenId === client.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[120px]">
                                <button onClick={() => { setEditingClient(client); setClientDialogOpen(true); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">{ko ? "수정" : "Edit"}</button>
                                <button onClick={() => handleDeleteClient(client.id)}
                                  className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-1.5"><Trash2 size={12} /> {ko ? "삭제" : "Delete"}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Estimates Tab ── */}
      {activeTab === "estimates" && (
        <div>
          {estimates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <FileText size={28} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">{ko ? "아직 견적서가 없습니다" : "No estimates yet"}</h3>
              <button onClick={() => { setEditingEstimate(null); setEstimateDialogOpen(true); }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
                <Plus size={14} className="inline mr-1" />{ko ? "견적서 작성" : "New Estimate"}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "견적서" : "Estimate"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "클라이언트" : "Client"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "금액" : "Amount"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "상태" : "Status"}</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {estimates.map(est => {
                    const st = EST_STATUS.find(s => s.id === est.status);
                    return (
                      <tr key={est.id} className="hover:bg-blue-50/30 group">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 cursor-pointer"
                          onClick={() => { setEditingEstimate(est); setEstimateDialogOpen(true); }}>{est.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{est.clientName || "-"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{(est.totalAmount || 0).toLocaleString()}{ko ? "원" : ""}</td>
                        <td className="px-4 py-3"><span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", st?.color)}>{ko ? st?.labelKo : st?.labelEn}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteEstimate(est.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Revenue Tab ── */}
      {activeTab === "revenue" && <RevenueTab clients={clients} estimates={estimates} ko={ko} />}

      {/* Dialogs */}
      <ClientDialog open={clientDialogOpen} onClose={() => { setClientDialogOpen(false); setEditingClient(null); }}
        onSave={editingClient ? handleEditClient : handleAddClient} client={editingClient} ko={ko} />
      <EstimateDialog open={estimateDialogOpen} onClose={() => { setEstimateDialogOpen(false); setEditingEstimate(null); }}
        onSave={editingEstimate ? handleEditEstimate : handleAddEstimate} clients={clients} estimate={editingEstimate} ko={ko} />

      {/* Upload Mapping Modal */}
      {uploadData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setUploadData(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{ko ? "컬럼 매핑" : "Map Columns"}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{ko ? `${uploadData.rows.length}행 감지됨 · 각 컬럼이 어떤 필드인지 선택하세요` : `${uploadData.rows.length} rows detected · Select what each column represents`}</p>
              </div>
              <button onClick={() => setUploadData(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            {/* Mapping table */}
            <div className="px-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                {uploadData.headers.map(header => (
                  <div key={header} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-[40%] shrink-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{header}</p>
                      <p className="text-[10px] text-gray-400 truncate">{ko ? "예시" : "e.g."}: {String(uploadData.rows[0]?.[header] ?? "").slice(0, 30)}</p>
                    </div>
                    <span className="text-gray-300 shrink-0">→</span>
                    <select value={uploadData.mapping[header] || ""}
                      onChange={e => setUploadData(prev => prev ? { ...prev, mapping: { ...prev.mapping, [header]: e.target.value } } : null)}
                      className={cn("flex-1 px-3 py-2 rounded-lg border text-sm outline-none",
                        uploadData.mapping[header] ? "border-blue-200 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-500")}>
                      {FIELD_OPTIONS.map(f => (
                        <option key={f.value} value={f.value}>{ko ? f.labelKo : f.labelEn}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {Object.values(uploadData.mapping).some(v => v) && (
                <div className="mt-4 mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{ko ? `미리보기 (처음 3행)` : `Preview (first 3 rows)`}</p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50">
                        {Object.entries(uploadData.mapping).filter(([, v]) => v).map(([h, v]) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">
                            {FIELD_OPTIONS.find(f => f.value === v)?.[ko ? "labelKo" : "labelEn"]}
                          </th>
                        ))}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {uploadData.rows.slice(0, 3).map((row, i) => (
                          <tr key={i}>
                            {Object.entries(uploadData.mapping).filter(([, v]) => v).map(([h]) => (
                              <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-[150px]">{String(row[h] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {ko ? `"건명/프로젝트" 필드는 필수입니다` : `"Project Name" field is required`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setUploadData(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">{ko ? "취소" : "Cancel"}</button>
                <button onClick={handleConfirmUpload}
                  disabled={uploading || !Object.values(uploadData.mapping).includes("name")}
                  className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-colors",
                    !uploading && Object.values(uploadData.mapping).includes("name")
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-400")}>
                  {uploading ? (ko ? "업로드 중..." : "Uploading...") : (ko ? `${uploadData.rows.length}건 업로드` : `Import ${uploadData.rows.length}`)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
