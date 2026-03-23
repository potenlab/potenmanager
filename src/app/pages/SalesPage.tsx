import { useState, useEffect, useRef } from "react";
import {
  DollarSign, Plus, Search, Users, FileText, BarChart3,
  MoreHorizontal, X, Trash2, ChevronLeft, Edit2, Phone, Mail,
  Calendar, TrendingUp, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../../lib/api";

// ─── Types ──────────────────────────────────────────────────────
interface Client {
  id: string; name: string; company: string; stage: string; value: number;
  contactName?: string; contactEmail?: string; contactPhone?: string;
  notes?: string; projectId?: string; createdAt?: Date; updatedAt?: Date;
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
function ClientDetail({ client, estimates, onBack, onEdit, onStageChange, ko }: {
  client: Client; estimates: Estimate[]; onBack: () => void; onEdit: () => void; onStageChange: (stage: string) => void; ko: boolean;
}) {
  const stage = STAGES.find(s => s.id === client.stage);
  const clientEstimates = estimates.filter(e => e.clientId === client.id);

  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ChevronLeft size={16} /> {ko ? "클라이언트 목록" : "Clients"}
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
          {client.company && <p className="text-sm text-gray-500 mt-0.5">{client.company}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select value={client.stage} onChange={e => onStageChange(e.target.value)}
            className={cn("text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer", stage?.color)}>
            {STAGES.map(s => <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>)}
          </select>
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">{ko ? "예상 매출" : "Value"}</p>
          <p className="text-xl font-bold text-gray-900">{(client.value || 0).toLocaleString()}<span className="text-sm font-normal text-gray-500">{ko ? "원" : ""}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">{ko ? "담당자" : "Contact"}</p>
          <p className="text-sm font-medium text-gray-900">{client.contactName || "-"}</p>
          {client.contactEmail && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={10} /> {client.contactEmail}</p>}
          {client.contactPhone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} /> {client.contactPhone}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">{ko ? "견적서" : "Estimates"}</p>
          <p className="text-xl font-bold text-gray-900">{clientEstimates.length}<span className="text-sm font-normal text-gray-500">{ko ? "건" : ""}</span></p>
        </div>
      </div>

      {client.notes && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{ko ? "메모" : "Notes"}</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {clientEstimates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{ko ? "견적서 목록" : "Estimates"}</h3>
          <div className="space-y-2">
            {clientEstimates.map(est => {
              const st = EST_STATUS.find(s => s.id === est.status);
              return (
                <div key={est.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{est.title}</p>
                    <p className="text-xs text-gray-500">{(est.totalAmount || 0).toLocaleString()}{ko ? "원" : ""}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", st?.color)}>{ko ? st?.labelKo : st?.labelEn}</span>
                </div>
              );
            })}
          </div>
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
  const menuRef = useRef<HTMLDivElement>(null);

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

  const filtered = clients.filter(c => { if (!searchQuery.trim()) return true; const q = searchQuery.toLowerCase(); return c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q); });
  const pipelineValue = clients.filter(c => !["won", "lost"].includes(c.stage)).reduce((s, c) => s + (c.value || 0), 0);
  const totalValue = clients.filter(c => c.stage === "won").reduce((s, c) => s + (c.value || 0), 0);

  // Client detail view
  if (selectedClient) {
    return (
      <div>
        <ClientDetail client={selectedClient} estimates={estimates} onBack={() => setSelectedClient(null)}
          onEdit={() => { setEditingClient(selectedClient); setClientDialogOpen(true); }}
          onStageChange={(stage) => handleStageChange(selectedClient.id, stage)} ko={ko} />
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
        <button onClick={() => { if (activeTab === "estimates") { setEditingEstimate(null); setEstimateDialogOpen(true); } else { setEditingClient(null); setClientDialogOpen(true); } }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          {activeTab === "estimates" ? (ko ? "견적서 작성" : "New Estimate") : (ko ? "클라이언트 추가" : "Add Client")}
        </button>
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
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "프로젝트/건명" : "Project"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "단계" : "Stage"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{ko ? "예상 매출" : "Value"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">{ko ? "담당자" : "Contact"}</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(client => {
                      const stage = STAGES.find(s => s.id === client.stage);
                      return (
                        <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedClient(client)}>
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <select value={client.stage} onChange={e => handleStageChange(client.id, e.target.value)}
                              className={cn("text-[11px] font-bold px-2 py-1 rounded-full border appearance-none cursor-pointer", stage?.color)}>
                              {STAGES.map(s => <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-sm font-medium text-gray-700">{(client.value || 0).toLocaleString()}{ko ? "원" : ""}</td>
                          <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">{client.contactName || "-"}</td>
                          <td className="px-4 py-3 relative" ref={menuOpenId === client.id ? menuRef : undefined}>
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
    </div>
  );
}
