import { Factory, Gauge } from "lucide-react";
import type { DashboardSummary } from "@/frontend/lib/dashboard-types";
import { formatNumber } from "@/frontend/lib/metrics";

export function ProductionSummaryPanel({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="panel p-5">
      <h2 className="text-base font-bold text-dashboard-text">Ringkasan Produksi</h2>
      <p className="mt-1 text-sm text-dashboard-muted">Total kapasitas terpasang dan flow aktual seluruh stasiun.</p>
      <div className="mt-5 grid gap-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">Total Flow Aktual</p>
              <p className="mt-2 text-2xl font-bold text-dashboard-text">{formatNumber(summary.totalActualDailyFlow, 1)} m3/day</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-dashboard-primary">
              <Gauge size={22} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-lg border border-dashboard-border bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Purity Avg</p>
            <p className="mt-2 text-xl font-bold text-dashboard-purity">{formatNumber(summary.averagePurity, 1)}%</p>
          </div>
          <div className="rounded-lg border border-dashboard-border bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">System Health</p>
              <p className="text-xs font-bold text-dashboard-text">{summary.totalStations > 0 ? formatNumber(((summary.totalStations - summary.warningSites - summary.criticalSites) / summary.totalStations) * 100, 1) : 0}% Normal</p>
            </div>
            <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="bg-dashboard-online" style={{ width: `${summary.totalStations > 0 ? ((summary.totalStations - summary.warningSites - summary.criticalSites) / summary.totalStations) * 100 : 0}%` }}></div>
              <div className="bg-dashboard-warning" style={{ width: `${summary.totalStations > 0 ? (summary.warningSites / summary.totalStations) * 100 : 0}%` }}></div>
              <div className="bg-dashboard-critical" style={{ width: `${summary.totalStations > 0 ? (summary.criticalSites / summary.totalStations) * 100 : 0}%` }}></div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] font-medium text-dashboard-muted">
              <span>{summary.totalStations - summary.warningSites - summary.criticalSites} OK</span>
              <span>{summary.warningSites} Warn</span>
              <span>{summary.criticalSites} Crit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
