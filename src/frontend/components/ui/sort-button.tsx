import { ArrowUpDown } from "lucide-react";
import type { SortKey } from "@/frontend/lib/dashboard-types";

export function SortButton({
  label,
  column,
  sortKey,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-flex items-center gap-1 whitespace-nowrap text-left text-xs font-semibold uppercase tracking-[0.06em] ${
        sortKey === column ? "text-dashboard-primary" : "text-slate-500"
      }`}
    >
      {label}
      <ArrowUpDown size={13} />
    </button>
  );
}
