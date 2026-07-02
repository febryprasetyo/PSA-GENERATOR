import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/frontend/hooks/useAuth";
import { HospitalSearchSelect } from "@/frontend/components/ui/hospital-search-select";

type MachineForm = {
  id?: string;
  clientId: string;
  serialNumber: string;
  machineName: string;
  model: string;
  capacityMcDay: string;
  capacityMcMonth: string;
};

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  machine?: any; // the selected machine if editing
}

export function MachineModal({ isOpen, onClose, onSave, machine }: MachineModalProps) {
  const [formData, setFormData] = useState<MachineForm>({
    clientId: "",
    serialNumber: "",
    machineName: "",
    model: "",
    capacityMcDay: "",
    capacityMcMonth: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const isEditing = !!machine;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isOpen) {
      if (isEditing && machine) {
        setFormData({
          id: machine.id,
          clientId: machine.clientId || "",
          serialNumber: machine.serialNumber || "",
          machineName: machine.machineName || "",
          model: machine.model || "",
          capacityMcDay: machine.capacityMcDay ? String(machine.capacityMcDay) : "",
          capacityMcMonth: machine.capacityMcMonth ? String(machine.capacityMcMonth) : "",
        });
      } else {
        setFormData({
          clientId: "",
          serialNumber: "",
          machineName: "",
          model: "",
          capacityMcDay: "",
          capacityMcMonth: "",
        });
      }
      setError("");
    }
  }, [isOpen, machine, isEditing]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await onSave({
        ...formData,
        capacityMcDay: formData.capacityMcDay ? Number(formData.capacityMcDay) : null,
        capacityMcMonth: formData.capacityMcMonth ? Number(formData.capacityMcMonth) : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-dashboard-border px-6 py-4">
          <h2 className="text-lg font-semibold text-dashboard-text">
            {isEditing ? "Edit Mesin" : "Tambah Mesin Baru"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pilih Rumah Sakit (Client) - Opsional</label>
              <HospitalSearchSelect
                value={formData.clientId}
                onChange={(id) => setFormData({ ...formData, clientId: id })}
                initialHospitalName={machine?.hospitalName || ""}
                placeholder="Ketik nama atau kota RS..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Serial Number</label>
              <input
                required
                disabled={isEditing && !isAdmin} // Only admin can change serial number on edit
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="Contoh: MGM-2026-001"
              />
              {isEditing && !isAdmin && <p className="mt-1 text-xs text-dashboard-muted">Hanya Admin yang dapat mengubah Serial Number.</p>}
              {isEditing && isAdmin && <p className="mt-1 text-xs text-amber-500 font-medium">Hati-hati: Mengubah SN dapat memutus histori MQTT.</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nama Mesin (Alias)</label>
              <input
                required
                value={formData.machineName}
                onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                placeholder="Contoh: PSA Sentral O2 Lt. 1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Model</label>
              <input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                placeholder="Contoh: MGM-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Kapasitas (m³/Hari)</label>
              <input
                type="number"
                step="0.01"
                value={formData.capacityMcDay}
                onChange={(e) => setFormData({ ...formData, capacityMcDay: e.target.value })}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                placeholder="Contoh: 150.5"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Kapasitas (m³/Bulan)</label>
              <input
                type="number"
                step="0.01"
                value={formData.capacityMcMonth}
                onChange={(e) => setFormData({ ...formData, capacityMcMonth: e.target.value })}
                className="w-full rounded-md border border-dashboard-border px-3 py-2 text-sm outline-none transition focus:border-dashboard-primary focus:ring-1 focus:ring-dashboard-primary"
                placeholder="Contoh: 4500"
              />
            </div>

          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-dashboard-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-dashboard-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isLoading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
