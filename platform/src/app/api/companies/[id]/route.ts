import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  minRate: z.number().positive().optional(),
  preferredStates: z.array(z.string().length(2)).optional(),
  mcNumber: z.string().optional(),
  usdotNumber: z.string().optional(),
  phone: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireSession(session);
    if (!isSuperAdmin(user) && user.companyId !== params.id) {
      throw new ForbiddenError("Not your company");
    }
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Non-admins may edit their own profile fields but not their own approval status.
    const data = { ...parsed.data };
    if (!isSuperAdmin(user)) delete data.status;

    const company = await prisma.company.update({ where: { id: params.id }, data: data as any });

    await logAudit({ actorUserId: user.id, action: "COMPANY_UPDATED", entityType: "Company", entityId: company.id, metadata: data });

    return NextResponse.json({ company });
  } catch (err) {
    return handleApiError(err);
  }
}
