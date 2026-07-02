"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Hospital, Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/page-header";
import { ClientModal } from "@/frontend/components/modals/client-modal";
import { useAuth } from "@/frontend/hooks/useAuth";
import { useDebounce } from "@/frontend/hooks/useDebounce";

type Client = {
  id: string;
  hospitalName: string;
  province?: string;
  city?: string;
  address?: string;
  owner?: string;
  kelas?: string;
};

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Pagination & Search & Sort state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [sortBy, setSortBy] = useState("hospitalName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [totalRecords, setTotalRecords] = useState(0);

  const { user } = useAuth();
  
  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "admin" || user?.role === "operator";

  function fetchClients() {
    setIsLoading(true);
    const query = new URLSearchParams({
      page: page.toString(),
      limit: "20",
      search: debouncedSearch,
      sortBy,
      sortOrder,
    });
    
    fetch(`/api/clients?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) {
          setClients(data.clients);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotalRecords(data.pagination?.total || 0);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    fetchClients();
  }, [page, debouncedSearch, sortBy, sortOrder]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  async function handleSaveClient(clientData: Partial<Client>) {
    const isEditing = !!selectedClient;
    const url = isEditing ? `/api/clients/${selectedClient.id}` : "/api/clients";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Gagal menyimpan client");
    }

    fetchClients();
    setIsModalOpen(false);
  }

  async function handleDeleteClient(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus Rumah Sakit ini? Data tidak dapat dipulihkan jika sudah terhapus.")) return;

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal menghapus client");
        return;
      }
      fetchClients();
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  }

  function openCreateModal() {
    setSelectedClient(null);
    setIsModalOpen(true);
  }

  function openEditModal(client: Client) {
    setSelectedClient(client);
    setIsModalOpen(true);
  }

  if (user?.role === "client") {
    return (
      <div className="pb-12">
        <PageHeader title="Manajemen Rumah Sakit" subtitle="Akses Ditolak" />
        <div className="mt-8 text-center text-dashboard-muted">Anda tidak memiliki izin untuk melihat halaman ini.</div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <PageHeader title="Master Data Rumah Sakit" subtitle="Kelola daftar klien rumah sakit (Master Client)">
        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-dashboard-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={16} />
            Tambah Rumah Sakit
          </button>
        )}
      </PageHeader>

      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border border-dashboard-border bg-white py-2 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-dashboard-primary focus:outline-none focus:ring-1 focus:ring-dashboard-primary"
            placeholder="Cari rumah sakit, provinsi, kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-dashboard-muted">
          Total: <span className="font-semibold text-dashboard-text">{totalRecords}</span> Data
        </div>
      </div>

      <div className="mt-4 panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-dashboard-muted">
              <tr className="border-b border-dashboard-border">
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort("hospitalName")}>
                  <div className="flex items-center gap-1">Rumah Sakit <ArrowUpDown size={14} className={sortBy === "hospitalName" ? "text-dashboard-primary" : "text-slate-300"} /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort("province")}>
                  <div className="flex items-center gap-1">Provinsi <ArrowUpDown size={14} className={sortBy === "province" ? "text-dashboard-primary" : "text-slate-300"} /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort("city")}>
                  <div className="flex items-center gap-1">Kab/Kota <ArrowUpDown size={14} className={sortBy === "city" ? "text-dashboard-primary" : "text-slate-300"} /></div>
                </th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-4 py-3">Pemilik</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort("kelas")}>
                  <div className="flex items-center gap-1">Kelas <ArrowUpDown size={14} className={sortBy === "kelas" ? "text-dashboard-primary" : "text-slate-300"} /></div>
                </th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-dashboard-muted">
                    Memuat data...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-dashboard-muted">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="border-b border-dashboard-border transition hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-dashboard-primary">
                          <Hospital size={18} />
                        </div>
                        <div className="font-semibold text-dashboard-text">{client.hospitalName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-dashboard-muted">{client.province || "-"}</td>
                    <td className="px-4 py-4 text-dashboard-muted">{client.city || "-"}</td>
                    <td className="px-4 py-4 text-dashboard-muted">{client.address || "-"}</td>
                    <td className="px-4 py-4 text-dashboard-muted">{client.owner || "-"}</td>
                    <td className="px-4 py-4 font-medium text-slate-700">{client.kelas || "-"}</td>
                    <td className="px-4 py-4 text-right">
                      {canManage && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(client)}
                            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-dashboard-primary"
                            title="Edit Rumah Sakit"
                          >
                            <Pencil size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Hapus Rumah Sakit"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && clients.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-dashboard-muted">
            Halaman <span className="font-medium text-dashboard-text">{page}</span> dari <span className="font-medium text-dashboard-text">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 items-center gap-1 rounded-md border border-dashboard-border bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 items-center gap-1 rounded-md border border-dashboard-border bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white"
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        client={selectedClient}
      />
    </div>
  );
}
