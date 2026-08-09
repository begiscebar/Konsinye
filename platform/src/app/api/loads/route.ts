import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole, handleApiError, isSuperAdmin } from "@/lib/rbac";
import { generateLoadNumber } from "@/lib/loadNumber";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

// Treats "" (an empty optional form field) the same as an absent field,
// instead of z.coerce.number() turning "" into 0 and failing .positive().
const optionalPositiveNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().positive().optional()
);
const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional()
);

const createSchema = z.object({
  equipmentType: z.enum([
    "BOX_TRUCK_26FT",
    "NON_CDL_BOX_TRUCK",
    "CDL_BOX_TRUCK",
    "SEMI_DRY_VAN",
    "SEMI_REEFER",
    "SEMI_FLATBED",
    "SPRINTER_VAN",
    "OTHER",
  ]),
  pickupLocation: z.string().min(1),
  pickupAddress: z.string().min(1),
  pickupCity: z.string().min(1),
  pickupState: z.string().length(2),
  pickupApptStart: z.coerce.date(),
  pickupApptEnd: z.coerce.date().optional(),
  deliveryLocation: z.string().min(1),
  deliveryAddress: z.string().min(1),
  deliveryCity: z.string().min(1),
  deliveryState: z.string().length(2),
  deliveryApptStart: z.coerce.date(),
  deliveryApptEnd: z.coerce.date().optional(),
  commodity: z.string().min(1),
  weightLbs: z.coerce.number().positive(),
  dimensions: z.string().optional(),
  pieces: optionalPositiveInt,
  rate: z.coerce.number().positive(),
  miles: optionalPositiveNumber,
  specialRequirements: z.string().optional(),
  notes: z.string().optional(),
});

/** Loads visible to the current user, scoped by role, with search/filter query params. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const sp = req.nextUrl.searchParams;

    const where: Prisma.LoadWhereInput = {};

    if (!isSuperAdmin(user)) {
      if (user.role === "BROKER") where.brokerCompanyId = user.companyId ?? "__none__";
      else if (user.role === "TRUCK_OWNER") {
        // Loads already won plus loads currently offered to this company (not yet accepted).
        where.OR = [
          { carrierCompanyId: user.companyId ?? "__none__" },
          { offers: { some: { offeredToCompanyId: user.companyId ?? "__none__", status: "PENDING" } } },
        ];
      } else if (user.role === "DRIVER") {
        const driver = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
        where.driverProfileId = driver?.id ?? "__none__";
      } else if (user.role === "DISPATCHER") {
        // Dispatchers see the open board plus whatever they're actively dispatching.
        where.OR = [{ status: "AVAILABLE" }, { dispatcherUserId: user.id }];
      }
    }

    const status = sp.get("status");
    if (status) where.status = status as any;
    const equipmentType = sp.get("equipmentType");
    if (equipmentType) where.equipmentType = equipmentType as any;
    const originState = sp.get("originState");
    if (originState) where.pickupState = originState.toUpperCase();
    const destState = sp.get("destState");
    if (destState) where.deliveryState = destState.toUpperCase();
    const minRate = sp.get("minRate");
    if (minRate) where.rate = { gte: Number(minRate) };
    const pickupAfter = sp.get("pickupAfter");
    if (pickupAfter) where.pickupApptStart = { gte: new Date(pickupAfter) };

    const loads = await prisma.load.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        brokerCompany: { select: { name: true } },
        carrierCompany: { select: { name: true } },
        truck: { select: { unitNumber: true } },
        driver: { include: { user: { select: { name: true } } } },
        financials: true,
      },
    });

    return NextResponse.json({ loads });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Brokers, Dispatchers and Admins can post a new load (starts AVAILABLE). */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireRole(session, ["BROKER", "DISPATCHER", "SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    let brokerCompanyId = user.companyId;
    if (user.role !== "BROKER") {
      // Dispatcher/Admin posting on behalf of a broker must specify one.
      const bodyBrokerId = (body as any)?.brokerCompanyId;
      if (!bodyBrokerId) {
        return NextResponse.json(
          { error: "brokerCompanyId is required when posting as dispatcher/admin" },
          { status: 400 }
        );
      }
      brokerCompanyId = bodyBrokerId;
    }
    if (!brokerCompanyId) {
      return NextResponse.json({ error: "No broker company associated with this account" }, { status: 400 });
    }

    const loadNumber = await generateLoadNumber();

    const load = await prisma.load.create({
      data: {
        loadNumber,
        equipmentType: data.equipmentType,
        brokerCompanyId,
        createdByUserId: user.id,
        pickupLocation: data.pickupLocation,
        pickupAddress: data.pickupAddress,
        pickupCity: data.pickupCity,
        pickupState: data.pickupState.toUpperCase(),
        pickupApptStart: data.pickupApptStart,
        pickupApptEnd: data.pickupApptEnd,
        deliveryLocation: data.deliveryLocation,
        deliveryAddress: data.deliveryAddress,
        deliveryCity: data.deliveryCity,
        deliveryState: data.deliveryState.toUpperCase(),
        deliveryApptStart: data.deliveryApptStart,
        deliveryApptEnd: data.deliveryApptEnd,
        commodity: data.commodity,
        weightLbs: data.weightLbs,
        dimensions: data.dimensions,
        pieces: data.pieces,
        rate: data.rate,
        miles: data.miles,
        specialRequirements: data.specialRequirements,
        notes: data.notes,
        status: "AVAILABLE",
      },
    });

    await logAudit({
      actorUserId: user.id,
      action: "LOAD_CREATED",
      entityType: "Load",
      entityId: load.id,
      metadata: { loadNumber: load.loadNumber },
    });

    return NextResponse.json({ load }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
