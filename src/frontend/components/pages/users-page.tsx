"use client";

import { useMemo, useState, useEffect } from "react";
import { UserModal } from "@/frontend/components/modals/user-modal";
import { User } from "@/shared/types";
import { useAuth } from "@/frontend/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, Plus, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/page-header";

const roleOptions = ["all", "admin", "operator", "client"] as const;
const statusOptions = ["all", "active", "inactive"] as const;

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<typeof roleOptions[number]>("all");
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>("all");
  const [activeTab, setActiveTab] = useState<"internal" | "client">(currentUser?.role === "operator" ? "client" : "internal");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (currentUser?.role === "client") {
      router.replace("/");
      return;
    }
    
    if (currentUser?.role === "operator") {
      setActiveTab("client");
    }

    fetchUsers();
  }, [authLoading, currentUser, router]);

  const handleSaveUser = async (data: Partial<User> & { password?: string }) => {
    const isEditing = !!selectedUser;
    const url = isEditing ? `/api/users/${selectedUser.id}` : "/api/users";
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

    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini secara permanen?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete user");
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => activeTab === "internal" ? u.role !== "client" : u.role === "client")
      .filter((u) =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.id.toLowerCase().includes(query.toLowerCase()),
      )
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter((u) => statusFilter === "all" || u.status === statusFilter);
  }, [users, query, roleFilter, statusFilter, activeTab]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      inactive: users.filter((u) => u.status === "inactive").length,
    };
  }, [users]);

  const isAdmin = currentUser?.role === "admin";
  const isOperator = currentUser?.role === "operator";

  if (authLoading || (!isAdmin && !isOperator && currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dashboard-bg">
        <p className="text-dashboard-muted">Memeriksa akses...</p>
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

        <PageHeader title="Manajemen User" subtitle="Kelola akun admin, operator, dan client untuk sistem PSA." />

        <div className="panel overflow-hidden mt-6">
          <div className="border-b border-dashboard-border bg-white px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {isAdmin && (
                <div className="flex space-x-1 rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => setActiveTab("internal")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                      activeTab === "internal"
                        ? "bg-white text-dashboard-text shadow-sm"
                        : "text-dashboard-muted hover:text-dashboard-text"
                    }`}
                  >
                    Tim Internal (Admin/Operator)
                  </button>
                  <button
                    onClick={() => setActiveTab("client")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                      activeTab === "client"
                        ? "bg-white text-dashboard-text shadow-sm"
                        : "text-dashboard-muted hover:text-dashboard-text"
                    }`}
                  >
                    User Client
                  </button>
                </div>
              )}
              {isOperator && (
                <div className="text-lg font-bold text-dashboard-text">
                  Daftar Klien Rumah Sakit
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-lg border border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-text">
                  Total user: <span className="font-semibold">{summary.total}</span>
                </div>
                <div className="rounded-lg border border-dashboard-border bg-slate-50 px-4 py-3 text-sm text-dashboard-text">
                  Aktif: <span className="font-semibold text-dashboard-online">{summary.active}</span>
                </div>
                {(isAdmin || isOperator) && (
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-dashboard-primary px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah User
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white p-6">
            <div className="grid gap-3 md:grid-cols-[minmax(200px,1.2fr)_repeat(2,minmax(180px,1fr))]">
              <div className="relative">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama, username, atau ID"
                  className="h-10 w-full rounded-md border border-dashboard-border bg-slate-50 px-4 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {activeTab === "internal" && (
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
                  className="h-10 rounded-md border border-dashboard-border bg-white px-3 text-sm outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">Semua role</option>
                  <option value="admin">admin</option>
                  <option value="operator">operator</option>
                </select>
              )}
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
                    <th className="px-4 py-3">User</th>
                    {activeTab === "client" && <th className="px-4 py-3">Rumah Sakit</th>}
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Login Terakhir</th>
                    {(isAdmin || isOperator) && <th className="px-4 py-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashboard-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={(isAdmin || isOperator) ? (activeTab === "client" ? 7 : 6) : 5} className="px-4 py-8 text-center text-sm text-dashboard-muted">Memuat data...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={(isAdmin || isOperator) ? (activeTab === "client" ? 7 : 6) : 5} className="px-4 py-8 text-center text-sm text-dashboard-muted">Tidak ada user yang cocok dengan filter.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 group">
                        <td className="px-4 py-4 font-semibold text-dashboard-text">
                          {u.name}
                        </td>
                        {activeTab === "client" && (
                          <td className="px-4 py-4 text-dashboard-muted">
                            {u.hospitalName || <span className="italic">Belum Diatur</span>}
                          </td>
                        )}
                        <td className="px-4 py-4 text-dashboard-text">{u.username}</td>
                        <td className="px-4 py-4 text-dashboard-muted capitalize">{u.role}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${u.status === "active" ? "bg-green-50 text-dashboard-online ring-green-100" : "bg-red-50 text-dashboard-offline ring-red-100"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-dashboard-muted">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("id-ID") : "-"}
                        </td>
                        {(isAdmin || isOperator) && (
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setIsModalOpen(true);
                                }}
                                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-dashboard-primary transition"
                                title="Edit User"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(u.id)}
                                disabled={currentUser?.id === u.id}
                                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                                title={currentUser?.id === u.id ? "Tidak bisa menghapus akun sendiri" : "Hapus User"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
      />
    </div>
  );
}
