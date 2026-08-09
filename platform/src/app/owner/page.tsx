"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function OwnerProfilePage() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  const [company, setCompany] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    fetch("/api/companies").then((r) => r.json()).then((d) => {
      const mine = (d.companies ?? []).find((c: any) => c.id === companyId);
      setCompany(mine ?? null);
    });
  }, [companyId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !company) return;
    setSaved(false);
    const res = await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minRate: company.minRate ? Number(company.minRate) : undefined,
        mcNumber: company.mcNumber,
        usdotNumber: company.usdotNumber,
        phone: company.phone,
        city: company.city,
        state: company.state,
        preferredStates: (company.preferredStates ?? "")
          .toString()
          .split(",")
          .map((s: string) => s.trim().toUpperCase())
          .filter(Boolean),
      }),
    });
    if (res.ok) setSaved(true);
  }

  if (!company) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Company profile</h1>
        <p className="text-sm text-slate-500">
          Status: <span className="font-medium">{company.status}</span>
          {company.status === "PENDING" && " — awaiting admin approval before you can accept loads."}
        </p>
      </div>

      <form onSubmit={save} className="card p-5 space-y-4">
        {saved && <div className="text-emerald-700 text-sm">Saved.</div>}
        <div>
          <label className="label">Company name</label>
          <input className="input" value={company.name} disabled />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">MC number</label>
            <input className="input" value={company.mcNumber ?? ""} onChange={(e) => setCompany({ ...company, mcNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">USDOT number</label>
            <input className="input" value={company.usdotNumber ?? ""} onChange={(e) => setCompany({ ...company, usdotNumber: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={company.phone ?? ""} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Minimum rate ($/mile)</label>
            <input className="input" type="number" step="0.01" value={company.minRate ?? ""} onChange={(e) => setCompany({ ...company, minRate: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Home city</label>
            <input className="input" value={company.city ?? ""} onChange={(e) => setCompany({ ...company, city: e.target.value })} />
          </div>
          <div>
            <label className="label">Home state</label>
            <input className="input" maxLength={2} value={company.state ?? ""} onChange={(e) => setCompany({ ...company, state: e.target.value.toUpperCase() })} />
          </div>
        </div>
        <div>
          <label className="label">Preferred states (comma-separated, e.g. TX, OK, NM)</label>
          <input
            className="input"
            value={Array.isArray(company.preferredStates) ? company.preferredStates.join(", ") : company.preferredStates ?? ""}
            onChange={(e) => setCompany({ ...company, preferredStates: e.target.value })}
          />
        </div>
        <button className="btn-primary" type="submit">Save profile</button>
      </form>
    </div>
  );
}
