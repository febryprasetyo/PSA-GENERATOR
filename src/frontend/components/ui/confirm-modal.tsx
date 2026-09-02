import { AlertTriangle, X } from "lucide-react";

export function ConfirmModal({ open, title, message, confirmLabel, busy = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="rounded-full bg-red-50 p-2 text-red-600"><AlertTriangle size={20}/></span><div><h2 id="confirm-title" className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p></div></div><button aria-label="Tutup konfirmasi" disabled={busy} onClick={onCancel} className="text-slate-400 hover:text-slate-700"><X size={20}/></button></div>
      <div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-semibold text-slate-700">Batal</button><button disabled={busy} onClick={onConfirm} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Memproses..." : confirmLabel}</button></div>
    </div>
  </div>;
}
