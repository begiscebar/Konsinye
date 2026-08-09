import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, ConflictError } from "@/lib/rbac";
import { assertValidTransition } from "@/lib/loadStateMachine";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/integrations/notify";

const schema = z.object({
  carrierCompanyId: z.string().min(1),
  matchScore: z.number().int().min(0).max(100).optional(),
  expiresInHours: z.number().positive().max(168).optional(),
});

/** Dispatcher offers an AVAILABLE load to a specific carrier company. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireRole(session, ["DISPATCHER", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const load = await prisma.load.findUnique({ where: { id: params.id } });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // A load can only be offered while it's genuinely open — this both
    // rejects re-offering a load that's already OFFERED/ACCEPTED/etc (no more
    // "current === target" shortcut to lean on) and, combined with the
    // atomic conditional update below, closes the race where two offers
    // could be created for the same load before either write commits.
    assertValidTransition(load.status, "OFFERED", user.role);

    const carrier = await prisma.company.findUnique({ where: { id: parsed.data.carrierCompanyId } });
    if (!carrier || carrier.type !== "CARRIER" || carrier.status !== "APPROVED") {
      return NextResponse.json(
        { error: "carrierCompanyId must be an approved carrier company" },
        { status: 400 }
      );
    }

    const offer = await prisma.$transaction(async (tx) => {
      const claimed = await tx.load.updateMany({
        where: { id: load.id, status: load.status },
        data: { status: "OFFERED", dispatcherUserId: user.id },
      });
      if (claimed.count === 0) {
        throw new ConflictError("This load was already offered or is no longer available");
      }
      const created = await tx.loadOffer.create({
        data: {
          loadId: load.id,
          offeredToCompanyId: parsed.data.carrierCompanyId,
          offeredByUserId: user.id,
          matchScore: parsed.data.matchScore,
          expiresAt: parsed.data.expiresInHours
            ? new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000)
            : null,
        },
      });
      await tx.loadStatusEvent.create({
        data: { loadId: load.id, status: "OFFERED", changedByUserId: user.id },
      });
      return created;
    });

    await logAudit({
      actorUserId: user.id,
      action: "LOAD_OFFERED",
      entityType: "Load",
      entityId: load.id,
      metadata: { carrierCompanyId: parsed.data.carrierCompanyId, matchScore: parsed.data.matchScore },
    });

    const owners = await prisma.user.findMany({
      where: { companyId: parsed.data.carrierCompanyId, role: "TRUCK_OWNER", status: "ACTIVE" },
    });
    await Promise.all(
      owners.map((o) =>
        notifyUser({
          userId: o.id,
          type: "LOAD_OFFERED",
          title: `New load offer: ${load.loadNumber}`,
          body: `${load.pickupCity}, ${load.pickupState} → ${load.deliveryCity}, ${load.deliveryState} — $${load.rate}`,
          relatedLoadId: load.id,
        })
      )
    );

    return NextResponse.json({ offer }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
