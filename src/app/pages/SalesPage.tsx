import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  DollarSign, Plus, Search, Users, FileText, BarChart3,
  MoreHorizontal, X, Trash2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../../lib/api";

interface Client {
  id: string;
  name: string;
  company: string;
  stage: string;
  value: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const STAGES = [
  { id: "inquiry", labelKo: "문의", labelEn: "Inquiry", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "proposal", labelKo: "제안/견적", labelEn: "Proposal", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "negotiation", labelKo: "협상 중", labelEn: "Negotiation", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "contract", labelKo: "계약 검토", labelEn: "Contract", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "won", labelKo: "계약 완료", labelEn: "Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "lost", labelKo: "실패", labelEn: "Lost", color: "bg-gray-100 text-gray-500 border-gray-200" },
];

// ─── Add/Edit Client Dialog ─────────────────────────────────────
function ClientDialog({ open, onClose, onSave, client, ko }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Client>) => void;
  client?: Client | null;
  ko: boolean;
}) {
  const [name, setName] = useState(client?.name || "");
  const [company, setCompany] = useState(client?.company || "");
  const [stage, setStage] = useState(client?.stage || "inquiry");
  const [value, setValue] = useState(client?.value?.toString() || "");
  const [contactName, setContactName] = useState(client?.contactName || "");
  const [contactEmail, setContactEmail] = useState(client?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(client?.contactPhone || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(client?.name || "");
      setCompany(client?.company || "");
      setStage(client?.stage || "inquiry");
      setValue(client?.value?.toString() || "");
      setContactName(client?.contactName || "");
      setContactEmail(client?.contactEmail || "");
      setContactPhone(client?.contactPhone || "");
      setNotes(client?.notes || "");
    }
  }, [open, client]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      company: company.trim(),
      stage,
      value: parseInt(value) || 0,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-gray-900">
            {client ? (ko ? "클라이언트 수정" : "Edit Client") : (ko ? "클라이언트 추가" : "Add Client")}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "프로젝트/건명 *" : "Project Name *"}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder={ko ? "예: 쇼핑몰 앱 개발" : "e.g. Shopping App Development"}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "회사/클라이언트명" : "Company"}</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)}
              placeholder={ko ? "예: 패션브랜드Z" : "e.g. Fashion Brand Z"}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
          </div>

          {/* Stage + Value row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "영업 단계" : "Stage"}</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "예상 매출 (원)" : "Value"}</label>
              <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{ko ? "담당자 정보" : "Contact Info"}</p>
            <div className="space-y-3">
              <input value={contactName} onChange={(e) => setContactName(e.target.value)}
                placeholder={ko ? "담당자 이름" : "Contact name"}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              <div className="grid grid-cols-2 gap-3">
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={ko ? "이메일" : "Email"} type="email"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  placeholder={ko ? "전화번호" : "Phone"}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{ko ? "메모" : "Notes"}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder={ko ? "추가 메모..." : "Additional notes..."}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            {ko ? "취소" : "Cancel"}
          </button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
              !name.trim() || saving ? "bg-gray-100 text-gray-400" : "bg-blue-600 text-white hover:bg-blue-700"
            )}>
            {saving ? (ko ? "저장 중..." : "Saving...") : (ko ? "저장" : "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Page ─────────────────────────────────────────────────
export function SalesPage() {
  const { language } = useLanguage();
  const { currentOrg } = useWorkspace();
  const ko = language === "ko";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"clients" | "estimates" | "revenue">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load clients
  useEffect(() => {
    setLoading(true);
    api.getClients().then((data) => {
      setClients(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentOrg]);

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAddClient = async (data: Partial<Client>) => {
    const created = await api.createClient(data);
    setClients((prev) => [created, ...prev]);
  };

  const handleEditClient = async (data: Partial<Client>) => {
    if (!editingClient) return;
    const updated = await api.updateClient(editingClient.id, data);
    setClients((prev) => prev.map((c) => c.id === editingClient.id ? updated : c));
    setEditingClient(null);
  };

  const handleDeleteClient = async (id: string) => {
    await api.deleteClient(id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    setMenuOpenId(null);
  };

  const handleStageChange = async (id: string, newStage: string) => {
    const updated = await api.updateClient(id, { stage: newStage });
    setClients((prev) => prev.map((c) => c.id === id ? updated : c));
  };

  const filtered = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.contactName?.toLowerCase().includes(q);
  });

  const totalValue = clients.filter((c) => c.stage === "won").reduce((sum, c) => sum + (c.value || 0), 0);
  const pipelineValue = clients.filter((c) => !["won", "lost"].includes(c.stage)).reduce((sum, c) => sum + (c.value || 0), 0);

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
        <button onClick={() => { setEditingClient(null); setDialogOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={16} />
          {ko ? "클라이언트 추가" : "Add Client"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            )}>
            {tab.icon}
            {ko ? tab.labelKo : tab.labelEn}
          </button>
        ))}
      </div>

      {activeTab === "clients" && (
        <div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ko ? "클라이언트 검색..." : "Search clients..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
          </div>

          {/* Pipeline Summary */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {STAGES.map((stage) => {
              const count = clients.filter((c) => c.stage === stage.id).length;
              return (
                <div key={stage.id} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                  <p className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1", stage.color)}>
                    {ko ? stage.labelKo : stage.labelEn}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Client List */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">{ko ? "로딩 중..." : "Loading..."}</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {ko ? "아직 클라이언트가 없습니다" : "No clients yet"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {ko ? "첫 번째 클라이언트를 추가해보세요" : "Add your first client"}
              </p>
              <button onClick={() => { setEditingClient(null); setDialogOpen(true); }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
                <Plus size={14} className="inline mr-1" />
                {ko ? "클라이언트 추가" : "Add Client"}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase min-w-[160px]">{ko ? "프로젝트/건명" : "Project"}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "단계" : "Stage"}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{ko ? "예상 매출" : "Value"}</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">{ko ? "담당자" : "Contact"}</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((client) => {
                      const stage = STAGES.find((s) => s.id === client.stage);
                      return (
                        <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-4 py-3 cursor-pointer" onClick={() => { setEditingClient(client); setDialogOpen(true); }}>
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <select value={client.stage}
                              onChange={(e) => handleStageChange(client.id, e.target.value)}
                              className={cn("text-[11px] font-bold px-2 py-1 rounded-full border appearance-none cursor-pointer", stage?.color)}>
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>{ko ? s.labelKo : s.labelEn}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-sm font-medium text-gray-700">
                              {(client.value || 0).toLocaleString()}{ko ? "원" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <p className="text-xs text-gray-600">{client.contactName || "-"}</p>
                            {client.contactEmail && <p className="text-[11px] text-gray-400">{client.contactEmail}</p>}
                          </td>
                          <td className="px-4 py-3 relative" ref={menuOpenId === client.id ? menuRef : undefined}>
                            <button onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal size={16} />
                            </button>
                            {menuOpenId === client.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[120px]">
                                <button onClick={() => { setEditingClient(client); setDialogOpen(true); setMenuOpenId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                                  {ko ? "수정" : "Edit"}
                                </button>
                                <button onClick={() => handleDeleteClient(client.id)}
                                  className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-1.5">
                                  <Trash2 size={12} /> {ko ? "삭제" : "Delete"}
                                </button>
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

      {activeTab === "estimates" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{ko ? "견적서/계약 관리" : "Estimates & Contracts"}</h3>
          <p className="text-sm text-gray-500">{ko ? "곧 추가됩니다" : "Coming soon"}</p>
        </div>
      )}

      {activeTab === "revenue" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{ko ? "매출 현황" : "Revenue Overview"}</h3>
          <p className="text-sm text-gray-500">{ko ? "곧 추가됩니다" : "Coming soon"}</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <ClientDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingClient(null); }}
        onSave={editingClient ? handleEditClient : handleAddClient}
        client={editingClient}
        ko={ko}
      />
    </div>
  );
}
