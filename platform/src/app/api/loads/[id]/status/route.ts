import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ForbiddenError, ConflictError, isSuperAdmin } from "@/lib/rbac";
import { assertValidTransition, STATUSES_REQUIRING_DEDICATED_ENDPOINT } from "@/lib/loadStateMachine";
import { computeLoadFinancials } from "@/lib/commission";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/integrations/notify";
import type { LoadStatus } from "@prisma/client";

const schema = z.object({
  status: z.enum([
    "AVAILABLE", "OFFERED", "ACCEPTED", "ASSIGNED", "DRIVER_CONFIRMED", "AT_PICKUP",
    "LOADED", "IN_TRANSIT", "AT_DELIVERY", "DELIVERED", "POD_UPLOADED", "COMPLETED",
    "PAYMENT_PENDING", "PAID", "CANCELLED", "REJECTED", "DISPUTED", "DELAYED",
  ]),
  note: z.string().optional(),
});

/** Generic status-transition endpoint, used by Driver/Dispatcher/Truck Owner/Admin UIs. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireSession(session);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const load = await prisma.load.findUnique({ where: { id: params.id } });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Ownership check before the state-machine check, so a driver can't
    // move someone else's load even if the transition itself is legal.
    if (!isSuperAdmin(user)) {
      if (user.role === "DRIVER") {
        const driver = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
        if (!driver || load.driverProfileId !== driver.id) {
          throw new ForbiddenError("This load isn't assigned to you");
        }
      } else if (user.role === "TRUCK_OWNER" && load.carrierCompanyId !== user.companyId) {
        throw new ForbiddenError("This load isn't assigned to your company");
      } else if (user.role === "DISPATCHER" && load.dispatcherUserId !== user.id) {
        throw new ForbiddenError("You are not dispatching this load");
      } else if (user.role === "BROKER" && load.brokerCompanyId !== user.companyId) {
        throw new ForbiddenError("This isn't your load");
      }
    }

    const target = parsed.data.status as LoadStatus;
    if (STATUSES_REQUIRING_DEDICATED_ENDPOINT.includes(target)) {
      return NextResponse.json(
        { error: `${target} must be set via its dedicated endpoint (load offers / assign), not this one.` },
        { status: 400 }
      );
    }
    assertValidTransition(load.status, target, user.role);

    // POD_UPLOADED is a claim that proof of delivery exists — don't let it
    // be set (and therefore don't let a load reach COMPLETED, which
    // requires passing through POD_UPLOADED first) without an actual POD
    // document on file for this load.
    if (target === "POD_UPLOADED") {
      const pod = await prisma.document.findFirst({
        where: { ownerType: "LOAD", ownerLoadId: load.id, type: "POD" },
      });
      if (!pod) {
        return NextResponse.json(
          { error: "Upload a POD document for this load before marking it POD_UPLOADED" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // Guarded by the load's status at read time so two concurrent
      // transitions on the same load (e.g. a double-tap, or two tabs) can't
      // both apply — the loser gets count === 0 and a 409 instead of
      // silently re-running side effects like commission calc or the
      // payment timestamp a second time.
      const claim = await tx.load.updateMany({
        where: { id: load.id, status: load.status },
        data: { status: target },
      });
      if (claim.count === 0) {
        throw new ConflictError("This load's status just changed — reload and try again");
      }

      await tx.loadStatusEvent.create({
        data: { loadId: load.id, status: target, changedByUserId: user.id, note: parsed.data.note },
      });

      if (target === "COMPLETED") {
        const breakdown = await computeLoadFinancials({
          grossRevenue: load.rate,
          carrierCompanyId: load.carrierCompanyId,
        });
        await tx.loadFinancials.upsert({
          where: { loadId: load.id },
          create: { loadId: load.id, ...breakdown, invoiceStatus: "INVOICED" },
          update: { ...breakdown, invoiceStatus: "INVOICED" },
        });
        if (load.truckId) {
          await tx.truck.update({ where: { id: load.truckId }, data: { status: "AVAILABLE" } });
        }
        if (load.driverProfileId) {
          await tx.driverProfile.update({ where: { id: load.driverProfileId }, data: { available: true } });
        }
      }

      if (target === "PAID") {
        await tx.loadFinancials.update({
          where: { loadId: load.id },
          data: { invoiceStatus: "PAID", paymentDate: new Date() },
        });
      }

      if (target === "CANCELLED") {
        if (load.truckId) {
          await tx.truck.update({ where: { id: load.truckId }, data: { status: "AVAILABLE" } });
        }
        if (load.driverProfileId) {
          await tx.driverProfile.update({ where: { id: load.driverProfileId }, data: { available: true } });
        }
      }
    });

    await logAudit({
      actorUserId: user.id,
      action: "LOAD_STATUS_CHANGED",
      entityType: "Load",
      entityId: load.id,
      metadata: { from: load.status, to: target, note: parsed.data.note },
    });

    // Best-effort notifications to the other parties on the load.
    const notifyTargets = [load.dispatcherUserId, load.createdByUserId].filter(
      (id): id is string => !!id && id !== user.id
    );
    await Promise.all(
      notifyTargets.map((id) =>
        notifyUser({
          userId: id,
          type: target === "DELAYED" ? "DELAY_REPORTED" : "SYSTEM",
          title: `Load ${load.loadNumber}: ${target.replaceAll("_", " ")}`,
          body: parsed.data.note ?? `Status updated to ${target}.`,
          relatedLoadId: load.id,
        })
      )
    );

    return NextResponse.json({ ok: true, status: target });
  } catch (err) {
    return handleApiError(err);
  }
}
