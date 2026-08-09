"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EQUIPMENT_TYPES = [
  "BOX_TRUCK_26FT", "NON_CDL_BOX_TRUCK", "CDL_BOX_TRUCK",
  "SEMI_DRY_VAN", "SEMI_REEFER", "SEMI_FLATBED", "SPRINTER_VAN", "OTHER",
];

const empty = {
  equipmentType: EQUIPMENT_TYPES[0],
  pickupLocation: "", pickupAddress: "", pickupCity: "", pickupState: "", pickupApptStart: "",
  deliveryLocation: "", deliveryAddress: "", deliveryCity: "", deliveryState: "", deliveryApptStart: "",
  commodity: "", weightLbs: "", dimensions: "", pieces: "", rate: "", miles: "", specialRequirements: "",
};

export default function BrokerPostLoadPage() {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      setError(JSON.stringify((await res.json().catch(() => ({}))).error ?? "Could not post load"));
      return;
    }
    const { load } = await res.json();
    router.push(`/broker/loads/${load.id}`);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Post a load</h1>
      <form onSubmit={submit} className="card p-6 space-y-6">
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div>
          <label className="label">Equipment type</label>
          <select className="input" value={form.equipmentType} onChange={(e) => set("equipmentType", e.target.value)}>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </div>

        <fieldset className="grid md:grid-cols-2 gap-4">
          <legend className="text-sm font-semibold mb-2 col-span-2">Pickup</legend>
          <Field label="Location name" value={form.pickupLocation} onChange={(v) => set("pickupLocation", v)} />
          <Field label="Address" value={form.pickupAddress} onChange={(v) => set("pickupAddress", v)} />
          <Field label="City" value={form.pickupCity} onChange={(v) => set("pickupCity", v)} />
          <Field label="State" value={form.pickupState} onChange={(v) => set("pickupState", v.toUpperCase())} maxLength={2} />
          <Field label="Appointment" type="datetime-local" value={form.pickupApptStart} onChange={(v) => set("pickupApptStart", v)} />
        </fieldset>

        <fieldset className="grid md:grid-cols-2 gap-4">
          <legend className="text-sm font-semibold mb-2 col-span-2">Delivery</legend>
          <Field label="Location name" value={form.deliveryLocation} onChange={(v) => set("deliveryLocation", v)} />
          <Field label="Address" value={form.deliveryAddress} onChange={(v) => set("deliveryAddress", v)} />
          <Field label="City" value={form.deliveryCity} onChange={(v) => set("deliveryCity", v)} />
          <Field label="State" value={form.deliveryState} onChange={(v) => set("deliveryState", v.toUpperCase())} maxLength={2} />
          <Field label="Appointment" type="datetime-local" value={form.deliveryApptStart} onChange={(v) => set("deliveryApptStart", v)} />
        </fieldset>

        <fieldset className="grid md:grid-cols-3 gap-4">
          <legend className="text-sm font-semibold mb-2 col-span-3">Load details</legend>
          <Field label="Commodity" value={form.commodity} onChange={(v) => set("commodity", v)} />
          <Field label="Weight (lbs)" type="number" value={form.weightLbs} onChange={(v) => set("weightLbs", v)} />
          <Field label="Dimensions (optional)" required={false} value={form.dimensions} onChange={(v) => set("dimensions", v)} />
          <Field label="Pieces (optional)" type="number" required={false} value={form.pieces} onChange={(v) => set("pieces", v)} />
          <Field label="Rate ($)" type="number" value={form.rate} onChange={(v) => set("rate", v)} />
          <Field label="Miles (optional)" type="number" required={false} value={form.miles} onChange={(v) => set("miles", v)} />
        </fieldset>

        <div>
          <label className="label">Special requirements</label>
          <textarea className="input" rows={3} value={form.specialRequirements} onChange={(e) => set("specialRequirements", e.target.value)} />
        </div>

        <button className="btn-primary" disabled={busy} type="submit">{busy ? "Posting…" : "Post load"}</button>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", maxLength, required = true,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number; required?: boolean }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} required={required} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
