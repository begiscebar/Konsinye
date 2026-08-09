import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, isSuperAdmin, ForbiddenError } from "@/lib/rbac";
import { getStorageProvider } from "@/lib/integrations/storage";

/** Streams a document's bytes after checking the caller is entitled to see it. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireSession(session);

    const doc = await prisma.document.findUnique({ where: { id: params.id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!isSuperAdmin(user)) {
      let allowed = false;
      if (doc.ownerType === "USER") allowed = doc.ownerUserId === user.id;
      else if (doc.ownerType === "COMPANY") allowed = doc.ownerCompanyId === user.companyId;
      else if (doc.ownerType === "TRUCK") {
        const truck = await prisma.truck.findUnique({ where: { id: doc.ownerTruckId! } });
        allowed = !!truck && truck.companyId === user.companyId;
      } else if (doc.ownerType === "LOAD") {
        const load = await prisma.load.findUnique({ where: { id: doc.ownerLoadId! } });
        allowed =
          !!load &&
          (load.brokerCompanyId === user.companyId ||
            load.carrierCompanyId === user.companyId ||
            load.dispatcherUserId === user.id);
        if (!allowed && user.role === "DRIVER") {
          const driver = await prisma.driverProfile.findUnique({ where: { userId: user.id } });
          allowed = !!driver && load?.driverProfileId === driver.id;
        }
      }
      if (!allowed) throw new ForbiddenError("Not entitled to view this document");
    }

    const bytes = await getStorageProvider().read(doc.fileUrl);
    // Force a download (never "inline") and disable MIME-sniffing: a
    // malicious upload (e.g. an .html/.svg file containing a <script>) must
    // never be renderable in the browser under this same-origin API route,
    // or it becomes stored XSS against whoever opens the "document".
    // The filename is user-supplied at upload time, so it's stripped of
    // quote/control characters before going into the header value.
    const safeFileName = doc.fileName.replace(/[\r\n"]/g, "_");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
