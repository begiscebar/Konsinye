import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin } from "@/lib/rbac";

/** Admin: all companies. Dispatcher: approved carriers (for making offers). Others: their own company only. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type");

    let where: any = {};
    if (isSuperAdmin(user)) {
      if (type) where.type = type;
    } else if (user.role === "DISPATCHER") {
      where = { type: "CARRIER", status: "APPROVED" };
    } else {
      where = { id: user.companyId ?? "__none__" };
    }

    const companies = await prisma.company.findMany({ where, orderBy: { name: "asc" } });
    return NextResponse.json({ companies });
  } catch (err) {
    return handleApiError(err);
  }
}
