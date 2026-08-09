"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    const data = await res.json().catch(() => ({ companies: [] }));
    setCompanies(data.companies ?? []);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    fetchCompanies();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Companies</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">MC #</th>
              <th className="px-4 py-3">USDOT #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.type.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{c.mcNumber ?? "—"}</td>
                <td className="px-4 py-3">{c.usdotNumber ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  {c.status !== "APPROVED" && (
                    <button disabled={busyId === c.id} onClick={() => setStatus(c.id, "APPROVED")} className="text-emerald-600 hover:underline text-xs font-semibold">
                      Approve
                    </button>
                  )}
                  {c.status !== "SUSPENDED" && (
                    <button disabled={busyId === c.id} onClick={() => setStatus(c.id, "SUSPENDED")} className="text-red-600 hover:underline text-xs font-semibold">
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No companies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
