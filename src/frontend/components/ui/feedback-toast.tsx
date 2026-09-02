"use client";

import { useEffect } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

export type ToastTone = "success" | "info" | "error";

export function FeedbackToast({ message, tone, onClose, duration = 4500 }: { message: string; tone: ToastTone; onClose: () => void; duration?: number }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, duration);
    return () => clearTimeout(timeout);
  }, [duration, onClose]);
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? TriangleAlert : Info;
  const style = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800";
  return <div className={`fixed bottom-5 right-5 z-[80] flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-xl ${style}`} role="status"><Icon className="mt-0.5 shrink-0" size={20}/><p className="text-sm font-semibold leading-5">{message}</p><button aria-label="Tutup notifikasi" onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={18}/></button></div>;
}
