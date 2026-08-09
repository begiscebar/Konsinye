import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const schema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) });

/** Admin approves/rejects an uploaded compliance document. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    const user = requireRole(session, ["SUPER_ADMIN"]);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        status: parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewedByUserId: user.id,
      },
    });

    await logAudit({
      actorUserId: user.id,
      action: parsed.data.decision === "APPROVE" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
      entityType: "Document",
      entityId: document.id,
    });

    return NextResponse.json({ document });
  } catch (err) {
    return handleApiError(err);
  }
}
