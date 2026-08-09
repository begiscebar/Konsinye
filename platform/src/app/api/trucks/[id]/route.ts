import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

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
    const allowed = [
      "status", "currentCity", "currentState", "maxWeightLbs", "plate", "vin",
    ] as const;
    const data: Record<string, unknown> = {};
    for (const f of allowed) if (f in body) data[f] = body[f];

    const updated = await prisma.truck.update({ where: { id: params.id }, data });
    await logAudit({ actorUserId: user.id, action: "TRUCK_UPDATED", entityType: "Truck", entityId: truck.id, metadata: data });

    return NextResponse.json({ truck: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
