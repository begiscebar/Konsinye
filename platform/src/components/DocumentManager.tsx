"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";

const DOCUMENT_TYPES = [
  "CDL", "DRIVER_LICENSE", "MEDICAL_CARD", "INSURANCE_COI", "W9", "BOL", "POD",
  "RATE_CONFIRMATION", "MC_AUTHORITY", "USDOT_REGISTRATION", "BOC3", "UCR",
  "VEHICLE_REGISTRATION", "DRUG_ALCOHOL_COMPLIANCE", "OTHER",
];

export function DocumentManager({
  ownerType,
  ownerId,
  allowedTypes,
}: {
  ownerType: "USER" | "COMPANY" | "TRUCK" | "LOAD";
  ownerId: string;
  allowedTypes?: string[];
}) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [type, setType] = useState((allowedTypes ?? DOCUMENT_TYPES)[0]);
  const [expirationDate, setExpirationDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    const res = await fetch(`/api/documents?ownerType=${ownerType}&ownerId=${ownerId}`);
    setDocuments((await res.json().catch(() => ({ documents: [] }))).documents ?? []);
  }, [ownerType, ownerId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("type", type);
    form.set("ownerType", ownerType);
    form.set("ownerId", ownerId);
    if (expirationDate) form.set("expirationDate", expirationDate);

    const res = await fetch("/api/documents", { method: "POST", body: form });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Upload failed");
      return;
    }
    setFile(null);
    setExpirationDate("");
    fetchDocs();
  }

  const typeOptions = allowedTypes ?? DOCUMENT_TYPES;

  return (
    <div className="space-y-4">
      <form onSubmit={upload} className="card p-5 grid md:grid-cols-4 gap-3 items-end">
        {error && <div className="md:col-span-4 text-red-600 text-sm">{error}</div>}
        <div>
          <label className="label">Document type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {typeOptions.map((t) => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Expiration date (optional)</label>
          <input className="input" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
        </div>
        <div>
          <label className="label">File</label>
          <input className="input" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button className="btn-primary" disabled={busy} type="submit">Upload</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((d) => {
              const expired = d.expirationDate && new Date(d.expirationDate) < new Date();
              return (
                <tr key={d.id}>
                  <td className="px-4 py-3">{d.type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">
                    <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {d.fileName}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.uploadedBy?.name}</td>
                  <td className="px-4 py-3">{d.expirationDate ? new Date(d.expirationDate).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={expired ? "EXPIRED" : d.status} /></td>
                </tr>
              );
            })}
            {documents.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No documents uploaded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
