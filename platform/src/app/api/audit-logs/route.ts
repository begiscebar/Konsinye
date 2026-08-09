import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, ["SUPER_ADMIN"]);
    const sp = req.nextUrl.searchParams;
    const entityType = sp.get("entityType");

    const logs = await prisma.auditLog.findMany({
      where: entityType ? { entityType } : {},
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiError(err);
  }
}
