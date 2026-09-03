import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Droplets,
  Gauge,
  Hospital,
  ListFilter,
  MapPin,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Badge, levelStyles, statusStyles } from "@/frontend/components/ui/badge";
import { FilterSelect } from "@/frontend/components/ui/filter-select";
import { SortButton } from "@/frontend/components/ui/sort-button";
import { NullableMetric } from "@/frontend/components/ui/nullable-metric";
import type { AreaFilter, HealthFilter, SortKey, StatusFilter } from "@/frontend/lib/dashboard-types";
import { formatNumber, statusLabel } from "@/frontend/lib/metrics";
import type { HealthLevel, StationWithMetrics } from "@/frontend/lib/types";

export const rowsPerPageOptions = [10, 25, 50, 100];

export function StationsTable({
  query,
  areas,
  areaFilter,
  statusFilter,
  purityFilter,
  pressureFilter,
  sortKey,
  visibleStations,
  filteredCount,
  currentPage,
  pageCount,
  rowsPerPage,
  onQueryChange,
  onAreaFilterChange,
  onStatusFilterChange,
  onPurityFilterChange,
  onPressureFilterChange,
  onRowsPerPageChange,
  onPageChange,
  onSort,
  showAreaFilter = true,
}: {
  query: string;
  areas: { id: string; name: string }[];
  areaFilter: AreaFilter;
  statusFilter: StatusFilter;
  purityFilter: HealthFilter;
  pressureFilter: HealthFilter;
  sortKey: SortKey;
  visibleStations: StationWithMetrics[];
  filteredCount: number;
  currentPage: number;
  pageCount: number;
  rowsPerPage: number;
  onQueryChange: (value: string) => void;
  onAreaFilterChange: (value: AreaFilter) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onPurityFilterChange: (value: HealthFilter) => void;
  onPressureFilterChange: (value: HealthFilter) => void;
  onRowsPerPageChange: (value: number) => void;
  onPageChange: (value: number | ((current: number) => number)) => void;
  onSort: (key: SortKey) => void;
  showAreaFilter?: boolean;
}) {
  return (
    <div className="panel mt-5 overflow-hidden">
      <div className="border-b border-dashboard-border p-4">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-dashboard-text">List Stasiun Pemasangan Realtime</h2>
            <p className="mt-1 text-sm text-dashboard-muted">
              Menampilkan {formatNumber(visibleStations.length)} dari {formatNumber(filteredCount)} stasiun. Untuk 100+ mesin, data dibagi halaman agar cepat dibaca dan tetap ringan.
            </p>
          </div>
          <div className={`grid gap-2 ${showAreaFilter ? "md:grid-cols-[minmax(240px,1.25fr)_repeat(4,minmax(155px,0.75fr))]" : "md:grid-cols-[minmax(240px,1.25fr)_repeat(3,minmax(155px,0.75fr))]"}`}>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Cari rumah sakit atau ID"
                className="h-10 w-full rounded-md border border-dashboard-border bg-white pl-9 pr-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {showAreaFilter && <FilterSelect icon={MapPin} value={areaFilter} onChange={(value) => onAreaFilterChange(value as AreaFilter)}>
              <option value="all">Semua Area</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              <option value="unassigned">Belum Memiliki Area</option>
            </FilterSelect>}
            <FilterSelect icon={SlidersHorizontal} value={statusFilter} onChange={(value) => onStatusFilterChange(value as StatusFilter)}>
              <option value="all">Semua status</option>
              <option value="online">Menyala</option>
              <option value="offline">Mati</option>
              <option value="warning">Warning</option>
            </FilterSelect>
            <FilterSelect icon={Droplets} value={purityFilter} onChange={(value) => onPurityFilterChange(value as HealthFilter)}>
              <option value="all">Semua purity</option>
              <option value="normal">Purity Optimal</option>
              <option value="critical">Purity Kritis</option>
            </FilterSelect>
            <FilterSelect icon={Gauge} value={pressureFilter} onChange={(value) => onPressureFilterChange(value as HealthFilter)}>
              <option value="all">Semua tekanan</option>
              <option value="normal">Tekanan normal</option>
              <option value="warning">Tekanan warning</option>
              <option value="critical">Tekanan critical</option>
            </FilterSelect>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1380px] w-full border-collapse">
          <thead className="bg-slate-50">
            <tr className="border-b border-dashboard-border">
              <th className="px-4 py-3 text-left"><SortButton label="Nama Rumah Sakit" column="hospitalName" sortKey={sortKey} onSort={onSort} /></th>
              <th className="px-4 py-3 text-right"><SortButton label="MC/day (Nm³)" column="capacityMcDay" sortKey={sortKey} onSort={onSort} /></th>
              <th className="px-4 py-3 text-right">MC/bulan (Nm³)</th>
              <th className="px-4 py-3 text-right">Flow Meter 1 (Nm³/h)</th>
              <th className="px-4 py-3 text-right">Flow Meter 2 (Nm³/h)</th>
              <th className="px-4 py-3 text-right"><SortButton label="Total Flow (Nm³/h)" column="totalFlow" sortKey={sortKey} onSort={onSort} /></th>
              <th className="px-4 py-3 text-right"><SortButton label="Oxygen Purity" column="oxygenPurity" sortKey={sortKey} onSort={onSort} /></th>
              <th className="px-4 py-3 text-right"><SortButton label="Tekanan O2 tank" column="tankPressure" sortKey={sortKey} onSort={onSort} /></th>
              <th className="px-4 py-3 text-right">Vessel 1 (MPa)</th>
              <th className="px-4 py-3 text-right">Vessel 2 (MPa)</th>
              <th className="px-4 py-3 text-center"><SortButton label="Status" column="status" sortKey={sortKey} onSort={onSort} /></th>
              <th className="px-4 py-3 text-center"><SortButton label="Health" column="healthScore" sortKey={sortKey} onSort={onSort} /></th>
            </tr>
          </thead>
          <tbody>
            {visibleStations.map((station) => (
              <StationRow key={station.id} station={station} showArea={showAreaFilter} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col justify-between gap-3 border-t border-dashboard-border px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-dashboard-muted">
          <ListFilter size={16} />
          <span>Baris per halaman</span>
          <select
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            className="h-9 rounded-md border border-dashboard-border bg-white px-2 text-sm text-dashboard-text"
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-dashboard-muted">Halaman {currentPage} dari {pageCount}</span>
          <button type="button" className="icon-button" onClick={() => onPageChange((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label="Halaman sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="icon-button" onClick={() => onPageChange((value) => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} aria-label="Halaman berikutnya">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-muted">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <span className="font-semibold text-dashboard-text">Legenda Purity:</span>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-500"></span>≥90% Optimal</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500"></span>&lt;90% Kritis</span>
          </div>
        </div>
        <div className="text-xs font-medium">Data diperbarui setiap 3 detik</div>
      </div>
    </div>
  );
}

function StationRow({ station, showArea }: { station: StationWithMetrics; showArea: boolean }) {
  const StatusIcon = station.status === "online" ? CircleCheck : station.status === "offline" ? CircleX : TriangleAlert;
  const utilizationLevel: HealthLevel = station.utilization > 100 ? "critical" : station.utilization >= 85 || station.utilization < 30 ? "warning" : "normal";

  return (
    <tr className="border-b border-dashboard-border bg-white transition hover:bg-slate-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-dashboard-primary">
            <Hospital size={19} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-dashboard-text">{station.hospitalName}</p>
            <p className="mt-1 text-xs text-dashboard-muted">
              {station.id} | {showArea && <>{station.areaName || "Belum Memiliki Area"} | </>}{station.region} | {station.machineCount} mesin | {station.runningTimeHours ? formatNumber(station.runningTimeHours) : 0} jam | Sync: {new Date(station.lastUpdate).toLocaleTimeString("id-ID")}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right text-sm font-semibold text-dashboard-text">{formatNumber(station.capacityMcDay || 0)}</td>
      <td className="px-4 py-4 text-right text-sm font-semibold text-dashboard-text">{formatNumber(station.capacityMcMonth || 0)}</td>
      <td className="px-4 py-4 text-right text-sm text-slate-700">
        <span className="inline-flex items-center justify-end gap-1"><Activity size={14} className="text-dashboard-central" />{formatNumber(station.centralFlow, 1)}</span>
      </td>
      <td className="px-4 py-4 text-right text-sm text-slate-700">
        <span className="inline-flex items-center justify-end gap-1"><Zap size={14} className="text-dashboard-booster" />{formatNumber(station.boosterFlow, 1)}</span>
      </td>
      <td className="px-4 py-4 text-right text-sm font-semibold text-dashboard-primary">{formatNumber(station.totalFlow, 1)}</td>
      <td className="px-4 py-4 text-right">
        <Badge className={station.purityLevel === "normal" ? levelStyles.normal : "border-amber-200 bg-amber-50 text-amber-700"}>{station.oxygenPurity}%</Badge>
      </td>
      <td className="px-4 py-4 text-right">
        <Badge className={levelStyles[station.pressureLevel]}>{station.tankPressure} bar</Badge>
      </td>
      <td className="px-4 py-4 text-right text-sm text-slate-700"><NullableMetric value={station.vessel1} suffix="MPa" /></td>
      <td className="px-4 py-4 text-right text-sm text-slate-700"><NullableMetric value={station.vessel2} suffix="MPa" /></td>
      <td className="px-4 py-4 text-center">
        <Badge className={statusStyles[station.status]}><StatusIcon size={13} />{statusLabel(station.status)}</Badge>
      </td>
      <td className="px-4 py-4 text-center">
        <Badge className={levelStyles[station.healthLevel]}>{station.healthScore}/100</Badge>
      </td>
    </tr>
  );
}
