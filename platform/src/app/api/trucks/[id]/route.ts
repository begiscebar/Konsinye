import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  // ON_LOAD is system-managed only (set by /assign, cleared by /status on
  // completion/cancellation) — a truck owner manually setting it (or
  // manually setting AVAILABLE while it's actually on a load) would defeat
  // the double-booking guard on the assign endpoint.
  status: z.enum(["AVAILABLE", "MAINTENANCE", "INACTIVE"]).optional(),
  currentCity: z.string().optional(),
  currentState: z.string().length(2).optional(),
  maxWeightLbs: z.coerce.number().int().positive().optional(),
  plate: z.string().optional(),
  vin: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireSession(session);

    const truck = await prisma.truck.findUnique({ where: { id: params.id } });
    if (!truck) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isSuperAdmin(user) && truck.companyId !== user.companyId) {
      throw new ForbiddenError("Not your truck");
    }
    const body = await req.json().catch(() => ({}));
    if (truck.status === "ON_LOAD" && "status" in body) {
      return NextResponse.json(
        { error: "This truck is on an active load — its status changes automatically" },
        { status: 409 }
      );
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await prisma.truck.update({ where: { id: params.id }, data: parsed.data });
    await logAudit({ actorUserId: user.id, action: "TRUCK_UPDATED", entityType: "Truck", entityId: truck.id, metadata: parsed.data });

    return NextResponse.json({ truck: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
