import { Badge, levelStyles } from "@/frontend/components/ui/badge";
import type { OxygenQualitySummary } from "@/frontend/lib/dashboard-types";
import { formatNumber, statusLabel } from "@/frontend/lib/metrics";
import type { StationWithMetrics } from "@/frontend/lib/types";

export function OxygenQualityPanel({
  issues,
  summary,
}: {
  issues: StationWithMetrics[];
  summary: OxygenQualitySummary;
}) {
  return (
    <div className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-dashboard-text">Kualitas Oksigen Bermasalah</h2>
          <p className="mt-1 text-sm text-dashboard-muted">Mesin aktif dengan purity O2 di bawah ambang normal. Unit offline tidak dihitung.</p>
        </div>
        <Badge className={levelStyles[summary.critical > 0 ? "critical" : summary.warning > 0 ? "warning" : "normal"]}>{issues.length} unit</Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal-700">Purity Mesin Aktif</p>
          <p className="mt-2 text-3xl font-bold leading-none text-dashboard-text">{formatNumber(summary.averageActivePurity, 1)}%</p>
          <p className="mt-1 text-xs text-dashboard-muted">Rata-rata dari {summary.active} unit aktif</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-md bg-white px-2 py-2 ring-1 ring-teal-100">
              <span className="block text-lg font-bold text-dashboard-critical">{summary.critical}</span>
              <span className="text-[11px] text-dashboard-muted">critical</span>
            </div>
            <div className="rounded-md bg-white px-2 py-2 ring-1 ring-teal-100">
              <span className="block text-lg font-bold text-dashboard-warning">{summary.warning}</span>
              <span className="text-[11px] text-dashboard-muted">warning</span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 min-w-0">
          {issues.slice(0, 3).map((station, index) => {
            const purityWidth = Math.min(100, Math.max(8, (station.oxygenPurity / 95) * 100));

            return (
              <div key={station.id} className="rounded-lg border border-dashboard-border bg-slate-50 px-3 py-2.5 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-dashboard-primary ring-1 ring-dashboard-border">
                        {index + 1}
                      </span>
                      <p className="truncate text-sm font-bold text-dashboard-text flex-1">{station.hospitalName}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-dashboard-muted">
                      {station.id} | {statusLabel(station.status)} | {station.lastUpdate}
                    </p>
                  </div>
                  <Badge className={`${levelStyles[station.purityLevel]} shrink-0 whitespace-nowrap`}>{station.oxygenPurity}%</Badge>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white ring-1 ring-dashboard-border">
                  <div
                    className={`h-full rounded-full ${station.purityLevel === "critical" ? "bg-dashboard-critical" : "bg-dashboard-warning"}`}
                    style={{ width: `${purityWidth}%` }}
                  />
                </div>
              </div>
            );
          })}

          {issues.length === 0 && (
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashboard-border bg-slate-50 px-4 text-center text-sm font-semibold text-dashboard-online">
              Semua mesin aktif berada di ambang purity normal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
