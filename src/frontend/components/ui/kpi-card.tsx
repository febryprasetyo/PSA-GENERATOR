import type { ElementType } from "react";

export function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
  colorClass: string;
}) {
  return (
    <div className="min-w-0 w-full flex-1 rounded-lg border border-dashboard-border bg-white p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] sm:text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</p>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold leading-none text-dashboard-text truncate">{value}</p>
        </div>
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md ${colorClass}`}>
          <Icon size={18} className="sm:size-5" />
        </div>
      </div>
      <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-dashboard-muted truncate">{detail}</p>
    </div>
  );
}
