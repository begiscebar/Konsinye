"use client";

import { useState } from "react";
import Link from "next/link";

const ROLE_OPTIONS = [
  { role: "TRUCK_OWNER", companyType: "CARRIER", label: "Truck Owner / Motor Carrier" },
  { role: "BROKER", companyType: "BROKER", label: "Freight Broker / Load Owner" },
  { role: "DISPATCHER", companyType: "DISPATCH_ORG", label: "Independent Dispatcher" },
] as const;

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    roleIndex: "0",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const choice = ROLE_OPTIONS[Number(form.roleIndex)];
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        role: choice.role,
        companyType: choice.companyType,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Could not create account.");
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
        <div className="card p-8 max-w-sm text-center">
          <h1 className="text-lg font-semibold mb-2">Account submitted</h1>
          <p className="text-sm text-slate-600 mb-4">
            An administrator will review and approve your account. You'll be able to sign in once approved.
          </p>
          <Link href="/login" className="btn-primary">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4 py-10">
      <form onSubmit={onSubmit} className="card p-6 w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold">Create an account</h1>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>
        )}
        <div>
          <label className="label">I am a…</label>
          <select
            className="input"
            value={form.roleIndex}
            onChange={(e) => setForm({ ...form, roleIndex: e.target.value })}
          >
            {ROLE_OPTIONS.map((opt, i) => (
              <option key={opt.role} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Company name</label>
          <input className="input" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={status === "loading"} type="submit">
          {status === "loading" ? "Submitting…" : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already approved? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
