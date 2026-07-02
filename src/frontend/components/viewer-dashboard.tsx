"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/frontend/components/layout/page-header";
import { KpiStrip } from "@/frontend/components/dashboard/kpi-strip";
import { MachineStatusPanel } from "@/frontend/components/dashboard/machine-status-panel";
import { OxygenQualityPanel } from "@/frontend/components/dashboard/oxygen-quality-panel";
import { ProductionSummaryPanel } from "@/frontend/components/dashboard/production-summary-panel";
import { StationsTable, rowsPerPageOptions } from "@/frontend/components/dashboard/stations-table";
import { getDashboardSummary, getFilteredStations, getOxygenQualityIssues, getOxygenQualitySummary, getStatusChart } from "@/frontend/lib/dashboard-analytics";
import { enrichStation } from "@/frontend/lib/metrics";
import type { HealthFilter, SortKey, SortDirection, StatusFilter } from "@/frontend/lib/dashboard-types";

export function ViewerDashboard() {
  const [stations, setStations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDashboardData = () => {
      fetch(`/api/dashboard?t=${Date.now()}`, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (data.machines && isMounted) {
            const assignedStations = data.machines.filter((m: any) => m.hospitalName !== "Not Assigned");
            setStations(assignedStations);
            setErrorMsg(null);
          } else if (data.error && isMounted) {
            setErrorMsg(data.error);
          }
        })
        .catch(err => {
          console.error(err);
          if (isMounted) setErrorMsg(err.message);
        })
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [purityFilter, setPurityFilter] = useState<HealthFilter>("all");
  const [pressureFilter, setPressureFilter] = useState<HealthFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("healthScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[1]);

  const summary = useMemo(() => getDashboardSummary(enrichedStations), [enrichedStations]);
  const oxygenQualityIssues = useMemo(() => getOxygenQualityIssues(enrichedStations), [enrichedStations]);
  const oxygenQualitySummary = useMemo(() => getOxygenQualitySummary(enrichedStations, oxygenQualityIssues), [enrichedStations, oxygenQualityIssues]);
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
      <PageHeader title="Viewer" subtitle="TV Monitor Mode - Sistem Pemantauan Kualitas PSA Oxygen Online" showLogout={true} variant="dashboard">
        <img src="/logo-mgm.png" alt="MGM Logo" className="h-12 w-auto object-contain" />
      </PageHeader>
      <KpiStrip summary={summary} />

      {isLoading ? (
        <div className="mt-12 text-center text-dashboard-muted">Memuat data monitoring...</div>
      ) : errorMsg ? (
        <div className="mt-12 text-center text-red-500 font-bold bg-red-50 p-4 rounded-md border border-red-200">
          Error: {errorMsg}
          <br/>
          <span className="text-sm font-normal">Pastikan Anda sudah login atau hubungi administrator.</span>
        </div>
      ) : (
        <>
          <section className="mt-6">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr]">
              <OxygenQualityPanel issues={oxygenQualityIssues} summary={oxygenQualitySummary} />
              <MachineStatusPanel statusChart={statusChart} />
              <ProductionSummaryPanel summary={summary} />
            </div>
          </section>
          <div className="mt-6">
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
          </div>
        </>
      )}
    </div>
  );
}
