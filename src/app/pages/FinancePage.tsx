import { useState, useEffect } from "react";
import {
  Wallet, TrendingUp, TrendingDown, BarChart3, Plus, Trash2, Edit2, X, Check,
  ChevronDown, Calendar,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../../lib/api";
import { supabase } from "../context/AuthContext";

// ─── Types ──────────────────────────────────────────────────────
interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  orgId?: string;
  createdAt?: string;
}

interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  orgId?: string;
}

const EXPENSE_CATEGORIES = [
  { id: "salary", labelKo: "인건비", labelEn: "Salary", color: "bg-blue-100 text-blue-700" },
  { id: "office", labelKo: "사무실/임대", labelEn: "Office/Rent", color: "bg-purple-100 text-purple-700" },
  { id: "software", labelKo: "소프트웨어/구독", labelEn: "Software", color: "bg-cyan-100 text-cyan-700" },
  { id: "marketing", labelKo: "마케팅/광고", labelEn: "Marketing", color: "bg-pink-100 text-pink-700" },
  { id: "equipment", labelKo: "장비/비품", labelEn: "Equipment", color: "bg-amber-100 text-amber-700" },
  { id: "outsource", labelKo: "외주비", labelEn: "Outsource", color: "bg-orange-100 text-orange-700" },
  { id: "tax", labelKo: "세금/공과금", labelEn: "Tax/Utilities", color: "bg-red-100 text-red-700" },
  { id: "other", labelKo: "기타", labelEn: "Other", color: "bg-gray-100 text-gray-600" },
];

// ─── Helpers ────────────────────────────────────────────────────
function getActiveOrgId(): string {
  try { return localStorage.getItem("pm_active_org_id") || localStorage.getItem("poten_active_org_id") || ""; } catch { return ""; }
}

// ─── Main Page ──────────────────────────────────────────────────
export function FinancePage() {
  const { language } = useLanguage();
  const { currentOrg } = useWorkspace();
  const ko = language === "ko";

  const [activeTab, setActiveTab] = useState<"revenue" | "expenses" | "budget" | "pnl">("revenue");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("other");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expNotes, setExpNotes] = useState("");

  // Date filter
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    setLoading(true);
    const orgId = getActiveOrgId();
    Promise.all([
      api.getClients(),
      supabase.from("pm_expenses").select("*").eq("org_id", orgId).then(r => r.data || []),
      supabase.from("pm_budgets").select("*").eq("org_id", orgId).then(r => r.data || []),
    ]).then(([c, e, b]) => {
      setClients(c);
      setExpenses(e.map((r: any) => ({ id: r.id, title: r.title, amount: r.amount, category: r.category, date: r.date, notes: r.notes, orgId: r.org_id, createdAt: r.created_at })));
      setBudgets(b.map((r: any) => ({ id: r.id, category: r.category, monthlyLimit: r.monthly_limit, orgId: r.org_id })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentOrg]);

  // ── Revenue from clients ──
  const monthRevenue = clients.reduce((sum, c) => {
    const payments = c.payments || [];
    return sum + payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0);
  }, 0);

  // ── Expenses for current month ──
  const monthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth;
  });
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // ── Category breakdown ──
  const categoryTotals = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: monthExpenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
    budget: budgets.find(b => b.category === cat.id)?.monthlyLimit || 0,
  })).filter(c => c.total > 0 || c.budget > 0);

  // ── CRUD ──
  const resetForm = () => { setExpTitle(""); setExpAmount(""); setExpCategory("other"); setExpDate(new Date().toISOString().split("T")[0]); setExpNotes(""); setEditingExpense(null); setShowExpenseForm(false); };

  const saveExpense = async () => {
    const orgId = getActiveOrgId();
    const row = { title: expTitle.trim(), amount: parseInt(expAmount.replace(/[^0-9]/g, "")) || 0, category: expCategory, date: expDate, notes: expNotes.trim(), org_id: orgId };
    if (!row.title || !row.amount) return;

    if (editingExpense) {
      const { data } = await supabase.from("pm_expenses").update(row).eq("id", editingExpense.id).select().single();
      if (data) setExpenses(p => p.map(e => e.id === editingExpense.id ? { ...e, ...row, id: data.id } : e));
    } else {
      const { data } = await supabase.from("pm_expenses").insert(row).select().single();
      if (data) setExpenses(p => [{ id: data.id, title: data.title, amount: data.amount, category: data.category, date: data.date, notes: data.notes, orgId: data.org_id, createdAt: data.created_at }, ...p]);
    }
    resetForm();
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("pm_expenses").delete().eq("id", id);
    setExpenses(p => p.filter(e => e.id !== id));
  };

  const tabs = [
    { id: "revenue" as const, labelKo: "매출", labelEn: "Revenue", icon: <TrendingUp size={16} /> },
    { id: "expenses" as const, labelKo: "지출", labelEn: "Expenses", icon: <TrendingDown size={16} /> },
    { id: "pnl" as const, labelKo: "손익", labelEn: "P&L", icon: <BarChart3 size={16} /> },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet size={22} className="text-blue-600" />
            {ko ? "재무 관리" : "Finance"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {filterYear}{ko ? "년 " : "/"}{filterMonth}{ko ? "월" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1">
            <button onClick={() => { if (filterMonth === 1) { setFilterMonth(12); setFilterYear(y => y - 1); } else setFilterMonth(m => m - 1); }}
              className="p-1 hover:bg-gray-100 rounded text-gray-500">&lt;</button>
            <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">{filterYear}.{String(filterMonth).padStart(2, "0")}</span>
            <button onClick={() => { if (filterMonth === 12) { setFilterMonth(1); setFilterYear(y => y + 1); } else setFilterMonth(m => m + 1); }}
              className="p-1 hover:bg-gray-100 rounded text-gray-500">&gt;</button>
          </div>
          {activeTab === "expenses" && (
            <button onClick={() => { resetForm(); setShowExpenseForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <Plus size={16} /> {ko ? "지출 추가" : "Add Expense"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {tab.icon} {ko ? tab.labelKo : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ── Revenue Tab ── */}
      {activeTab === "revenue" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{ko ? "총 계약 금액" : "Total Contract"}</p>
              <p className="text-xl font-bold text-gray-900">{clients.reduce((s: number, c: any) => s + (c.value || 0), 0).toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{ko ? "수금 완료" : "Received"}</p>
              <p className="text-xl font-bold text-emerald-600">{monthRevenue.toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{ko ? "미수금" : "Outstanding"}</p>
              <p className="text-xl font-bold text-amber-600">{(clients.reduce((s: number, c: any) => s + (c.value || 0), 0) - monthRevenue).toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{ko ? "계약 건수" : "Contracts"}</p>
              <p className="text-xl font-bold text-gray-900">{clients.filter((c: any) => c.stage === "won").length}<span className="text-sm font-normal text-gray-400">{ko ? "건" : ""}</span></p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "프로젝트" : "Project"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "계약금액" : "Value"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "수금액" : "Received"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "미수금" : "Outstanding"}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {clients.filter((c: any) => c.value > 0).map((c: any) => {
                  const paid = (c.payments || []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{(c.value || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium text-emerald-600">{paid.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-amber-600">{((c.value || 0) - paid).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Expenses Tab ── */}
      {activeTab === "expenses" && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{ko ? "이번 달 지출" : "Monthly Expenses"}</p>
              <p className="text-xl font-bold text-red-600">{totalExpenses.toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{ko ? "건수" : "Count"}</p>
              <p className="text-xl font-bold text-gray-900">{monthExpenses.length}<span className="text-sm font-normal text-gray-400">{ko ? "건" : ""}</span></p>
            </div>
          </div>

          {/* Category breakdown */}
          {categoryTotals.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
              {categoryTotals.map(cat => (
                <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-3">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cat.color)}>{ko ? cat.labelKo : cat.labelEn}</span>
                  <p className="text-sm font-bold text-gray-900 mt-1">{cat.total.toLocaleString()}</p>
                  {cat.budget > 0 && (
                    <div className="mt-1">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", cat.total > cat.budget ? "bg-red-500" : "bg-blue-500")}
                          style={{ width: `${Math.min((cat.total / cat.budget) * 100, 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{Math.round((cat.total / cat.budget) * 100)}% of {cat.budget.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Expense form */}
          {showExpenseForm && (
            <div className="bg-white rounded-2xl border border-blue-200 p-5 mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">{editingExpense ? (ko ? "지출 수정" : "Edit Expense") : (ko ? "지출 추가" : "Add Expense")}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <input value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder={ko ? "항목명" : "Title"}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                <input value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder={ko ? "금액" : "Amount"}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{ko ? c.labelKo : c.labelEn}</option>)}
                </select>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <input value={expNotes} onChange={e => setExpNotes(e.target.value)} placeholder={ko ? "메모 (선택)" : "Notes (optional)"}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 mb-4" />
              <div className="flex gap-2 justify-end">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">{ko ? "취소" : "Cancel"}</button>
                <button onClick={saveExpense} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl">{ko ? "저장" : "Save"}</button>
              </div>
            </div>
          )}

          {/* Expense list */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "날짜" : "Date"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "항목" : "Item"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "카테고리" : "Category"}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{ko ? "금액" : "Amount"}</th>
                <th className="px-4 py-3 w-[60px]"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {monthExpenses.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">{ko ? "이번 달 지출이 없습니다" : "No expenses this month"}</td></tr>
                ) : monthExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(exp => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(exp.date + "T00:00:00").toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" })}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.title}</td>
                      <td className="px-4 py-3"><span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cat?.color)}>{ko ? cat?.labelKo : cat?.labelEn}</span></td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{exp.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingExpense(exp); setExpTitle(exp.title); setExpAmount(exp.amount.toString()); setExpCategory(exp.category); setExpDate(exp.date); setExpNotes(exp.notes || ""); setShowExpenseForm(true); }}
                            className="p-1 text-gray-400 hover:text-blue-600"><Edit2 size={14} /></button>
                          <button onClick={() => deleteExpense(exp.id)}
                            className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── P&L Tab ── */}
      {activeTab === "pnl" && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingUp size={14} className="text-emerald-500" /> {ko ? "매출 (수금)" : "Revenue"}</p>
              <p className="text-2xl font-bold text-emerald-600">{monthRevenue.toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><TrendingDown size={14} className="text-red-500" /> {ko ? "지출" : "Expenses"}</p>
              <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span></p>
            </div>
            <div className={cn("bg-white rounded-xl border p-5", monthRevenue - totalExpenses >= 0 ? "border-emerald-200" : "border-red-200")}>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><BarChart3 size={14} /> {ko ? "순이익" : "Net Profit"}</p>
              <p className={cn("text-2xl font-bold", monthRevenue - totalExpenses >= 0 ? "text-emerald-600" : "text-red-600")}>
                {(monthRevenue - totalExpenses).toLocaleString()}<span className="text-sm font-normal text-gray-400">{ko ? "원" : ""}</span>
              </p>
            </div>
          </div>

          {/* Profit bar */}
          {(monthRevenue > 0 || totalExpenses > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">{ko ? "수익/비용 비율" : "Revenue vs Expenses"}</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{ko ? "매출" : "Revenue"}</span>
                    <span>{monthRevenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((monthRevenue / Math.max(monthRevenue, totalExpenses)) * 100, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{ko ? "지출" : "Expenses"}</span>
                    <span>{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((totalExpenses / Math.max(monthRevenue, totalExpenses)) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
              {monthRevenue > 0 && (
                <p className="text-sm text-gray-500 mt-4">
                  {ko ? "수익률: " : "Margin: "}<span className={cn("font-bold", monthRevenue - totalExpenses >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {Math.round(((monthRevenue - totalExpenses) / monthRevenue) * 100)}%
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
