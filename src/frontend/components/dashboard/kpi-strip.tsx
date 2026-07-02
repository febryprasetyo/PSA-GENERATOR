import { Building2, Cpu, Power, PowerOff, TriangleAlert } from "lucide-react";
import { KpiCard } from "@/frontend/components/ui/kpi-card";
import type { DashboardSummary } from "@/frontend/lib/dashboard-types";
import { formatNumber } from "@/frontend/lib/metrics";

export function KpiStrip({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Total Mesin" value={formatNumber(summary.totalMachines)} detail={`${formatNumber(summary.totalStations)} stasiun aktif`} icon={Cpu} colorClass="bg-indigo-50 text-dashboard-capacity" />
      <KpiCard label="Total Stasiun" value={formatNumber(summary.totalStations)} detail="Site pemasangan terpantau" icon={Building2} colorClass="bg-blue-50 text-dashboard-primary" />
      <KpiCard label="Mesin Menyala" value={formatNumber(summary.onlineMachines)} detail={`${formatNumber(summary.availability, 1)}% availability`} icon={Power} colorClass="bg-green-50 text-dashboard-online" />
      <KpiCard label="Mesin Mati" value={formatNumber(summary.offlineMachines)} detail={`${summary.criticalSites} site critical`} icon={PowerOff} colorClass="bg-red-50 text-dashboard-offline" />
      <KpiCard label="Warning" value={formatNumber(summary.warningSites + summary.criticalSites)} detail="Purity, tekanan, status mesin" icon={TriangleAlert} colorClass="bg-amber-50 text-dashboard-warning" />
    </div>
  );
}
