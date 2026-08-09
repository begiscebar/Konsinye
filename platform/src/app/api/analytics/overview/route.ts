import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";
import { ACTIVE_LOAD_STATUSES } from "@/lib/loadStateMachine";

export async function GET() {
  try {
    const session = await auth();
    requireRole(session, ["SUPER_ADMIN"]);

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
      loadsForAvg,
      byState,
      byEquipment,
    ] = await Promise.all([
      prisma.load.count(),
      prisma.load.count({ where: { status: { in: ACTIVE_LOAD_STATUSES } } }),
      prisma.load.count({ where: { status: { in: ["COMPLETED", "PAYMENT_PENDING", "PAID"] } } }),
      prisma.load.count({ where: { status: "CANCELLED" } }),
      prisma.truck.count({ where: { status: { in: ["AVAILABLE", "ON_LOAD"] } } }),
      prisma.user.count({ where: { role: "DRIVER", status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "DISPATCHER", status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "BROKER", status: "ACTIVE" } }),
      prisma.loadFinancials.aggregate({
        _sum: { grossRevenue: true, platformCommission: true, dispatcherCommission: true },
      }),
      prisma.load.findMany({ select: { rate: true, miles: true } }),
      prisma.load.groupBy({ by: ["deliveryState"], _sum: { rate: true }, orderBy: { _sum: { rate: "desc" } }, take: 10 }),
      prisma.load.groupBy({ by: ["equipmentType"], _sum: { rate: true }, _count: true }),
    ]);

    const ratedLoads = loadsForAvg.filter((l) => l.miles && l.miles > 0);
    const avgRate = loadsForAvg.length
      ? loadsForAvg.reduce((a, l) => a + l.rate, 0) / loadsForAvg.length
      : 0;
    const avgRpm = ratedLoads.length
      ? ratedLoads.reduce((a, l) => a + l.rate / (l.miles as number), 0) / ratedLoads.length
      : 0;

    return NextResponse.json({
      totalLoads,
      activeLoads,
      completedLoads,
      cancelledLoads,
      activeTrucks,
      activeDrivers,
      activeDispatchers,
      activeBrokers,
      totalRevenue: financials._sum.grossRevenue ?? 0,
      platformRevenue: financials._sum.platformCommission ?? 0,
      dispatcherCommissionTotal: financials._sum.dispatcherCommission ?? 0,
      avgRate: Math.round(avgRate),
      avgRpm: Math.round(avgRpm * 100) / 100,
      revenueByState: byState.map((s) => ({ state: s.deliveryState, revenue: s._sum.rate ?? 0 })),
      revenueByEquipment: byEquipment.map((e) => ({
        equipmentType: e.equipmentType,
        revenue: e._sum.rate ?? 0,
        count: e._count,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
