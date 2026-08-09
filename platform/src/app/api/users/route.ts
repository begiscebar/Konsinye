import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    requireRole(session, ["SUPER_ADMIN"]);
    const sp = req.nextUrl.searchParams;
    const where: any = {};
    const role = sp.get("role");
    if (role) where.role = role;
    const status = sp.get("status");
    if (status) where.status = status;

    const users = await prisma.user.findMany({
      where,
      include: { company: { select: { name: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "DISPATCHER", "TRUCK_OWNER", "DRIVER", "BROKER"]),
  companyId: z.string().optional(),
});

/** Admin directly creates a user (active immediately — bypasses self-signup approval). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const admin = requireRole(session, ["SUPER_ADMIN"]);

    const parsed = createSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        companyId: parsed.data.companyId,
        status: "ACTIVE",
      },
    });

    await logAudit({ actorUserId: admin.id, action: "USER_CREATED", entityType: "User", entityId: user.id, metadata: { role: user.role } });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
