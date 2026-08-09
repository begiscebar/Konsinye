"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";

export default function OwnerRevenuePage() {
  const [loads, setLoads] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/loads").then((r) => r.json()).then((d) => setLoads((d.loads ?? []).filter((l: any) => l.financials)));
  }, []);

  const totalGross = loads.reduce((a, l) => a + (l.financials?.grossRevenue ?? 0), 0);
  const totalCommission = loads.reduce((a, l) => a + (l.financials?.platformCommission ?? 0) + (l.financials?.dispatcherCommission ?? 0), 0);
  const totalPayout = loads.reduce((a, l) => a + (l.financials?.carrierPayment ?? 0), 0);
  const outstanding = loads.filter((l) => l.financials?.invoiceStatus !== "PAID").length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Revenue</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Gross revenue" value={`$${totalGross.toLocaleString()}`} />
        <StatCard label="Commissions & fees" value={`$${totalCommission.toLocaleString()}`} />
        <StatCard label="Your net payout" value={`$${totalPayout.toLocaleString()}`} />
        <StatCard label="Outstanding invoices" value={outstanding} />
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Load #</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Your payment</th>
              <th className="px-4 py-3">Invoice status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loads.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-medium">{l.loadNumber}</td>
                <td className="px-4 py-3">${l.financials.grossRevenue.toLocaleString()}</td>
                <td className="px-4 py-3">${(l.financials.platformCommission + l.financials.dispatcherCommission).toLocaleString()}</td>
                <td className="px-4 py-3">${l.financials.carrierPayment.toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={l.financials.invoiceStatus} /></td>
              </tr>
            ))}
            {loads.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No completed loads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
