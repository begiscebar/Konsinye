"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { DocumentManager } from "@/components/DocumentManager";
import { LOAD_TRANSITIONS, STATUS_SET_BY_ROLE } from "@/lib/loadStateMachine";

const NEXT_ACTION_LABEL: Record<string, string> = {
  DRIVER_CONFIRMED: "Confirm this load",
  AT_PICKUP: "Arrived at pickup",
  LOADED: "Loaded",
  IN_TRANSIT: "In transit",
  AT_DELIVERY: "Arrived at delivery",
  DELIVERED: "Delivered",
  POD_UPLOADED: "POD uploaded",
};

export function DriverLoadDetail({ loadId }: { loadId: string }) {
  const [load, setLoad] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showDelay, setShowDelay] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/loads/${loadId}`);
    if (res.ok) setLoad((await res.json()).load);
  }, [loadId]);

  const refreshMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?loadId=${loadId}`);
    if (res.ok) setMessages((await res.json()).messages);
  }, [loadId]);

  useEffect(() => {
    refresh();
    refreshMessages();
  }, [refresh, refreshMessages]);

  async function setStatus(status: string, statusNote?: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/loads/${loadId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: statusNote }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Could not update");
      return;
    }
    setShowDelay(false);
    setNote("");
    refresh();
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
      refreshMessages();
    }
  }

  if (!load) return <div className="text-sm text-slate-500">Loading…</div>;

  const nextStatuses = (LOAD_TRANSITIONS[load.status as keyof typeof LOAD_TRANSITIONS] ?? []).filter(
    (s) => NEXT_ACTION_LABEL[s] && (!STATUS_SET_BY_ROLE[s] || STATUS_SET_BY_ROLE[s]!.includes("DRIVER" as any))
  );

  return (
    <div className="space-y-4 pb-8">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-slate-400">#{load.loadNumber}</span>
          <StatusBadge status={load.status} />
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Pickup</div>
            <div className="font-semibold">{load.pickupLocation}</div>
            <div className="text-sm text-slate-600">{load.pickupAddress}, {load.pickupCity}, {load.pickupState}</div>
            <div className="text-sm text-slate-500">{new Date(load.pickupApptStart).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Delivery</div>
            <div className="font-semibold">{load.deliveryLocation}</div>
            <div className="text-sm text-slate-600">{load.deliveryAddress}, {load.deliveryCity}, {load.deliveryState}</div>
            <div className="text-sm text-slate-500">{new Date(load.deliveryApptStart).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-100">
            <div><span className="text-slate-400">Commodity</span><div className="font-medium">{load.commodity}</div></div>
            <div><span className="text-slate-400">Weight</span><div className="font-medium">{load.weightLbs.toLocaleString()} lbs</div></div>
          </div>
          {load.specialRequirements && (
            <div className="text-sm"><span className="text-slate-400">Special requirements: </span>{load.specialRequirements}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {nextStatuses.map((s) => (
          <button key={s} disabled={busy} onClick={() => setStatus(s)} className="btn-primary !py-4 !text-base">
            {NEXT_ACTION_LABEL[s]}
          </button>
        ))}
        <button onClick={() => setShowDelay((v) => !v)} className="btn-secondary !py-4 !text-base">
          Report delay / breakdown
        </button>
      </div>

      {showDelay && (
        <div className="card p-4 space-y-3">
          <textarea className="input" rows={3} placeholder="What's going on?" value={note} onChange={(e) => setNote(e.target.value)} />
          <button disabled={busy || !note.trim()} onClick={() => setStatus("DELAYED", note)} className="btn-danger w-full">
            Submit delay report
          </button>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-500 mb-2">Upload BOL / POD / photos</h2>
        <DocumentManager ownerType="LOAD" ownerId={loadId} allowedTypes={["BOL", "POD", "OTHER"]} />
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">Contact dispatcher</h2>
        <div className="space-y-2 max-h-56 overflow-y-auto mb-3">
          {messages.map((m) => (
            <div key={m.id} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
              <div className="text-xs text-slate-400 mb-0.5">{m.sender?.name} · {new Date(m.createdAt).toLocaleString()}</div>
              {m.body}
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <input className="input" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Message dispatcher…" />
          <button className="btn-primary shrink-0" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
