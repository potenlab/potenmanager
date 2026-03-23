import { useState } from "react";
import { useNavigate } from "react-router";
import {
  DollarSign, Plus, Search, Users, FileText, BarChart3,
  ChevronDown, MoreHorizontal, Phone, Mail, Building2, ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";

// ─── Types ──────────────────────────────────────────────────────
interface Client {
  id: string;
  name: string;
  company: string;
  stage: string;
  value: number;
  contact?: string;
  email?: string;
  phone?: string;
  lastContact?: string;
  notes?: string;
}

const STAGES = [
  { id: "inquiry", labelKo: "문의", labelEn: "Inquiry", color: "bg-blue-100 text-blue-700" },
  { id: "proposal", labelKo: "제안/견적", labelEn: "Proposal", color: "bg-purple-100 text-purple-700" },
  { id: "negotiation", labelKo: "협상 중", labelEn: "Negotiation", color: "bg-amber-100 text-amber-700" },
  { id: "contract", labelKo: "계약 검토", labelEn: "Contract", color: "bg-orange-100 text-orange-700" },
  { id: "won", labelKo: "계약 완료", labelEn: "Won", color: "bg-emerald-100 text-emerald-700" },
  { id: "lost", labelKo: "실패", labelEn: "Lost", color: "bg-gray-100 text-gray-500" },
];

// ─── Sales Page ─────────────────────────────────────────────────
export function SalesPage() {
  const { language } = useLanguage();
  const { currentOrg } = useWorkspace();
  const ko = language === "ko";
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"clients" | "estimates" | "revenue">("clients");

  // TODO: Load from pm_* tables
  const [clients] = useState<Client[]>([]);

  const tabs = [
    { id: "clients" as const, labelKo: "클라이언트 관리", labelEn: "Clients", icon: <Users size={16} /> },
    { id: "estimates" as const, labelKo: "견적서/계약", labelEn: "Estimates", icon: <FileText size={16} /> },
    { id: "revenue" as const, labelKo: "매출 현황", labelEn: "Revenue", icon: <BarChart3 size={16} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={22} className="text-emerald-600" />
            {ko ? "영업/세일즈" : "Sales"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ko ? "클라이언트와 영업 현황을 관리하세요" : "Manage your clients and sales pipeline"}
          </p>
        </div>
        <button
          onClick={() => {/* TODO: open create dialog */}}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          {ko ? "클라이언트 추가" : "Add Client"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            {ko ? tab.labelKo : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "clients" && (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ko ? "클라이언트 검색..." : "Search clients..."}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
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
          {clients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {ko ? "아직 클라이언트가 없습니다" : "No clients yet"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {ko ? "첫 번째 클라이언트를 추가해보세요" : "Add your first client to get started"}
              </p>
              <button
                onClick={() => {/* TODO */}}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} className="inline mr-1" />
                {ko ? "클라이언트 추가" : "Add Client"}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "클라이언트" : "Client"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{ko ? "단계" : "Stage"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{ko ? "예상 매출" : "Value"}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">{ko ? "최근 연락" : "Last Contact"}</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clients.map((client) => {
                    const stage = STAGES.find((s) => s.id === client.stage);
                    return (
                      <tr key={client.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-500">{client.company}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", stage?.color)}>
                            {ko ? stage?.labelKo : stage?.labelEn}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-sm font-medium text-gray-700">
                            {client.value.toLocaleString()}원
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs text-gray-500">{client.lastContact || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <MoreHorizontal size={16} />
                          </button>
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

      {activeTab === "estimates" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {ko ? "견적서/계약 관리" : "Estimates & Contracts"}
          </h3>
          <p className="text-sm text-gray-500">
            {ko ? "곧 추가됩니다" : "Coming soon"}
          </p>
        </div>
      )}

      {activeTab === "revenue" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {ko ? "매출 현황" : "Revenue Overview"}
          </h3>
          <p className="text-sm text-gray-500">
            {ko ? "곧 추가됩니다" : "Coming soon"}
          </p>
        </div>
      )}
    </div>
  );
}
