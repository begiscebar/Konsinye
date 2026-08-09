"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";

const EQUIPMENT_TYPES = [
  "BOX_TRUCK_26FT", "NON_CDL_BOX_TRUCK", "CDL_BOX_TRUCK",
  "SEMI_DRY_VAN", "SEMI_REEFER", "SEMI_FLATBED", "SPRINTER_VAN", "OTHER",
];

export default function OwnerTrucksPage() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [form, setForm] = useState({ unitNumber: "", equipmentType: EQUIPMENT_TYPES[0], homeCity: "", homeState: "" });
  const [error, setError] = useState<string | null>(null);

  const fetchTrucks = useCallback(async () => {
    const res = await fetch("/api/trucks");
    setTrucks((await res.json().catch(() => ({ trucks: [] }))).trucks ?? []);
  }, []);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  async function addTruck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/trucks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Could not add truck");
      return;
    }
    setForm({ unitNumber: "", equipmentType: EQUIPMENT_TYPES[0], homeCity: "", homeState: "" });
    fetchTrucks();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Trucks</h1>

      <form onSubmit={addTruck} className="card p-5 grid md:grid-cols-5 gap-3 items-end">
        {error && <div className="md:col-span-5 text-red-600 text-sm">{error}</div>}
        <div>
          <label className="label">Unit #</label>
          <input className="input" required value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} />
        </div>
        <div>
          <label className="label">Equipment type</label>
          <select className="input" value={form.equipmentType} onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Home city</label>
          <input className="input" value={form.homeCity} onChange={(e) => setForm({ ...form, homeCity: e.target.value })} />
        </div>
        <div>
          <label className="label">Home state</label>
          <input className="input" maxLength={2} value={form.homeState} onChange={(e) => setForm({ ...form, homeState: e.target.value.toUpperCase() })} />
        </div>
        <button className="btn-primary" type="submit">Add truck</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit #</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Home base</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trucks.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium">{t.unitNumber}</td>
                <td className="px-4 py-3">{t.equipmentType.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{t.homeCity ? `${t.homeCity}, ${t.homeState}` : "—"}</td>
                <td className="px-4 py-3">{t.driver?.user?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {trucks.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No trucks yet — add your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
