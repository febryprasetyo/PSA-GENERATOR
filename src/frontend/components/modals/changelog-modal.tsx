"use client";

import { X, Sparkles, Tag, Calendar, ShieldCheck, PlusCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { CHANGELOG_DATA, CURRENT_VERSION } from "@/shared/changelog";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-dashboard-border overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dashboard-border bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Pembaruan & Catatan Rilis</h2>
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-400/30">
                  {CURRENT_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300">Riwayat fitur baru, perbaikan, dan optimasi sistem PSA Dashboard.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6 max-h-[75vh] overflow-y-auto bg-slate-50">
          {CHANGELOG_DATA.map((item, idx) => (
            <div
              key={item.version}
              className={`rounded-xl border border-dashboard-border bg-white p-5 shadow-sm transition-all ${
                idx === 0 ? "ring-2 ring-blue-500/20 border-blue-200" : ""
              }`}
            >
              {/* Version Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashboard-border pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-dashboard-text">{item.version}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      item.tag === "Major"
                        ? "bg-purple-100 text-purple-700"
                        : item.tag === "Minor"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    {item.tag} Release
                  </span>
                  {idx === 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
                      Versi Terbaru
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-dashboard-muted">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{item.date}</span>
                </div>
              </div>

              {/* Title & Highlights */}
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-dashboard-text">{item.title}</h3>
                <ul className="mt-2 space-y-1 pl-1 text-xs text-dashboard-muted">
                  {item.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Changes Detailed */}
              <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
                {item.changes.map((change, cIdx) => (
                  <div key={cIdx} className="text-xs">
                    <div className="flex items-center gap-1.5 font-bold mb-1.5">
                      {change.category === "Added" && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <PlusCircle className="h-3.5 w-3.5" /> Fitur Baru (Added)
                        </span>
                      )}
                      {change.category === "Changed" && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <RefreshCw className="h-3.5 w-3.5" /> Perubahan (Changed)
                        </span>
                      )}
                      {change.category === "Fixed" && (
                        <span className="text-amber-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Perbaikan (Fixed)
                        </span>
                      )}
                      {change.category === "Security" && (
                        <span className="text-purple-600 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5" /> Keamanan (Security)
                        </span>
                      )}
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-dashboard-muted">
                      {change.items.map((sub, sIdx) => (
                        <li key={sIdx}>{sub}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-dashboard-border bg-white px-6 py-4 text-xs text-dashboard-muted">
          <span>PSA Oxygen Generator Monitoring System &copy; 2026</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
