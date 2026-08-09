"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export default function AdminTrucksPage() {
  const [trucks, setTrucks] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/trucks").then((r) => r.json()).then((d) => setTrucks(d.trucks ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">All trucks</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit #</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trucks.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{t.unitNumber}</td>
                <td className="px-4 py-3">{t.company?.name}</td>
                <td className="px-4 py-3">{t.equipmentType.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{t.currentCity ? `${t.currentCity}, ${t.currentState}` : t.homeState ?? "—"}</td>
                <td className="px-4 py-3">{t.driver?.user?.name ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {trucks.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No trucks yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
