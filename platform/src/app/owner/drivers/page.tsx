"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export default function OwnerDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", isCdlDriver: false });
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    const res = await fetch("/api/drivers");
    setDrivers((await res.json().catch(() => ({ drivers: [] }))).drivers ?? []);
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Could not add driver");
      return;
    }
    setForm({ name: "", email: "", password: "", phone: "", isCdlDriver: false });
    fetchDrivers();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Drivers</h1>

      <form onSubmit={addDriver} className="card p-5 grid md:grid-cols-3 gap-3 items-end">
        {error && <div className="md:col-span-3 text-red-600 text-sm">{error}</div>}
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Temporary password</label>
          <input className="input" type="text" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isCdlDriver} onChange={(e) => setForm({ ...form, isCdlDriver: e.target.checked })} />
          CDL driver
        </label>
        <button className="btn-primary" type="submit">Add driver</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">CDL</th>
              <th className="px-4 py-3">Truck</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium">{d.user.name}</td>
                <td className="px-4 py-3 text-slate-500">{d.user.email}</td>
                <td className="px-4 py-3">{d.isCdlDriver ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{d.currentTruck?.unitNumber ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={d.user.status} /></td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No drivers yet — add your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
