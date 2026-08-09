import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/integrations/storage";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/integrations/notify";
import type { DocumentOwnerType } from "@prisma/client";

const OWNER_TYPE_VALUES = ["USER", "COMPANY", "TRUCK", "LOAD"] as const;
const DOCUMENT_TYPE_VALUES = [
  "CDL", "DRIVER_LICENSE", "MEDICAL_CARD", "INSURANCE_COI", "W9", "BOL", "POD",
  "RATE_CONFIRMATION", "MC_AUTHORITY", "USDOT_REGISTRATION", "BOC3", "UCR",
  "VEHICLE_REGISTRATION", "DRUG_ALCOHOL_COMPLIANCE", "OTHER",
] as const;
const uploadFieldsSchema = z.object({
  type: z.enum(DOCUMENT_TYPE_VALUES),
  ownerType: z.enum(OWNER_TYPE_VALUES),
  ownerId: z.string().min(1),
  expirationDate: z.coerce.date().optional(),
});

/**
 * Authorizes read AND write access to documents for a given (ownerType,
 * ownerId) pair. Used by both GET (list) and POST (upload) — the same rule
 * decides who may see a company/truck/load/user's documents and who may add
 * to them. Never trust ownerId from the client without this check: every
 * caller of this function (and this function alone) is what stands between
 * a document list request and another tenant's CDLs/COIs/PODs.
 */
async function assertCanAccessDocumentsFor(
  user: Awaited<ReturnType<typeof requireSession>>,
  ownerType: DocumentOwnerType,
  ownerId: string
) {
  if (isSuperAdmin(user)) return;
  if (ownerType === "USER") {
    if (ownerId !== user.id) throw new ForbiddenError("Can only access your own documents");
    return;
  }
  if (ownerType === "COMPANY") {
    if (ownerId !== user.companyId) throw new ForbiddenError("Not your company");
    return;
  }
  if (ownerType === "TRUCK") {
    const truck = await prisma.truck.findUnique({ where: { id: ownerId } });
    if (!truck || truck.companyId !== user.companyId) throw new ForbiddenError("Not your truck");
    return;
  }
  if (ownerType === "LOAD") {
    const load = await prisma.load.findUnique({ where: { id: ownerId } });
    if (!load) throw new ForbiddenError("Load not found");
    const onLoad =
      load.brokerCompanyId === user.companyId ||
      load.carrierCompanyId === user.companyId ||
      load.dispatcherUserId === user.id;
    const driverOnLoad = await prisma.driverProfile.findFirst({
      where: { userId: user.id, loadsAsDriver: { some: { id: ownerId } } },
    });
    if (!onLoad && !driverOnLoad) throw new ForbiddenError("Not associated with this load");
    return;
  }
  throw new ForbiddenError("Unrecognized document owner type");
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const sp = req.nextUrl.searchParams;
    const ownerType = sp.get("ownerType") as DocumentOwnerType | null;
    const ownerId = sp.get("ownerId");

    const where: any = {};
    if (ownerType && ownerId) {
      // Both present: authorize this specific (ownerType, ownerId) pair —
      // this is the only path that may return another tenant's data, so it
      // must never be reachable without the check succeeding first.
      await assertCanAccessDocumentsFor(user, ownerType, ownerId);
      where.ownerType = ownerType;
      if (ownerType === "USER") where.ownerUserId = ownerId;
      if (ownerType === "COMPANY") where.ownerCompanyId = ownerId;
      if (ownerType === "TRUCK") where.ownerTruckId = ownerId;
      if (ownerType === "LOAD") where.ownerLoadId = ownerId;
    } else if (ownerType || ownerId) {
      // A partial filter (one without the other) can't be authorized against
      // a specific owner, and must never fall through to an unscoped query.
      return NextResponse.json({ error: "ownerType and ownerId must be provided together" }, { status: 400 });
    } else if (!isSuperAdmin(user)) {
      // No owner filter at all: default to "my company's documents" rather
      // than every document in the system.
      where.ownerCompanyId = user.companyId ?? "__none__";
    }

    const documents = await prisma.document.findMany({
      where,
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ documents });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }

    const parsed = uploadFieldsSchema.safeParse({
      type: form.get("type"),
      ownerType: form.get("ownerType"),
      ownerId: form.get("ownerId"),
      expirationDate: form.get("expirationDate") || undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { type, ownerType, ownerId, expirationDate } = parsed.data;

    await assertCanAccessDocumentsFor(user, ownerType, ownerId);

    const buf = Buffer.from(await file.arrayBuffer());
    const { storageKey } = await getStorageProvider().save(file.name, buf);

    const document = await prisma.document.create({
      data: {
        ownerType,
        ownerUserId: ownerType === "USER" ? ownerId : undefined,
        ownerCompanyId: ownerType === "COMPANY" ? ownerId : undefined,
        ownerTruckId: ownerType === "TRUCK" ? ownerId : undefined,
        ownerLoadId: ownerType === "LOAD" ? ownerId : undefined,
        type,
        fileName: file.name,
        fileUrl: storageKey,
        uploadedByUserId: user.id,
        expirationDate: expirationDate ?? null,
      },
    });

    await logAudit({
      actorUserId: user.id,
      action: "DOCUMENT_UPLOADED",
      entityType: "Document",
      entityId: document.id,
      metadata: { type, ownerType, ownerId },
    });

    if (ownerType === "LOAD" && (type === "POD")) {
      const load = await prisma.load.findUnique({ where: { id: ownerId } });
      if (load?.dispatcherUserId) {
        await notifyUser({
          userId: load.dispatcherUserId,
          type: "POD_UPLOADED",
          title: `POD uploaded for ${load.loadNumber}`,
          body: "The driver uploaded proof of delivery.",
          relatedLoadId: load.id,
        });
      }
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
