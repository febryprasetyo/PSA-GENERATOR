import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusChartItem } from "@/frontend/lib/dashboard-types";

export function MachineStatusPanel({ statusChart }: { statusChart: StatusChartItem[] }) {
  return (
    <div className="panel p-5">
      <h2 className="text-base font-bold text-dashboard-text">Status Mesin</h2>
      <p className="mt-1 text-sm text-dashboard-muted">Distribusi stasiun berdasarkan kondisi mesin.</p>
      <div className="mt-5 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
              {statusChart.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
        {statusChart.map((item) => (
          <div key={item.name} className="rounded-md border border-dashboard-border bg-slate-50 px-2 py-2">
            <span className="block" style={{ color: item.color }}>
              {item.value}
            </span>
            <span className="text-slate-500">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
