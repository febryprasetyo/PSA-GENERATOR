import { useState, useEffect } from "react";
import { User } from "@/shared/types";
import { HospitalSearchSelect } from "@/frontend/components/ui/hospital-search-select";
import { useAuth } from "@/frontend/hooks/useAuth";

// Client type removed

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<User> & { password?: string }) => Promise<void>;
  user?: User | null; // if null, it's create mode
}

export function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("operator");
  const [status, setStatus] = useState<User["status"]>("active");
  const [clientId, setClientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const { user: currentUser } = useAuth();
  const isOperator = currentUser?.role === "operator";

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
      setRole(isOperator ? "client" : user.role);
      setStatus(user.status);
      setClientId(user.clientId || "");
      setPassword("");
    } else {
      setName("");
      setUsername("");
      setRole(isOperator ? "client" : "operator");
      setStatus("active");
      setClientId("");
      setPassword("");
    }
    setError("");
  }, [user, isOpen, isOperator]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    
    try {
      const payload: Record<string, unknown> = { name, username, role, status };
      if (role === "client") {
        if (!clientId) {
          setError("Silakan pilih Rumah Sakit untuk role Client");
          setIsSaving(false);
          return;
        }
        payload.clientId = clientId;
      }
      if (password) {
        payload.password = password;
      }

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[95vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-dashboard-text">
            {user ? "Edit User" : "Tambah User Baru"}
          </h3>
          <button onClick={onClose} className="text-dashboard-muted hover:text-dashboard-text">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-dashboard-text">Nama Lengkap</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-dashboard-text">Username</label>
            <input
              required
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-10 w-full rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-dashboard-text">
              Password {user && <span className="text-xs text-dashboard-muted">(Kosongkan jika tidak ingin mengubah)</span>}
            </label>
            <input
              type="password"
              required={!user}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-dashboard-text">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
                disabled={isOperator}
                className="h-10 w-full rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary disabled:bg-slate-100 disabled:text-slate-500"
              >
                {!isOperator && <option value="admin">Admin</option>}
                {!isOperator && <option value="operator">Operator</option>}
                <option value="client">Client</option>
              </select>
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-dashboard-text">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as User["status"])}
                className="h-10 w-full rounded-md border border-dashboard-border px-3 text-sm outline-none focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {role === "client" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-dashboard-text">Rumah Sakit Terkait</label>
              <HospitalSearchSelect
                value={clientId}
                onChange={setClientId}
                initialHospitalName={user?.hospitalName || ""}
                placeholder="Ketik nama Rumah Sakit..."
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-dashboard-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-dashboard-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
