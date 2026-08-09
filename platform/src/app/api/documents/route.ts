import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/integrations/storage";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/integrations/notify";
import type { DocumentOwnerType } from "@prisma/client";

async function assertCanUpload(
  user: Awaited<ReturnType<typeof requireSession>>,
  ownerType: DocumentOwnerType,
  ownerId: string
) {
  if (isSuperAdmin(user)) return;
  if (ownerType === "USER") {
    if (ownerId !== user.id) throw new ForbiddenError("Can only upload your own documents");
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
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = requireSession(session);
    const sp = req.nextUrl.searchParams;
    const ownerType = sp.get("ownerType") as DocumentOwnerType | null;
    const ownerId = sp.get("ownerId");

    const where: any = {};
    if (ownerType) where.ownerType = ownerType;
    if (ownerId) {
      if (ownerType === "USER") where.ownerUserId = ownerId;
      if (ownerType === "COMPANY") where.ownerCompanyId = ownerId;
      if (ownerType === "TRUCK") where.ownerTruckId = ownerId;
      if (ownerType === "LOAD") where.ownerLoadId = ownerId;
    } else if (!isSuperAdmin(user)) {
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
    const type = form.get("type") as string | null;
    const ownerType = form.get("ownerType") as DocumentOwnerType | null;
    const ownerId = form.get("ownerId") as string | null;
    const expirationDate = form.get("expirationDate") as string | null;

    if (!(file instanceof File) || !type || !ownerType || !ownerId) {
      return NextResponse.json({ error: "file, type, ownerType and ownerId are required" }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
    }

    await assertCanUpload(user, ownerType, ownerId);

    const buf = Buffer.from(await file.arrayBuffer());
    const { storageKey } = await getStorageProvider().save(file.name, buf);

    const document = await prisma.document.create({
      data: {
        ownerType,
        ownerUserId: ownerType === "USER" ? ownerId : undefined,
        ownerCompanyId: ownerType === "COMPANY" ? ownerId : undefined,
        ownerTruckId: ownerType === "TRUCK" ? ownerId : undefined,
        ownerLoadId: ownerType === "LOAD" ? ownerId : undefined,
        type: type as any,
        fileName: file.name,
        fileUrl: storageKey,
        uploadedByUserId: user.id,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
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
