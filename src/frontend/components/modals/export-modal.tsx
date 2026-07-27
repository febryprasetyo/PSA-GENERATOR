"use client";

import { useEffect, useState } from "react";
import { X, Download, Eye, AlertCircle, CheckCircle2, Calendar, HardDrive, RefreshCw } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MachineItem {
  id: string;
  serialNumber: string;
  machineName: string;
  hospitalName?: string;
  clientId?: string;
}

interface PreviewEntry {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  oxygenPurity: number;
  tankPressure: number;
  centralFlow: number;
  boosterFlow: number;
  totalFlow: number;
  runningTime: number;
  status: string;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [machines, setMachines] = useState<MachineItem[]>([]);
  // selectedTarget format: "all:all" | "hospital:<clientId>" | "machine:<serialNumber>"
  const [selectedTarget, setSelectedTarget] = useState<string>("all:all");
  const [timeRange, setTimeRange] = useState<string>("1w");
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [dateError, setDateError] = useState<string>("");
  const [isLoadingMachines, setIsLoadingMachines] = useState<boolean>(false);
  
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{ entries: PreviewEntry[]; total: number } | null>(null);
  const [hasPreviewed, setHasPreviewed] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string>("");

  // Auto calculate preset dates when timeRange changes
  useEffect(() => {
    const now = new Date();
    const endStr = now.toISOString().split("T")[0];
    let startStr = "";

    if (timeRange === "1d") {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      startStr = d.toISOString().split("T")[0];
    } else if (timeRange === "1w") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startStr = d.toISOString().split("T")[0];
    } else if (timeRange === "1m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      startStr = d.toISOString().split("T")[0];
    } else if (timeRange === "3m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startStr = d.toISOString().split("T")[0];
    }

    if (timeRange !== "custom") {
      setStartDate(startStr);
      setEndDate(endStr);
    }
  }, [timeRange]);

  // Validate dates & reset preview when selection changes
  useEffect(() => {
    setHasPreviewed(false);
    setPreviewData(null);
    if (!startDate || !endDate) {
      setDateError("Tanggal mulai dan tanggal akhir wajib diisi.");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setDateError("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
      return;
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
      setDateError("Maksimum rentang waktu pengunduhan data adalah 3 bulan (90 hari).");
      return;
    }

    setDateError("");
  }, [startDate, endDate, selectedTarget]);

  // Fetch machines list on modal open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingMachines(true);
      fetch("/api/machines")
        .then((res) => res.json())
        .then((json) => {
          if (json.machines) setMachines(json.machines);
        })
        .catch((err) => console.error("Fetch machines error:", err))
        .finally(() => setIsLoadingMachines(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter ONLY machines that have an assigned hospital (clientId & hospitalName)
  const assignedMachines = machines.filter((m) => m.clientId && m.hospitalName);

  // Group assigned machines by Hospital ID/Name
  const hospitalGroups = assignedMachines.reduce((acc, m) => {
    const hospId = m.clientId!;
    const hospName = m.hospitalName!;
    if (!acc[hospId]) {
      acc[hospId] = { id: hospId, name: hospName, machines: [] };
    }
    acc[hospId].machines.push(m);
    return acc;
  }, {} as Record<string, { id: string; name: string; machines: MachineItem[] }>);

  // Parse selectedTarget helper
  const getSelectedParams = () => {
    let hospitalId = "";
    let serialNumber = "";
    if (selectedTarget.startsWith("hospital:")) {
      hospitalId = selectedTarget.replace("hospital:", "");
    } else if (selectedTarget.startsWith("machine:")) {
      serialNumber = selectedTarget.replace("machine:", "");
    }
    return { hospitalId, serialNumber };
  };

  // Handle Fetch Preview Data
  const handleFetchPreview = async () => {
    if (dateError) return;

    setIsPreviewLoading(true);
    setExportError("");

    try {
      const { hospitalId, serialNumber } = getSelectedParams();
      const queryParams = new URLSearchParams({
        page: "1",
        limit: "5",
      });

      if (hospitalId) queryParams.set("hospitalId", hospitalId);
      if (serialNumber) queryParams.set("serialNumber", serialNumber);

      if (startDate) {
        queryParams.set("startDate", new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryParams.set("endDate", end.toISOString());
      }

      const res = await fetch(`/api/history?${queryParams.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memuat pratinjau data.");
      }

      setPreviewData(json);
      setHasPreviewed(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat pratinjau data.";
      setExportError(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Handle Download CSV
  const handleDownloadCSV = async () => {
    if (!hasPreviewed || dateError || !previewData || previewData.total === 0) return;

    setIsExporting(true);
    setExportError("");

    try {
      const { hospitalId, serialNumber } = getSelectedParams();
      const queryParams = new URLSearchParams();

      if (hospitalId) queryParams.set("hospitalId", hospitalId);
      if (serialNumber) queryParams.set("serialNumber", serialNumber);

      if (startDate) {
        queryParams.set("startDate", new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryParams.set("endDate", end.toISOString());
      }

      const res = await fetch(`/api/history/export?${queryParams.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunduh file CSV.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `machine_readings_export_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengunduh file CSV.";
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const isDownloadable = hasPreviewed && !dateError && previewData && previewData.total > 0 && !isExporting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-dashboard-border overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dashboard-border bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-dashboard-text">Export Data Machine Readings</h2>
              <p className="text-xs text-dashboard-muted">Pilih Rumah Sakit/stasiun & rentang waktu, verifikasi pratinjau, lalu unduh CSV.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-dashboard-muted hover:bg-slate-200 hover:text-dashboard-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 max-h-[75vh] overflow-y-auto">
          
          {/* Filter Form */}
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* Hospital & Machine Filter Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dashboard-text flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-dashboard-primary" />
                Pilih Rumah Sakit & Mesin
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                disabled={isLoadingMachines}
                className="h-10 rounded-md border border-dashboard-border bg-slate-50 px-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              >
                <option value="all:all">Semua Rumah Sakit & Stasiun</option>
                {Object.values(hospitalGroups).map((group) => (
                  <optgroup key={group.id} label={`🏥 ${group.name}`}>
                    <option value={`hospital:${group.id}`}>
                      Semua Mesin di {group.name} ({group.machines.length} Mesin)
                    </option>
                    {group.machines.map((m) => (
                      <option key={m.id} value={`machine:${m.serialNumber}`}>
                        └ {m.machineName || "Mesin"} ({m.serialNumber})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Time Preset Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dashboard-text flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-dashboard-primary" />
                Rentang Waktu Preset
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="h-10 rounded-md border border-dashboard-border bg-slate-50 px-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
              >
                <option value="1d">1 Hari Terakhir</option>
                <option value="1w">1 Minggu Terakhir</option>
                <option value="1m">1 Bulan Terakhir</option>
                <option value="3m">3 Bulan Terakhir (Maksimal)</option>
                <option value="custom">Pilih Tanggal Manual</option>
              </select>
            </div>

            {/* Date Pickers */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dashboard-text">Mulai Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setTimeRange("custom");
                  setStartDate(e.target.value);
                }}
                className="h-10 rounded-md border border-dashboard-border bg-white px-3 text-sm outline-none focus:border-dashboard-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dashboard-text">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setTimeRange("custom");
                  setEndDate(e.target.value);
                }}
                className="h-10 rounded-md border border-dashboard-border bg-white px-3 text-sm outline-none focus:border-dashboard-primary"
              />
            </div>

          </div>

          {/* Validation Warning */}
          {dateError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{dateError}</span>
            </div>
          )}

          {/* Export Error */}
          {exportError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Preview Trigger Button */}
          <div className="flex items-center justify-between border-t border-dashboard-border pt-4">
            <div className="text-xs text-dashboard-muted">
              Klik <strong>&quot;Pratinjau Data&quot;</strong> untuk memverifikasi entri sebelum mengunduh.
            </div>
            <button
              type="button"
              onClick={handleFetchPreview}
              disabled={!!dateError || isPreviewLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-dashboard-primary px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isPreviewLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Memuat Pratinjau...
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Tampilkan Pratinjau Data
                </>
              )}
            </button>
          </div>

          {/* Preview Table Section */}
          {hasPreviewed && previewData && (
            <div className="space-y-3 rounded-lg border border-dashboard-border bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Pratinjau Ditemukan: {previewData.total.toLocaleString("id-ID")} Entri</span>
                </div>
                {previewData.total > 0 && (
                  <span className="text-[11px] text-dashboard-muted">Menampilkan 5 baris pertama sampel</span>
                )}
              </div>

              {previewData.total === 0 ? (
                <div className="py-6 text-center text-xs text-dashboard-muted">
                  Tidak ada data yang ditemukan untuk filter & rentang tanggal yang dipilih.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-dashboard-border bg-white">
                  <table className="min-w-full divide-y divide-dashboard-border text-left text-xs">
                    <thead className="bg-slate-100 text-dashboard-text font-semibold">
                      <tr>
                        <th className="px-3 py-2">Stasiun / Rumah Sakit</th>
                        <th className="px-3 py-2">Waktu</th>
                        <th className="px-3 py-2">O2 Purity</th>
                        <th className="px-3 py-2">Tank Press</th>
                        <th className="px-3 py-2">Flow Sentral</th>
                        <th className="px-3 py-2">Total Flow</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashboard-border">
                      {previewData.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-dashboard-text font-medium">{entry.stationName}</td>
                          <td className="px-3 py-2 text-dashboard-muted">{entry.timestamp}</td>
                          <td className="px-3 py-2 text-dashboard-text">{entry.oxygenPurity}%</td>
                          <td className="px-3 py-2 text-dashboard-text">{entry.tankPressure} bar</td>
                          <td className="px-3 py-2 text-dashboard-text">{entry.centralFlow} L/min</td>
                          <td className="px-3 py-2 text-dashboard-text">{entry.totalFlow}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-dashboard-border bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-dashboard-border bg-white px-4 py-2 text-xs font-semibold text-dashboard-text hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={!isDownloadable}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Mengunduh CSV..." : "Download CSV (Excel)"}
          </button>
        </div>

      </div>
    </div>
  );
}
