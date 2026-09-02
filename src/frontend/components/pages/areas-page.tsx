"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/page-header";
import { useAuth } from "@/frontend/hooks/useAuth";

type Hospital = { id: string; hospitalName: string };
type Membership = { hospitalId: string; hospitalName: string };
type Area = { id: string; name: string; description?: string | null; hospitals: Membership[]; hospitalCount: number };

export function AreasPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [areas, setAreas] = useState<Area[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Area | "new" | null>(null);
  const [membersArea, setMembersArea] = useState<Area | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [areaResponse, hospitalResponse] = await Promise.all([
        fetch("/api/areas", { cache: "no-store" }),
        fetch("/api/clients?limit=1000&sortBy=hospitalName&sortOrder=asc", { cache: "no-store" }),
      ]);
      const areaData = await areaResponse.json();
      const hospitalData = await hospitalResponse.json();
      if (!areaResponse.ok) throw new Error(areaData.error || "Gagal memuat Area");
      setAreas(areaData.areas || []);
      setHospitals(hospitalData.clients || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ownerByHospital = useMemo(() => new Map(areas.flatMap((area) => area.hospitals.map((item) => [item.hospitalId, area.name]))), [areas]);

  async function saveArea(event: React.FormEvent) {
    event.preventDefault();
    const current = editing;
    if (!current) return;
    setError("");
    const response = await fetch(current === "new" ? "/api/areas" : `/api/areas/${current.id}`, {
      method: current === "new" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Gagal menyimpan Area");
    setEditing(null);
    await load();
  }

  async function saveMembers() {
    if (!membersArea) return;
    const response = await fetch(`/api/areas/${membersArea.id}/hospitals`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hospitalIds: selected }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Gagal menyimpan anggota");
    setMembersArea(null);
    await load();
  }

  async function removeArea(area: Area) {
    if (!confirm(`Hapus ${area.name}? Rumah Sakit dan mesin tetap tersimpan tanpa Area.`)) return;
    const response = await fetch(`/api/areas/${area.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Gagal menghapus Area");
    await load();
  }

  return <div className="pb-12">
    <PageHeader title="Master Area" subtitle="Kelola pembagian wilayah dan anggota Rumah Sakit">
      {isAdmin && <button onClick={() => { setEditing("new"); setName(""); setDescription(""); }} className="inline-flex h-10 items-center gap-2 rounded-md bg-dashboard-primary px-4 text-sm font-semibold text-white"><Plus size={16} />Tambah Area</button>}
    </PageHeader>
    {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
    <div className="mt-6 panel overflow-hidden">
      {loading ? <p className="p-8 text-center text-dashboard-muted">Memuat Area...</p> : <div className="divide-y divide-dashboard-border">
        {areas.map((area) => <div key={area.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><div className="rounded-md bg-blue-50 p-3 text-dashboard-primary"><MapPin size={20} /></div><div><h2 className="font-bold">{area.name}</h2><p className="text-sm text-dashboard-muted">{area.description || "Tanpa deskripsi"}</p><p className="mt-1 text-xs text-slate-500">{area.hospitalCount} RS · {area.hospitals.map((item) => item.hospitalName).join(", ") || "Belum ada anggota"}</p></div></div>
          <div className="flex gap-2"><button aria-label={`Atur anggota ${area.name}`} onClick={() => { setMembersArea(area); setSelected(area.hospitals.map((item) => item.hospitalId)); }} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm"><Users size={15} />Atur Anggota</button>{isAdmin && <><button aria-label={`Edit ${area.name}`} onClick={() => { setEditing(area); setName(area.name); setDescription(area.description || ""); }} className="rounded border p-2"><Pencil size={15} /></button><button aria-label={`Hapus ${area.name}`} onClick={() => void removeArea(area)} className="rounded border p-2 text-red-600"><Trash2 size={15} /></button></>}</div>
        </div>)}
        {!areas.length && <p className="p-8 text-center text-dashboard-muted">Belum ada Area.</p>}
      </div>}
    </div>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><form onSubmit={saveArea} className="w-full max-w-md rounded-xl bg-white p-6"><div className="mb-4 flex justify-between"><h2 className="text-lg font-bold">{editing === "new" ? "Tambah Area" : "Edit Area"}</h2><button type="button" onClick={() => setEditing(null)}><X /></button></div><label htmlFor="area-name" className="text-sm font-medium">Nama Area</label><input id="area-name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 mb-4 w-full rounded border p-2"/><label htmlFor="area-description" className="text-sm font-medium">Deskripsi</label><textarea id="area-description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded border p-2"/><button className="mt-5 w-full rounded bg-dashboard-primary p-2 font-semibold text-white">Simpan</button></form></div>}
    {membersArea && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"><div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6"><div className="mb-4 flex justify-between"><h2 className="text-lg font-bold">Anggota {membersArea.name}</h2><button onClick={() => setMembersArea(null)}><X /></button></div><div className="space-y-2">{hospitals.map((hospital) => { const owner = ownerByHospital.get(hospital.id); return <label key={hospital.id} className="flex items-start gap-3 rounded border p-3"><input type="checkbox" checked={selected.includes(hospital.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, hospital.id] : current.filter((id) => id !== hospital.id))}/><span><span className="block text-sm font-medium">{hospital.hospitalName}</span>{owner && owner !== membersArea.name && <span className="text-xs text-amber-600">Akan dipindahkan dari {owner}</span>}</span></label>; })}</div><button onClick={() => void saveMembers()} className="mt-5 w-full rounded bg-dashboard-primary p-2 font-semibold text-white">Simpan Anggota</button></div></div>}
  </div>;
}
