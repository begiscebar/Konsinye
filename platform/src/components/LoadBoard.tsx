"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";

const EQUIPMENT_TYPES = [
  "BOX_TRUCK_26FT", "NON_CDL_BOX_TRUCK", "CDL_BOX_TRUCK",
  "SEMI_DRY_VAN", "SEMI_REEFER", "SEMI_FLATBED", "SPRINTER_VAN", "OTHER",
];

const STATUSES = [
  "AVAILABLE", "OFFERED", "ACCEPTED", "ASSIGNED", "DRIVER_CONFIRMED", "AT_PICKUP",
  "LOADED", "IN_TRANSIT", "AT_DELIVERY", "DELIVERED", "POD_UPLOADED", "COMPLETED",
  "PAYMENT_PENDING", "PAID", "CANCELLED", "REJECTED", "DISPUTED", "DELAYED",
];

export function LoadBoard({ basePath, defaultStatus }: { basePath: string; defaultStatus?: string }) {
  const [loads, setLoads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: defaultStatus ?? "",
    equipmentType: "",
    originState: "",
    destState: "",
    minRate: "",
  });

  const fetchLoads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    const res = await fetch(`/api/loads?${params.toString()}`);
    const data = await res.json().catch(() => ({ loads: [] }));
    setLoads(data.loads ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchLoads();
  }, [fetchLoads]);

  return (
    <div className="space-y-4">
      <div className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Select label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={["", ...STATUSES]} />
        <Select label="Equipment" value={filters.equipmentType} onChange={(v) => setFilters({ ...filters, equipmentType: v })} options={["", ...EQUIPMENT_TYPES]} />
        <Text label="Origin state" value={filters.originState} onChange={(v) => setFilters({ ...filters, originState: v.toUpperCase() })} maxLength={2} />
        <Text label="Destination state" value={filters.destState} onChange={(v) => setFilters({ ...filters, destState: v.toUpperCase() })} maxLength={2} />
        <Text label="Min rate ($)" value={filters.minRate} onChange={(v) => setFilters({ ...filters, minRate: v })} />
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Load #</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Pickup</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">RPM</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loads.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`${basePath}/loads/${l.id}`} className="text-brand-600 font-medium hover:underline">
                    {l.loadNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {l.pickupCity}, {l.pickupState} → {l.deliveryCity}, {l.deliveryState}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{l.equipmentType.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(l.pickupApptStart).toLocaleDateString()}</td>
                <td className="px-4 py-3">${l.rate.toLocaleString()}</td>
                <td className="px-4 py-3">{l.miles ? `$${(l.rate / l.miles).toFixed(2)}` : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
            {!loading && loads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No loads match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o ? o.replaceAll("_", " ") : "All"}</option>
        ))}
      </select>
    </div>
  );
}

function Text({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
