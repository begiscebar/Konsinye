import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession, handleApiError, isSuperAdmin } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  isCdlDriver: z.boolean().optional(),
  cdlNumber: z.string().optional(),
  cdlState: z.string().length(2).optional(),
  homeCity: z.string().optional(),
  homeState: z.string().length(2).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);

    const companyFilter = isSuperAdmin(user) ? {} : { companyId: user.companyId ?? "__none__" };

    const drivers = await prisma.driverProfile.findMany({
      where: { user: { role: "DRIVER", ...companyFilter } },
      include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } }, currentTruck: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ drivers });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Truck Owner creates a driver account under their own company (active immediately — no self-signup needed). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireRole(session, ["TRUCK_OWNER", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const companyId = user.role === "SUPER_ADMIN" ? (body as any).companyId : user.companyId;
    if (!companyId) return NextResponse.json({ error: "No company on this account" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const driverUser = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        phone: parsed.data.phone,
        role: "DRIVER",
        status: "ACTIVE",
        companyId,
        driverProfile: {
          create: {
            isCdlDriver: parsed.data.isCdlDriver ?? false,
            cdlNumber: parsed.data.cdlNumber,
            cdlState: parsed.data.cdlState,
            homeCity: parsed.data.homeCity,
            homeState: parsed.data.homeState,
          },
        },
      },
      include: { driverProfile: true },
    });

    await logAudit({ actorUserId: user.id, action: "DRIVER_CREATED", entityType: "User", entityId: driverUser.id });

    return NextResponse.json({ driver: driverUser }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
