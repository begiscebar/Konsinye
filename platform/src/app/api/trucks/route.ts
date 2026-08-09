import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession, handleApiError, companyScope } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const EQUIPMENT_TYPE_VALUES = [
  "BOX_TRUCK_26FT", "NON_CDL_BOX_TRUCK", "CDL_BOX_TRUCK",
  "SEMI_DRY_VAN", "SEMI_REEFER", "SEMI_FLATBED", "SPRINTER_VAN", "OTHER",
] as const;
const TRUCK_STATUS_VALUES = ["AVAILABLE", "ON_LOAD", "MAINTENANCE", "INACTIVE"] as const;

const createSchema = z.object({
  unitNumber: z.string().min(1),
  equipmentType: z.enum(EQUIPMENT_TYPE_VALUES),
  vin: z.string().optional(),
  plate: z.string().optional(),
  maxWeightLbs: z.coerce.number().int().positive().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().length(2).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const sp = req.nextUrl.searchParams;

    const where: any = { ...companyScope(user) };
    const status = sp.get("status");
    if (status) {
      if (!TRUCK_STATUS_VALUES.includes(status as any)) {
        return NextResponse.json({ error: `Invalid status filter: ${status}` }, { status: 400 });
      }
      where.status = status;
    }
    const equipmentType = sp.get("equipmentType");
    if (equipmentType) {
      if (!EQUIPMENT_TYPE_VALUES.includes(equipmentType as any)) {
        return NextResponse.json({ error: `Invalid equipmentType filter: ${equipmentType}` }, { status: 400 });
      }
      where.equipmentType = equipmentType;
    }

    const trucks = await prisma.truck.findMany({
      where,
      include: { company: { select: { name: true } }, driver: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ trucks });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Truck Owner adds a truck to their fleet (Admin can add on any company's behalf via companyId). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireRole(session, ["TRUCK_OWNER", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const companyId = user.role === "SUPER_ADMIN" ? (body as any).companyId : user.companyId;
    if (!companyId) return NextResponse.json({ error: "No company on this account" }, { status: 400 });

    const truck = await prisma.truck.create({ data: { ...parsed.data, companyId } });

    await logAudit({ actorUserId: user.id, action: "TRUCK_CREATED", entityType: "Truck", entityId: truck.id });

    return NextResponse.json({ truck }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
