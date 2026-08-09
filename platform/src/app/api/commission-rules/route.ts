import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    requireRole(session, ["SUPER_ADMIN"]);
    const rules = await prisma.commissionRule.findMany({
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ rules });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(["PERCENTAGE", "FLAT_PER_LOAD", "DISPATCH_FLAT_FEE", "SUBSCRIPTION", "MEMBERSHIP", "BROKER_FEE"]),
  value: z.coerce.number().nonnegative(),
  appliesToRole: z.enum(["SUPER_ADMIN", "DISPATCHER", "TRUCK_OWNER", "DRIVER", "BROKER"]).optional(),
  companyId: z.string().optional(),
});

/** Admin defines/edits the platform's configurable commission structure — never hard-coded. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const admin = requireRole(session, ["SUPER_ADMIN"]);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const rule = await prisma.commissionRule.create({ data: parsed.data });
    await logAudit({ actorUserId: admin.id, action: "COMMISSION_RULE_CREATED", entityType: "CommissionRule", entityId: rule.id, metadata: parsed.data });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
