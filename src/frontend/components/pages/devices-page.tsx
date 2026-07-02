"use client";

import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/frontend/components/layout/page-header";
import { MachineModal } from "@/frontend/components/modals/machine-modal";
import { useAuth } from "@/frontend/hooks/useAuth";
import { Edit2, Trash2, Plus, AlertTriangle, Check, X, RefreshCw } from "lucide-react";

const statusOptions = ["all", "online", "offline", "warning"] as const;

export default function DevicesPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);

  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/machines");
      if (!res.ok) throw new Error("Failed to fetch machines");
      const data = await res.json();
      setMachines(data.machines || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (currentUser) {
      fetchMachines();
    }
  }, [authLoading, currentUser]);

  const handleSaveMachine = async (data: any) => {
    const isEditing = !!selectedMachine;
    const url = isEditing ? `/api/machines/${selectedMachine.id}` : "/api/machines";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Something went wrong");
    }

    fetchMachines();
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/machines/sync", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to sync machines");
      alert(`Berhasil sinkronisasi. ${result.syncedCount} mesin baru ditambahkan.`);
      fetchMachines();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string, isOperator: boolean) => {
    const msg = isOperator 
      ? "Ajukan penghapusan mesin ini ke Admin?" 
      : "Apakah Anda yakin ingin menghapus mesin ini? Histori data akan tetap tersimpan.";
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/machines/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete machine");
      fetchMachines();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveDelete = async (id: string) => {
    if (!confirm("Setujui penghapusan mesin ini?")) return;
    try {
      const res = await fetch(`/api/machines/${id}/approve-delete`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyetujui");
      fetchMachines();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectDelete = async (id: string) => {
    if (!confirm("Tolak pengajuan penghapusan mesin ini?")) return;
    try {
      const res = await fetch(`/api/machines/${id}/reject-delete`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menolak");
      fetchMachines();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredMachines = useMemo(() => {
    return machines
      .filter((machine) =>
        (machine.serialNumber || "").toLowerCase().includes(query.toLowerCase()) ||
        (machine.machineName || "").toLowerCase().includes(query.toLowerCase()) ||
        (machine.hospitalName || "").toLowerCase().includes(query.toLowerCase())
      )
      .filter((machine) => statusFilter === "all" || machine.status === statusFilter);
  }, [machines, query, statusFilter]);

  const summary = useMemo(() => {
    const total = machines.length;
    const online = machines.filter((m) => m.status === "online").length;
    const offline = machines.filter((m) => m.status === "offline").length;
    const warning = machines.filter((m) => m.status === "warning").length;

    return { total, online, offline, warning };
  }, [machines]);

  const isAdminOrOperator = currentUser?.role === "admin" || currentUser?.role === "operator";

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dashboard-bg">
        <p className="text-dashboard-muted">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 border border-red-100">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <PageHeader title="Manajemen Mesin" subtitle="Kelola dan pantau mesin PSA gas medis yang terhubung." />
      
      <div className="panel overflow-hidden mt-6">
        <div className="border-b border-dashboard-border bg-white px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg border border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-text">
                Total Mesin: <span className="font-semibold">{summary.total}</span>
              </div>
              <div className="rounded-lg border border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-text">
                Online: <span className="font-semibold text-dashboard-online">{summary.online}</span>
              </div>
              <div className="rounded-lg border border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-text">
                Offline: <span className="font-semibold text-dashboard-offline">{summary.offline}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {currentUser?.role === "admin" && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Menyelaraskan..." : "Sync MQTT"}
                </button>
              )}
              {isAdminOrOperator && (
                <button
                  onClick={() => {
                    setSelectedMachine(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-dashboard-primary px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Mesin
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white p-6">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari serial, nama, atau rumah sakit"
              className="h-10 rounded-md border border-dashboard-border bg-slate-50 px-4 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="h-10 rounded-md border border-dashboard-border bg-white px-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Semua status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-dashboard-border">
            <table className="min-w-full divide-y divide-dashboard-border bg-white text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Serial Number</th>
                  <th className="px-4 py-3">Nama Mesin</th>
                  <th className="px-4 py-3">Rumah Sakit</th>
                  <th className="px-4 py-3">Kapasitas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tanggal Ditambahkan</th>
                  {isAdminOrOperator && <th className="px-4 py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dashboard-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdminOrOperator ? 7 : 6} className="px-4 py-8 text-center text-sm text-dashboard-muted">Memuat data...</td>
                  </tr>
                ) : filteredMachines.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrOperator ? 7 : 6} className="px-4 py-8 text-center text-sm text-dashboard-muted">Tidak ada mesin yang ditemukan.</td>
                  </tr>
                ) : (
                  filteredMachines.map((machine) => (
                    <tr key={machine.id} className="hover:bg-slate-50 group">
                      <td className="px-4 py-4 font-semibold text-dashboard-text">{machine.serialNumber}</td>
                      <td className="px-4 py-4 text-dashboard-text">
                        {machine.machineName}
                        {machine.model && <div className="text-xs text-dashboard-muted mt-1">{machine.model}</div>}
                      </td>
                      <td className="px-4 py-4 text-dashboard-text">
                        {machine.hospitalName ? (
                          machine.hospitalName
                        ) : (
                          <span className="text-dashboard-muted italic text-xs bg-slate-100 px-2 py-1 rounded-md">Belum Ditugaskan (Inventory)</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-dashboard-muted">
                        <div className="flex gap-4">
                          <div>
                            <span className="font-medium text-slate-700">{machine.capacityMcDay ? Number(machine.capacityMcDay) : '-'}</span> 
                            <span className="text-xs ml-1">m³/hari</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">{machine.capacityMcMonth ? Number(machine.capacityMcMonth) : '-'}</span> 
                            <span className="text-xs ml-1">m³/bulan</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          machine.status === "online" ? "bg-green-50 text-dashboard-online ring-green-100" :
                          machine.status === "offline" ? "bg-red-50 text-dashboard-offline ring-red-100" :
                          "bg-amber-50 text-dashboard-warning ring-amber-100"
                        }`}>
                          {machine.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-dashboard-muted">
                        {machine.createdAt ? new Date(machine.createdAt).toLocaleString('id-ID') : '-'}
                      </td>
                      {isAdminOrOperator && (
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2 transition-opacity">
                            {machine.pendingDelete ? (
                              currentUser?.role === "admin" ? (
                                <>
                                  <button
                                    onClick={() => handleApproveDelete(machine.id)}
                                    className="rounded flex items-center gap-1 bg-green-50 px-2 py-1 text-xs font-semibold text-green-600 hover:bg-green-100 transition"
                                    title="Setujui Hapus"
                                  >
                                    <Check className="h-3 w-3" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectDelete(machine.id)}
                                    className="rounded flex items-center gap-1 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                                    title="Tolak Hapus"
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-medium text-amber-500 bg-amber-50 px-2 py-1 rounded">Pending Delete</span>
                              )
                            ) : (
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                                <button
                                  onClick={() => {
                                    setSelectedMachine(machine);
                                    setIsModalOpen(true);
                                  }}
                                  className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-dashboard-primary transition"
                                  title="Edit Mesin"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(machine.id, currentUser?.role === "operator")}
                                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                  title="Hapus Mesin"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <MachineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMachine}
        machine={selectedMachine}
      />
    </div>
  );
}
