"use client";

import { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json().catch(() => ({ users: [] }));
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    fetchUsers();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">{u.role.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{u.company?.name ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                  {u.status !== "ACTIVE" && (
                    <button disabled={busyId === u.id} onClick={() => setStatus(u.id, "ACTIVE")} className="text-emerald-600 hover:underline text-xs font-semibold">
                      Approve
                    </button>
                  )}
                  {u.status !== "SUSPENDED" && (
                    <button disabled={busyId === u.id} onClick={() => setStatus(u.id, "SUSPENDED")} className="text-red-600 hover:underline text-xs font-semibold">
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
