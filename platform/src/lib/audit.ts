import { prisma } from "@/lib/prisma";

/** Writes an immutable audit trail row. Call this after any state-changing action. */
export async function logAudit(params: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata as any,
    },
  });
}
