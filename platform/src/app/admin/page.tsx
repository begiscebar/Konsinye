import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { ACTIVE_LOAD_STATUSES } from "@/lib/loadStateMachine";

export default async function AdminOverviewPage() {
  const [
    totalLoads,
    activeLoads,
    completedLoads,
    cancelledLoads,
    activeTrucks,
    activeDrivers,
    activeDispatchers,
    activeBrokers,
    financials,
    pendingUsers,
    revenueByEquipment,
  ] = await Promise.all([
    prisma.load.count(),
    prisma.load.count({ where: { status: { in: ACTIVE_LOAD_STATUSES } } }),
    prisma.load.count({ where: { status: { in: ["COMPLETED", "PAYMENT_PENDING", "PAID"] } } }),
    prisma.load.count({ where: { status: "CANCELLED" } }),
    prisma.truck.count(),
    prisma.user.count({ where: { role: "DRIVER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "DISPATCHER", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "BROKER", status: "ACTIVE" } }),
    prisma.loadFinancials.aggregate({ _sum: { grossRevenue: true, platformCommission: true } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.load.groupBy({ by: ["equipmentType"], _sum: { rate: true } }),
  ]);

  const maxEquipRevenue = Math.max(1, ...revenueByEquipment.map((e) => e._sum.rate ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Operations overview</h1>
        <p className="text-sm text-slate-500">Platform-wide activity across every carrier, broker and dispatcher.</p>
      </div>

      {pendingUsers > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
          {pendingUsers} account{pendingUsers === 1 ? "" : "s"} pending approval —{" "}
          <a href="/admin/users?status=PENDING" className="underline font-medium">review now</a>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total loads" value={totalLoads} />
        <StatCard label="Active loads" value={activeLoads} />
        <StatCard label="Completed loads" value={completedLoads} />
        <StatCard label="Cancelled loads" value={cancelledLoads} />
        <StatCard label="Active trucks" value={activeTrucks} />
        <StatCard label="Active drivers" value={activeDrivers} />
        <StatCard label="Active dispatchers" value={activeDispatchers} />
        <StatCard label="Active brokers" value={activeBrokers} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <StatCard
          label="Total gross revenue"
          value={`$${(financials._sum.grossRevenue ?? 0).toLocaleString()}`}
          sublabel="Sum of completed load revenue"
        />
        <StatCard
          label="Platform commission revenue"
          value={`$${(financials._sum.platformCommission ?? 0).toLocaleString()}`}
          sublabel="Per configured commission rules"
        />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Revenue by equipment type</h2>
        <div className="space-y-3">
          {revenueByEquipment.map((e) => (
            <div key={e.equipmentType}>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{e.equipmentType.replaceAll("_", " ")}</span>
                <span>${(e._sum.rate ?? 0).toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${((e._sum.rate ?? 0) / maxEquipRevenue) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {revenueByEquipment.length === 0 && <p className="text-sm text-slate-400">No loads yet.</p>}
        </div>
      </div>
    </div>
  );
}
