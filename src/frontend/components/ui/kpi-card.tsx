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
    <div className="min-w-[180px] flex-1 rounded-lg border border-dashboard-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold leading-none text-dashboard-text">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-sm text-dashboard-muted">{detail}</p>
    </div>
  );
}
