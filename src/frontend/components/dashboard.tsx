"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/frontend/components/layout/page-header";
import { Clock3, RefreshCw } from "lucide-react";
import { KpiStrip } from "@/frontend/components/dashboard/kpi-strip";
import { MachineStatusPanel } from "@/frontend/components/dashboard/machine-status-panel";
import { OxygenQualityPanel } from "@/frontend/components/dashboard/oxygen-quality-panel";
import { ProductionSummaryPanel } from "@/frontend/components/dashboard/production-summary-panel";
import { StationsTable, rowsPerPageOptions } from "@/frontend/components/dashboard/stations-table";
// Using dynamic fetch instead of static data
import { useAuth } from "@/frontend/hooks/useAuth";
import {
  getDashboardSummary,
  getFilteredStations,
  getOxygenQualityIssues,
  getOxygenQualitySummary,
  getStatusChart,
} from "@/frontend/lib/dashboard-analytics";
import type { HealthFilter, SortKey, SortDirection, StatusFilter } from "@/frontend/lib/dashboard-types";
import { enrichStation } from "@/frontend/lib/metrics";
import { dashboardRoleProfiles } from "@/frontend/lib/role-profiles";
import type { UserRole } from "@/shared/types";

export function Dashboard() {
  const [stations, setStations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchDashboardData = () => {
      fetch(`/api/dashboard?t=${Date.now()}`, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (data.machines && isMounted) {
            const assignedStations = data.machines.filter((m: any) => m.hospitalName !== "Not Assigned");
            setStations(assignedStations);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 3000); // Auto-update every 3 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const enrichedStations = useMemo(() => stations.map(enrichStation), [stations]);
  const { user } = useAuth();
  const role = user?.role || "viewer";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [purityFilter, setPurityFilter] = useState<HealthFilter>("all");
  const [pressureFilter, setPressureFilter] = useState<HealthFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastUpdate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[1]);

  const summary = useMemo(() => getDashboardSummary(enrichedStations), [enrichedStations]);
  const oxygenQualityIssues = useMemo(() => getOxygenQualityIssues(enrichedStations), [enrichedStations]);
  const oxygenQualitySummary = useMemo(
    () => getOxygenQualitySummary(enrichedStations, oxygenQualityIssues),
    [enrichedStations, oxygenQualityIssues],
  );
  const statusChart = useMemo(() => getStatusChart(enrichedStations), [enrichedStations]);
  const filteredStations = useMemo(
    () =>
      getFilteredStations(enrichedStations, {
        query,
        statusFilter,
        purityFilter,
        pressureFilter,
        sortKey,
        sortDirection,
      }),
    [enrichedStations, pressureFilter, purityFilter, query, sortDirection, sortKey, statusFilter],
  );

  const pageCount = Math.max(1, Math.ceil(filteredStations.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const visibleStations = filteredStations.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function handleSort(key: SortKey) {
    setSortKey(key);
    setSortDirection((current: SortDirection) => (sortKey === key && current === "asc" ? "desc" : "asc"));
  }

  function resetPage(callback: () => void) {
    callback();
    setPage(1);
  }

  return (
    <div className="pb-12">
      <PageHeader title="Dashboard" subtitle="Sistem Pemantauan Kualitas PSA Oxygen Online" variant="dashboard">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-dashboard-border bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Clock3 size={16} />
            Sync Realtime
          </div>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-md bg-dashboard-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="mt-12 text-center text-dashboard-muted">Memuat data stasiun...</div>
      ) : (
        <>
          <KpiStrip summary={summary} />
        
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
          <OxygenQualityPanel issues={oxygenQualityIssues} summary={oxygenQualitySummary} />
          <MachineStatusPanel statusChart={statusChart} />
          <ProductionSummaryPanel summary={summary} />
        </div>

        <StationsTable
          query={query}
          statusFilter={statusFilter}
          purityFilter={purityFilter}
          pressureFilter={pressureFilter}
          sortKey={sortKey}
          visibleStations={visibleStations}
          filteredCount={filteredStations.length}
          currentPage={currentPage}
          pageCount={pageCount}
          rowsPerPage={rowsPerPage}
          onQueryChange={(value) => resetPage(() => setQuery(value))}
          onStatusFilterChange={(value) => resetPage(() => setStatusFilter(value))}
          onPurityFilterChange={(value) => resetPage(() => setPurityFilter(value))}
          onPressureFilterChange={(value) => resetPage(() => setPressureFilter(value))}
          onRowsPerPageChange={(value) => resetPage(() => setRowsPerPage(value))}
          onPageChange={setPage}
          onSort={handleSort}
        />
        </>
      )}
    </div>
  );
}
