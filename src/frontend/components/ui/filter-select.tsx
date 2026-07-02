import type { ElementType, ReactNode } from "react";

export function FilterSelect({
  icon: Icon,
  value,
  onChange,
  children,
}: {
  icon: ElementType;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative flex w-full items-center">
      <Icon className="pointer-events-none absolute left-3 text-slate-400" size={16} />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-dashboard-border bg-white pl-9 pr-8 text-sm text-dashboard-text outline-none transition focus:border-dashboard-primary focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}
