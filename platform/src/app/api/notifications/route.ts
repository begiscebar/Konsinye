import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    const user = requireSession(session);
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Marks one (?id=) or all notifications read for the current user. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const id = req.nextUrl.searchParams.get("id");

    await prisma.notification.updateMany({
      where: { userId: user.id, ...(id ? { id } : {}) },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
