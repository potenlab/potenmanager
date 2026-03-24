import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { api } from "../../lib/api";
import { RevenueTab } from "./SalesPage";

export function RevenuePage() {
  const { language } = useLanguage();
  const { currentOrg } = useWorkspace();
  const ko = language === "ko";
  const [clients, setClients] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getClients(), api.getEstimates()])
      .then(([c, e]) => { setClients(c); setEstimates(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentOrg]);

  const totalValue = clients.reduce((s: number, c: any) => s + (c.value || 0), 0);
  const paidTotal = clients.reduce((s: number, c: any) => s + (c.payments || []).filter((p: any) => p.status === "paid").reduce((ss: number, p: any) => ss + p.amount, 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={22} className="text-emerald-600" />
            {ko ? "매출 관리" : "Revenue"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {ko ? `전체 ${totalValue.toLocaleString()}원 · 수령 ${paidTotal.toLocaleString()}원` : `Total ${totalValue.toLocaleString()} · Received ${paidTotal.toLocaleString()}`}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <RevenueTab clients={clients} estimates={estimates} ko={ko} />
      )}
    </div>
  );
}

