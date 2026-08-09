import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, ForbiddenError, ConflictError } from "@/lib/rbac";
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
    if (truck.status !== "AVAILABLE") {
      return NextResponse.json({ error: "This truck is already on another load" }, { status: 409 });
    }
    if (!driver.available) {
      return NextResponse.json({ error: "This driver is already on another load" }, { status: 409 });
    }

    // Atomically claim the load, the truck and the driver together: every
    // updateMany below is guarded by the "still available/still in this
    // state" condition it just checked above, so two truck owners assigning
    // the same truck (or the same driver) to two different loads at the
    // same time can't both win — the loser's updateMany affects 0 rows and
    // the whole transaction is rolled back with a 409, instead of silently
    // double-booking the truck/driver across two active loads.
    await prisma.$transaction(async (tx) => {
      const loadClaim = await tx.load.updateMany({
        where: { id: load.id, status: load.status },
        data: { status: "ASSIGNED", truckId: truck.id, driverProfileId: driver.id },
      });
      if (loadClaim.count === 0) {
        throw new ConflictError("This load is no longer in an accepted state");
      }

      const truckClaim = await tx.truck.updateMany({
        where: { id: truck.id, status: "AVAILABLE" },
        data: { status: "ON_LOAD" },
      });
      if (truckClaim.count === 0) {
        throw new ConflictError("This truck was just assigned to another load");
      }

      const driverClaim = await tx.driverProfile.updateMany({
        where: { id: driver.id, available: true },
        data: { available: false },
      });
      if (driverClaim.count === 0) {
        throw new ConflictError("This driver was just assigned to another load");
      }

      await tx.loadStatusEvent.create({
        data: { loadId: load.id, status: "ASSIGNED", changedByUserId: user.id },
      });
    });

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
