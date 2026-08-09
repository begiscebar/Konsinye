"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export default function BrokerInvoicesPage() {
  const [loads, setLoads] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/loads").then((r) => r.json()).then((d) => setLoads((d.loads ?? []).filter((l: any) => l.financials)));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Invoices</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Load #</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Invoice status</th>
              <th className="px-4 py-3">Payment date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loads.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-medium">{l.loadNumber}</td>
                <td className="px-4 py-3">${l.financials.grossRevenue.toLocaleString()}</td>
                <td className="px-4 py-3"><StatusBadge status={l.financials.invoiceStatus} /></td>
                <td className="px-4 py-3">{l.financials.paymentDate ? new Date(l.financials.paymentDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {loads.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No invoiced loads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
