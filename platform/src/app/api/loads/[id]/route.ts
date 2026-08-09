import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { scopeFinancialsForRole } from "@/lib/commission";

// Mirrors the constraints on these same fields in the POST /api/loads
// create schema — editing a load must not be able to set a rate/miles the
// create endpoint would have rejected outright.
const patchSchema = z.object({
  rate: z.coerce.number().positive().optional(),
  miles: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
  specialRequirements: z.string().optional(),
});

async function canView(loadId: string, user: Awaited<ReturnType<typeof requireSession>>) {
  const load = await prisma.load.findUnique({
    where: { id: loadId },
    include: {
      brokerCompany: true,
      carrierCompany: true,
      dispatcher: { select: { id: true, name: true, email: true } },
      truck: true,
      driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
      offers: { orderBy: { createdAt: "desc" } },
      statusEvents: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true, role: true } } } },
      documents: true,
      financials: true,
    },
  });
  if (!load) return { load: null, allowed: false };
  if (isSuperAdmin(user)) return { load, allowed: true };

  if (user.role === "BROKER") return { load, allowed: load.brokerCompanyId === user.companyId };
  if (user.role === "TRUCK_OWNER") {
    const offeredToUs = load.offers.some((o) => o.offeredToCompanyId === user.companyId);
    return { load, allowed: load.carrierCompanyId === user.companyId || offeredToUs };
  }
  if (user.role === "DISPATCHER") return { load, allowed: load.status === "AVAILABLE" || load.dispatcherUserId === user.id };
  if (user.role === "DRIVER") {
    const driver = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
    return { load, allowed: !!driver && load.driverProfileId === driver.id };
  }
  return { load, allowed: false };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const { load, allowed } = await canView(params.id, user);
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!allowed) throw new ForbiddenError("You cannot view this load");
    return NextResponse.json({ load: { ...load, financials: scopeFinancialsForRole(load.financials, user.role) } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const { load, allowed } = await canView(params.id, user);
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const canEdit =
      isSuperAdmin(user) ||
      (user.role === "DISPATCHER" && load.dispatcherUserId === user.id) ||
      (user.role === "BROKER" && load.brokerCompanyId === user.companyId && load.status === "AVAILABLE");
    if (!allowed || !canEdit) throw new ForbiddenError("You cannot edit this load");

    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await prisma.load.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ load: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
