import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError, ForbiddenError } from "@/lib/rbac";
import { assertValidTransition } from "@/lib/loadStateMachine";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/integrations/notify";

const schema = z.object({ decision: z.enum(["ACCEPT", "REJECT"]) });

/** Truck Owner accepts or rejects a load offer made to their company. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireRole(session, ["TRUCK_OWNER", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const offer = await prisma.loadOffer.findUnique({ where: { id: params.id }, include: { load: true } });
    if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "TRUCK_OWNER" && offer.offeredToCompanyId !== user.companyId) {
      throw new ForbiddenError("This offer was not made to your company");
    }
    if (offer.status !== "PENDING") {
      return NextResponse.json({ error: `Offer already ${offer.status.toLowerCase()}` }, { status: 409 });
    }

    const targetLoadStatus = parsed.data.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED";
    assertValidTransition(offer.load.status, targetLoadStatus, user.role);

    await prisma.$transaction([
      prisma.loadOffer.update({
        where: { id: offer.id },
        data: {
          status: parsed.data.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
          respondedAt: new Date(),
        },
      }),
      prisma.load.update({
        where: { id: offer.loadId },
        data: {
          status: targetLoadStatus,
          carrierCompanyId: parsed.data.decision === "ACCEPT" ? offer.offeredToCompanyId : null,
        },
      }),
      prisma.loadStatusEvent.create({
        data: { loadId: offer.loadId, status: targetLoadStatus, changedByUserId: user.id },
      }),
    ]);

    await logAudit({
      actorUserId: user.id,
      action: parsed.data.decision === "ACCEPT" ? "OFFER_ACCEPTED" : "OFFER_REJECTED",
      entityType: "LoadOffer",
      entityId: offer.id,
    });

    if (offer.load.dispatcherUserId) {
      await notifyUser({
        userId: offer.load.dispatcherUserId,
        type: parsed.data.decision === "ACCEPT" ? "LOAD_ACCEPTED" : "LOAD_REJECTED",
        title: `Load ${offer.load.loadNumber} ${parsed.data.decision === "ACCEPT" ? "accepted" : "rejected"}`,
        body: `Carrier ${parsed.data.decision === "ACCEPT" ? "accepted" : "rejected"} the offer.`,
        relatedLoadId: offer.loadId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
