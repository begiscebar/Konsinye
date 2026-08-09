"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Invalid email or password." : res.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white">
            <div className="h-9 w-9 rounded-lg bg-brand-500 flex items-center justify-center font-bold">K</div>
            <span className="text-xl font-semibold">Konsinye Freight</span>
          </div>
          <p className="text-slate-400 text-sm mt-2">Sign in to your dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Truck owner, broker or dispatcher?{" "}
          <Link href="/register" className="text-brand-400 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
