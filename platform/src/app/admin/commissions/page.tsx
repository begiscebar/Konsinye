"use client";

import { useEffect, useState, useCallback } from "react";

const TYPES = ["PERCENTAGE", "FLAT_PER_LOAD", "DISPATCH_FLAT_FEE", "SUBSCRIPTION", "MEMBERSHIP", "BROKER_FEE"];
const ROLES = ["", "SUPER_ADMIN", "DISPATCHER", "TRUCK_OWNER", "DRIVER", "BROKER"];

export default function AdminCommissionsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", type: "PERCENTAGE", value: "", appliesToRole: "" });
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    const res = await fetch("/api/commission-rules");
    const data = await res.json().catch(() => ({ rules: [] }));
    setRules(data.rules ?? []);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/commission-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        value: Number(form.value),
        appliesToRole: form.appliesToRole || undefined,
      }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Could not create rule");
      return;
    }
    setForm({ name: "", type: "PERCENTAGE", value: "", appliesToRole: "" });
    fetchRules();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Commissions &amp; fees</h1>
        <p className="text-sm text-slate-500">
          Configurable platform-wide defaults. A company-specific rule (not shown here) always overrides the matching default.
        </p>
      </div>

      <form onSubmit={createRule} className="card p-5 grid md:grid-cols-5 gap-3 items-end">
        {error && <div className="md:col-span-5 text-red-600 text-sm">{error}</div>}
        <div className="md:col-span-2">
          <label className="label">Rule name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Platform commission" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Applies to role</label>
          <select className="input" value={form.appliesToRole} onChange={(e) => setForm({ ...form, appliesToRole: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r ? r.replaceAll("_", " ") : "Platform (any)"}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Value ({form.type === "PERCENTAGE" ? "%" : "$"})</label>
          <input className="input" type="number" step="0.01" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </div>
        <button className="btn-primary md:col-span-5 md:w-fit" type="submit">Add rule</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Applies to</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Scope</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">{r.type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{r.appliesToRole?.replaceAll("_", " ") ?? "Any"}</td>
                <td className="px-4 py-3">{r.type === "PERCENTAGE" ? `${r.value}%` : `$${r.value}`}</td>
                <td className="px-4 py-3">{r.company?.name ?? "Platform default"}</td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No commission rules configured yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
