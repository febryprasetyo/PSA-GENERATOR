"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/frontend/components/layout/page-header";

const statusOptions = ["all", "online", "offline"] as const;

export default function DatabasePage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [timeRange, setTimeRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [dateWarning, setDateWarning] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Simple debounce for search input
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // basic debounce simulation
    setTimeout(() => {
      setDebouncedQuery(e.target.value);
      setPage(1); // reset page on search
    }, 500);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as typeof statusFilter);
    setPage(1);
  };

  useEffect(() => {
    let startDate = "";
    let endDate = "";
    const now = new Date();

    if (timeRange === "1d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      startDate = d.toISOString();
    } else if (timeRange === "1w") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString();
    } else if (timeRange === "1m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startDate = d.toISOString();
    } else if (timeRange === "3m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDate = d.toISOString();
    } else if (timeRange === "custom") {
      if (customStartDate) {
        startDate = new Date(customStartDate).toISOString();
      }
      if (customEndDate) {
        endDate = new Date(customEndDate).toISOString();
        // Set to end of day
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
      }

      if (customStartDate && customEndDate) {
        const diffTime = Math.abs(new Date(customEndDate).getTime() - new Date(customStartDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays > 90) {
          setDateWarning("Peringatan: Rentang waktu melebihi 3 bulan. Pencarian mungkin membutuhkan waktu lebih lama.");
        } else {
          setDateWarning("");
        }
      } else {
        setDateWarning("");
      }
    } else {
      setDateWarning("");
    }

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      query: debouncedQuery,
      status: statusFilter,
    });
    if (startDate) queryParams.set("startDate", startDate);
    if (endDate) queryParams.set("endDate", endDate);

    let isMounted = true;
    
    const fetchHistoryData = () => {
      fetch(`/api/history?${queryParams.toString()}&t=${Date.now()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (isMounted) {
            setData(json);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error(err);
            setError(err);
            setIsLoading(false);
          }
        });
    };

    setIsLoading(true);
    fetchHistoryData();

    return () => {
      isMounted = false;
    };
  }, [page, limit, debouncedQuery, statusFilter, timeRange, customStartDate, customEndDate, refreshKey]);

  // Manual refresh function
  const handleManualRefresh = () => {
    setPage(1); // Optional: reset to page 1 on refresh, or just trigger re-fetch.
    // To just re-fetch current page, we can use a dummy state to trigger useEffect, or call fetch directly.
    // A simple trick to re-fetch is just force re-render with a timestamp:
    setCustomStartDate(customStartDate); // Actually, better to add a refresh toggle state.
  };

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="pb-12">
      <PageHeader title="Database Logger PSA" subtitle="Tampilkan semua data logger PSA untuk metric dan status stasiun." />
      
      <div className="panel overflow-hidden mt-6">
        <div className="border-b border-dashboard-border bg-white px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-dashboard-text">Riwayat Data Mesin</h2>
              <div className="grid gap-3 sm:grid-cols-2 items-center">
                <button
                  type="button"
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-dashboard-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Refresh Data
                </button>
                <div className="rounded-lg border border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-text">
                  Total entri ditemukan: <span className="font-semibold">{isLoading && !data ? "..." : total}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-6">
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
              <input
                value={query}
                onChange={handleQueryChange}
                placeholder="Cari serial number atau nama rumah sakit..."
                className="h-10 rounded-md border border-dashboard-border bg-slate-50 px-4 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
              />
              <select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-dashboard-border bg-white px-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua Waktu</option>
                <option value="1d">1 Hari Terakhir</option>
                <option value="1w">1 Minggu Terakhir</option>
                <option value="1m">1 Bulan Terakhir</option>
                <option value="3m">3 Bulan Terakhir</option>
                <option value="custom">Pilih Tanggal</option>
              </select>
              <select
                value={statusFilter}
                onChange={handleStatusChange}
                className="h-10 rounded-md border border-dashboard-border bg-white px-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua status mesin</option>
                {statusOptions.filter(s => s !== "all").map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {timeRange === "custom" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-md border border-dashboard-border">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-dashboard-text">Mulai Tanggal</label>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }}
                      className="h-9 rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-dashboard-text">Sampai Tanggal</label>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }}
                      className="h-9 rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary"
                    />
                  </div>
                </div>
                {dateWarning && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md border border-yellow-200">
                    {dateWarning}
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-dashboard-border">
              <table className="min-w-full divide-y divide-dashboard-border bg-white text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Station</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Flow meter</th>
                    <th className="px-4 py-3">Flow meter 2</th>
                    <th className="px-4 py-3">Oxygen Purity</th>
                    <th className="px-4 py-3">Oxygen tank</th>
                    <th className="px-4 py-3">Total Flow</th>
                    <th className="px-4 py-3">Running Time</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashboard-border relative">
                  {isLoading && !data && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-dashboard-muted">
                        Memuat data...
                      </td>
                    </tr>
                  )}
                  {entries.map((entry: any, idx: number) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-dashboard-text">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.stationName} <span className="block text-xs text-dashboard-muted">{entry.stationId}</span></td>
                      <td className="px-4 py-4 text-dashboard-muted">{entry.timestamp}</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.centralFlow}</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.boosterFlow}</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.oxygenPurity}%</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.tankPressure} bar</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.totalFlow}</td>
                      <td className="px-4 py-4 text-dashboard-text">{entry.runningTime}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          entry.status === "online" ? "bg-green-50 text-dashboard-online ring-green-100" : "bg-red-50 text-dashboard-offline ring-red-100"
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && entries.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-sm text-dashboard-muted">
                        {error ? "Terjadi kesalahan saat memuat data." : "Tidak ada data riwayat yang ditemukan."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-dashboard-border">
                <div className="text-sm text-dashboard-muted">
                  Menampilkan <span className="font-medium text-dashboard-text">{Math.min((page - 1) * limit + 1, total)}</span> hingga <span className="font-medium text-dashboard-text">{Math.min(page * limit, total)}</span> dari <span className="font-medium text-dashboard-text">{total}</span> entri
                </div>
                
                <div className="flex items-center gap-2">
                  <select 
                    value={limit} 
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-dashboard-border bg-white px-2 text-sm text-dashboard-text outline-none"
                  >
                    <option value={10}>10 Baris</option>
                    <option value={25}>25 Baris</option>
                    <option value={50}>50 Baris</option>
                    <option value={100}>100 Baris</option>
                  </select>

                  <div className="flex items-center gap-1 rounded-md border border-dashboard-border bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded px-3 py-1 text-sm font-medium text-dashboard-text transition-colors hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      Sebelumnya
                    </button>
                    <div className="px-2 text-sm font-medium text-dashboard-muted">
                      {page} / {pageCount}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                      disabled={page === pageCount}
                      className="rounded px-3 py-1 text-sm font-medium text-dashboard-text transition-colors hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              </div>
            )}
            
        </div>
      </div>
    </div>
  );
}
