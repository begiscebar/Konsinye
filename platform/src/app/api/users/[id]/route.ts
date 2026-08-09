import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED", "PENDING"]) });

/** Admin approves/suspends/rejects a user (and, if it's their company's first user, the company too). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const admin = requireRole(session, ["SUPER_ADMIN"]);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const user = await prisma.user.update({ where: { id: params.id }, data: { status: parsed.data.status } });

    if (parsed.data.status === "ACTIVE" && user.companyId) {
      await prisma.company.updateMany({
        where: { id: user.companyId, status: "PENDING" },
        data: { status: "APPROVED" },
      });
    }

    await logAudit({
      actorUserId: admin.id,
      action: "USER_STATUS_CHANGED",
      entityType: "User",
      entityId: user.id,
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
