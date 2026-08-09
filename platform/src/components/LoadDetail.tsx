"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/StatusBadge";
import { LOAD_TRANSITIONS, STATUS_SET_BY_ROLE, STATUSES_REQUIRING_DEDICATED_ENDPOINT } from "@/lib/loadStateMachine";

interface LoadDetailProps {
  loadId: string;
}

export function LoadDetail({ loadId }: LoadDetailProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [load, setLoad] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [messageBody, setMessageBody] = useState("");

  const load_ = useCallback(async () => {
    const res = await fetch(`/api/loads/${loadId}`);
    if (res.ok) setLoad((await res.json()).load);
  }, [loadId]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?loadId=${loadId}`);
    if (res.ok) setMessages((await res.json()).messages);
  }, [loadId]);

  useEffect(() => {
    load_();
    loadMessages();
  }, [load_, loadMessages]);

  useEffect(() => {
    if (role === "DISPATCHER" && load?.status === "AVAILABLE") {
      fetch(`/api/loads/${loadId}/match`)
        .then((r) => (r.ok ? r.json() : { matches: [] }))
        .then((d) => setMatches(d.matches ?? []));
    }
  }, [role, load?.status, loadId]);

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/loads/${loadId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Could not update status");
      return;
    }
    load_();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageBody.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loadId, body: messageBody }),
    });
    if (res.ok) {
      setMessageBody("");
      loadMessages();
    }
  }

  async function offerToCarrier(carrierCompanyId: string, matchScore?: number) {
    setBusy(true);
    const res = await fetch(`/api/loads/${loadId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrierCompanyId, matchScore }),
    });
    setBusy(false);
    if (res.ok) load_();
    else setError((await res.json().catch(() => ({}))).error ?? "Could not send offer");
  }

  async function respondToOffer(offerId: string, decision: "ACCEPT" | "REJECT") {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setBusy(false);
    if (res.ok) load_();
    else setError((await res.json().catch(() => ({}))).error ?? "Could not respond to offer");
  }

  if (!load) return <div className="text-slate-500 text-sm">Loading…</div>;

  const nextStatuses = (LOAD_TRANSITIONS[load.status as keyof typeof LOAD_TRANSITIONS] ?? []).filter(
    (s) =>
      !STATUSES_REQUIRING_DEDICATED_ENDPOINT.includes(s) &&
      (role === "SUPER_ADMIN" || !STATUS_SET_BY_ROLE[s] || STATUS_SET_BY_ROLE[s]!.includes(role as any))
  );

  const pendingOffer = load.offers?.find((o: any) => o.status === "PENDING");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Load #{load.loadNumber}</div>
            <h1 className="text-lg font-semibold">
              {load.pickupCity}, {load.pickupState} → {load.deliveryCity}, {load.deliveryState}
            </h1>
          </div>
          <StatusBadge status={load.status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
          <Info label="Equipment" value={load.equipmentType.replaceAll("_", " ")} />
          <Info label="Rate" value={`$${load.rate.toLocaleString()}`} />
          <Info label="Miles" value={load.miles ? load.miles.toLocaleString() : "—"} />
          <Info label="RPM" value={load.miles ? `$${(load.rate / load.miles).toFixed(2)}` : "—"} />
          <Info label="Commodity" value={load.commodity} />
          <Info label="Weight" value={`${load.weightLbs.toLocaleString()} lbs`} />
          <Info label="Pickup appt." value={new Date(load.pickupApptStart).toLocaleString()} />
          <Info label="Delivery appt." value={new Date(load.deliveryApptStart).toLocaleString()} />
        </div>

        {load.specialRequirements && (
          <div className="mt-4 text-sm">
            <span className="label !mb-0 inline">Special requirements: </span>
            {load.specialRequirements}
          </div>
        )}

        {(load.carrierCompany || load.truck || load.driver) && (
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Info label="Carrier" value={load.carrierCompany?.name ?? "—"} />
            <Info label="Truck" value={load.truck?.unitNumber ?? "—"} />
            <Info label="Driver" value={load.driver?.user?.name ?? "—"} />
            <Info label="Dispatcher" value={load.dispatcher?.name ?? "—"} />
          </div>
        )}

        {nextStatuses.length > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <button key={s} disabled={busy} onClick={() => setStatus(s)} className="btn-secondary">
                Mark {s.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {role === "TRUCK_OWNER" && pendingOffer && pendingOffer.offeredToCompanyId === session?.user?.companyId && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Load offer</h2>
          <p className="text-sm text-slate-600 mb-3">
            You've been offered this load{pendingOffer.matchScore ? ` (match score ${pendingOffer.matchScore}%)` : ""}.
          </p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => respondToOffer(pendingOffer.id, "ACCEPT")} className="btn-primary">
              Accept
            </button>
            <button disabled={busy} onClick={() => respondToOffer(pendingOffer.id, "REJECT")} className="btn-danger">
              Reject
            </button>
          </div>
        </div>
      )}

      {role === "TRUCK_OWNER" && load.status === "ACCEPTED" && load.carrierCompanyId === session?.user?.companyId && (
        <AssignForm loadId={loadId} onAssigned={load_} />
      )}

      {role === "DISPATCHER" && load.status === "AVAILABLE" && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Recommended trucks</h2>
          {matches.length === 0 && <p className="text-sm text-slate-500">No available trucks match this load yet.</p>}
          <div className="space-y-2">
            {matches.map((m) => (
              <div key={m.truckId} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">
                    {m.truck?.companyName} — Truck {m.truck?.unitNumber}
                  </div>
                  <div className="text-slate-500">{m.truck?.equipmentType?.replaceAll("_", " ")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-brand-700">{m.score}% match</span>
                  <button
                    disabled={busy}
                    className="btn-primary"
                    onClick={() => offerToCarrier(m.truck.companyId, m.score)}
                  >
                    Offer load
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {load.financials && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Financials</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <Info label="Gross revenue" value={`$${load.financials.grossRevenue.toLocaleString()}`} />
            <Info label="Platform commission" value={`$${load.financials.platformCommission.toLocaleString()}`} />
            <Info label="Dispatcher commission" value={`$${load.financials.dispatcherCommission.toLocaleString()}`} />
            <Info label="Carrier payment" value={`$${load.financials.carrierPayment.toLocaleString()}`} />
            <Info label="Invoice status" value={load.financials.invoiceStatus.replaceAll("_", " ")} />
            <Info label="Payment date" value={load.financials.paymentDate ? new Date(load.financials.paymentDate).toLocaleDateString() : "—"} />
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Status timeline</h2>
        <ol className="space-y-2 text-sm">
          {load.statusEvents?.map((ev: any) => (
            <li key={ev.id} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
              <span>
                <StatusBadge status={ev.status} /> <span className="text-slate-500 ml-2">by {ev.changedBy?.name}</span>
              </span>
              <span className="text-slate-400">{new Date(ev.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Load messages</h2>
        <div className="space-y-2 max-h-72 overflow-y-auto mb-3">
          {messages.map((m) => (
            <div key={m.id} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
              <div className="text-xs text-slate-400 mb-0.5">
                {m.sender?.name} ({m.sender?.role}) · {new Date(m.createdAt).toLocaleString()}
              </div>
              {m.body}
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <input className="input" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Write a message…" />
          <button className="btn-primary shrink-0" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function AssignForm({ loadId, onAssigned }: { loadId: string; onAssigned: () => void }) {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [truckId, setTruckId] = useState("");
  const [driverProfileId, setDriverProfileId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trucks?status=AVAILABLE").then((r) => r.json()).then((d) => setTrucks(d.trucks ?? []));
    fetch("/api/drivers").then((r) => r.json()).then((d) => setDrivers(d.drivers ?? []));
  }, []);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/loads/${loadId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ truckId, driverProfileId }),
    });
    setBusy(false);
    if (res.ok) onAssigned();
    else setError((await res.json().catch(() => ({}))).error ?? "Could not assign");
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-3">Assign truck &amp; driver</h2>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <form onSubmit={assign} className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="label">Truck</label>
          <select className="input" required value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            <option value="">Select truck</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.unitNumber} — {t.equipmentType.replaceAll("_", " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Driver</label>
          <select className="input" required value={driverProfileId} onChange={(e) => setDriverProfileId(e.target.value)}>
            <option value="">Select driver</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.user.name}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" disabled={busy} type="submit">Assign</button>
      </form>
    </div>
  );
}
