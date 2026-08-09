import { prisma } from "@/lib/prisma";

export default async function AdminAuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">{l.actor ? `${l.actor.name} (${l.actor.role})` : "System"}</td>
                <td className="px-4 py-3 font-medium">{l.action}</td>
                <td className="px-4 py-3 text-slate-500">{l.entityType} · {l.entityId.slice(0, 8)}</td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">
                  {l.metadata ? JSON.stringify(l.metadata) : ""}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
