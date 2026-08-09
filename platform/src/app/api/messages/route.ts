import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { notifyUser } from "@/lib/integrations/notify";

/** Load-scoped thread (loadId set) — visible to everyone associated with that load. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const loadId = req.nextUrl.searchParams.get("loadId");
    if (!loadId) return NextResponse.json({ error: "loadId is required" }, { status: 400 });

    const load = await prisma.load.findUnique({ where: { id: loadId } });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isSuperAdmin(user)) {
      let allowed =
        load.brokerCompanyId === user.companyId ||
        load.carrierCompanyId === user.companyId ||
        load.dispatcherUserId === user.id;
      if (!allowed && user.role === "DRIVER") {
        const driver = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
        allowed = !!driver && load.driverProfileId === driver.id;
      }
      if (!allowed) throw new ForbiddenError("Not associated with this load");
    }

    const messages = await prisma.message.findMany({
      where: { loadId },
      include: { sender: { select: { name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({ loadId: z.string().min(1), body: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const load = await prisma.load.findUnique({ where: { id: parsed.data.loadId } });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isSuperAdmin(user)) {
      let allowed =
        load.brokerCompanyId === user.companyId ||
        load.carrierCompanyId === user.companyId ||
        load.dispatcherUserId === user.id;
      if (!allowed && user.role === "DRIVER") {
        const driver = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
        allowed = !!driver && load.driverProfileId === driver.id;
      }
      if (!allowed) throw new ForbiddenError("Not associated with this load");
    }

    const message = await prisma.message.create({
      data: { loadId: load.id, senderId: user.id, body: parsed.data.body },
    });

    const recipients = new Set<string>();
    if (load.dispatcherUserId) recipients.add(load.dispatcherUserId);
    if (load.driverProfileId) {
      const d = await prisma.driverProfile.findUnique({ where: { id: load.driverProfileId } });
      if (d) recipients.add(d.userId);
    }
    recipients.delete(user.id);
    await Promise.all(
      [...recipients].map((id) =>
        notifyUser({
          userId: id,
          type: "MESSAGE",
          title: `New message on ${load.loadNumber}`,
          body: parsed.data.body.slice(0, 140),
          relatedLoadId: load.id,
        })
      )
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
