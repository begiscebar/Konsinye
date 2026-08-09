import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";
import { rankTrucksForLoad } from "@/lib/matching";

/** Ranked trucks (0-100 match score) for a load — powers the dispatcher's "recommended trucks" panel. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    requireRole(session, ["DISPATCHER", "SUPER_ADMIN"]);

    const load = await prisma.load.findUnique({ where: { id: params.id } });
    if (!load) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const trucks = await prisma.truck.findMany({
      where: { status: "AVAILABLE" },
      include: { company: true, driver: true },
      take: 200,
    });

    const ranked = rankTrucksForLoad(load, trucks);
    const withCompany = ranked.map((r) => ({
      ...r,
      truck: trucks.find((t) => t.id === r.truckId)
        ? {
            id: r.truckId,
            unitNumber: trucks.find((t) => t.id === r.truckId)!.unitNumber,
            equipmentType: trucks.find((t) => t.id === r.truckId)!.equipmentType,
            companyId: trucks.find((t) => t.id === r.truckId)!.companyId,
            companyName: trucks.find((t) => t.id === r.truckId)!.company.name,
          }
        : null,
    }));

    return NextResponse.json({ matches: withCompany.slice(0, 25) });
  } catch (err) {
    return handleApiError(err);
  }
}
