import { useState, useEffect } from "react";
import { X } from "lucide-react";

type ClientForm = {
  id?: string;
  hospitalName: string;
  province?: string;
  city?: string;
  address?: string;
  owner?: string;
  kelas?: string;
};

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: ClientForm) => Promise<void>;
  client?: ClientForm | null;
}

export function ClientModal({ isOpen, onClose, onSave, client }: ClientModalProps) {
  const [formData, setFormData] = useState<ClientForm>({
    hospitalName: "",
    province: "",
    city: "",
    address: "",
    owner: "",
    kelas: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!client;

  useEffect(() => {
    if (client) {
      setFormData({
        hospitalName: client.hospitalName || "",
        province: client.province || "",
        city: client.city || "",
        address: client.address || "",
        owner: client.owner || "",
        kelas: client.kelas || "",
        id: client.id,
      });
    } else {
      setFormData({
        hospitalName: "",
        province: "",
        city: "",
        address: "",
        owner: "",
        kelas: "",
      });
    }
    setError("");
  }, [client, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-dashboard-text">
            {isEditing ? "Edit Rumah Sakit" : "Tambah Rumah Sakit"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nama Rumah Sakit</label>
              <input
                required
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                placeholder="Contoh: RSUD Dr. Soetomo"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Provinsi (Opsional)</label>
                <input
                  value={formData.province || ""}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                  placeholder="Contoh: Jawa Timur"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Kab/Kota (Opsional)</label>
                <input
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                  placeholder="Contoh: Surabaya"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Alamat (Opsional)</label>
              <textarea
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                placeholder="Alamat lengkap rumah sakit..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Pemilik (Opsional)</label>
                <input
                  value={formData.owner || ""}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                  placeholder="Contoh: Pemprov / Swasta"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Kelas (Opsional)</label>
                <input
                  value={formData.kelas || ""}
                  onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                  className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                  placeholder="Contoh: C"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-dashboard-border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-dashboard-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isLoading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
