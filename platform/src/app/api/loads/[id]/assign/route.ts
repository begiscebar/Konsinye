import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, ForbiddenError } from "@/lib/rbac";
import { assertValidTransition } from "@/lib/loadStateMachine";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/integrations/notify";

const schema = z.object({ truckId: z.string().min(1), driverProfileId: z.string().min(1) });

/** Truck Owner assigns one of their trucks + drivers to an ACCEPTED load. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireRole(session, ["TRUCK_OWNER", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const load = await prisma.load.findUnique({ where: { id: params.id } });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "TRUCK_OWNER" && load.carrierCompanyId !== user.companyId) {
      throw new ForbiddenError("This load isn't assigned to your company");
    }
    assertValidTransition(load.status, "ASSIGNED", user.role);

    const [truck, driver] = await Promise.all([
      prisma.truck.findUnique({ where: { id: parsed.data.truckId } }),
      prisma.driverProfile.findUnique({ where: { id: parsed.data.driverProfileId }, include: { user: true } }),
    ]);
    if (!truck || truck.companyId !== load.carrierCompanyId) {
      return NextResponse.json({ error: "Truck does not belong to this company" }, { status: 400 });
    }
    if (!driver || driver.user.companyId !== load.carrierCompanyId) {
      return NextResponse.json({ error: "Driver does not belong to this company" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.load.update({
        where: { id: load.id },
        data: { status: "ASSIGNED", truckId: truck.id, driverProfileId: driver.id },
      }),
      prisma.truck.update({ where: { id: truck.id }, data: { status: "ON_LOAD" } }),
      prisma.loadStatusEvent.create({
        data: { loadId: load.id, status: "ASSIGNED", changedByUserId: user.id },
      }),
    ]);

    await logAudit({
      actorUserId: user.id,
      action: "LOAD_ASSIGNED",
      entityType: "Load",
      entityId: load.id,
      metadata: { truckId: truck.id, driverProfileId: driver.id },
    });

    await notifyUser({
      userId: driver.userId,
      type: "DRIVER_ASSIGNED",
      title: `You've been assigned load ${load.loadNumber}`,
      body: `${load.pickupCity}, ${load.pickupState} → ${load.deliveryCity}, ${load.deliveryState}`,
      relatedLoadId: load.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
