"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { ACTIVE_LOAD_STATUSES } from "@/lib/loadStateMachine";

export default function DriverLoadsPage() {
  const [loads, setLoads] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/loads").then((r) => r.json()).then((d) => setLoads(d.loads ?? []));
  }, []);

  const active = loads.filter((l) => (ACTIVE_LOAD_STATUSES as string[]).includes(l.status));
  const past = loads.filter((l) => !(ACTIVE_LOAD_STATUSES as string[]).includes(l.status));

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-xl font-semibold">My loads</h1>

      <div className="space-y-3">
        {active.length === 0 && <p className="text-sm text-slate-500">No active loads assigned right now.</p>}
        {active.map((l) => (
          <Link key={l.id} href={`/driver/loads/${l.id}`} className="card p-4 block active:bg-slate-50">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400">#{l.loadNumber}</span>
              <StatusBadge status={l.status} />
            </div>
            <div className="text-base font-semibold">{l.pickupCity}, {l.pickupState}</div>
            <div className="text-sm text-slate-500">→ {l.deliveryCity}, {l.deliveryState}</div>
            <div className="text-sm text-slate-400 mt-2">
              Pickup {new Date(l.pickupApptStart).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </Link>
        ))}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-2">Past loads</h2>
          <div className="space-y-2">
            {past.map((l) => (
              <Link key={l.id} href={`/driver/loads/${l.id}`} className="card p-3 flex justify-between items-center text-sm">
                <span>#{l.loadNumber} · {l.deliveryCity}, {l.deliveryState}</span>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
