"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ACTIVE_LOAD_STATUSES } from "@/lib/loadStateMachine";

export default function DispatcherActiveLoadsPage() {
  const [loads, setLoads] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/loads").then((r) => r.json()).then((d) =>
      setLoads((d.loads ?? []).filter((l: any) => (ACTIVE_LOAD_STATUSES as string[]).includes(l.status)))
    );
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My active loads</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Load #</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Carrier</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/dispatcher/loads/${l.id}`} className="text-brand-600 font-medium hover:underline">{l.loadNumber}</Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{l.pickupCity}, {l.pickupState} → {l.deliveryCity}, {l.deliveryState}</td>
                <td className="px-4 py-3">{l.carrierCompany?.name ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
            {loads.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No active loads.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
