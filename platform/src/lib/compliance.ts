import { prisma } from "@/lib/prisma";

export interface ComplianceFlag {
  requirementName: string;
  documentType: string;
  reason: "MISSING" | "EXPIRED" | "PENDING_REVIEW";
  expirationDate?: Date | null;
}

/**
 * Checks a company's documents against the configured compliance rules
 * (platform defaults + this company's overrides). Does NOT assert that any
 * document is legally required — that's determined entirely by the
 * ComplianceRequirement rows an admin configures for this company/vehicle
 * type/interstate status.
 */
export async function checkCompanyCompliance(companyId: string): Promise<ComplianceFlag[]> {
  const [company, requirements, documents] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.complianceRequirement.findMany({
      where: { active: true, OR: [{ companyId: null }, { companyId }] },
    }),
    prisma.document.findMany({ where: { ownerType: "COMPANY", ownerCompanyId: companyId } }),
  ]);
  if (!company) return [];

  const applicable = requirements.filter(
    (r) => !r.appliesToCompanyType || r.appliesToCompanyType === company.type
  );

  const flags: ComplianceFlag[] = [];
  const now = new Date();

  for (const req of applicable) {
    const doc = documents.find((d) => d.type === req.documentType);
    if (!doc) {
      flags.push({ requirementName: req.name, documentType: req.documentType, reason: "MISSING" });
      continue;
    }
    if (doc.expirationDate && doc.expirationDate < now) {
      flags.push({
        requirementName: req.name,
        documentType: req.documentType,
        reason: "EXPIRED",
        expirationDate: doc.expirationDate,
      });
      continue;
    }
    if (doc.status === "PENDING_REVIEW") {
      flags.push({
        requirementName: req.name,
        documentType: req.documentType,
        reason: "PENDING_REVIEW",
      });
    }
  }

  return flags;
}

/** Documents (any owner) expiring within `withinDays` — used for reminder notifications. */
export async function findExpiringDocuments(withinDays = 30) {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  return prisma.document.findMany({
    where: { expirationDate: { lte: cutoff, gte: new Date() } },
    orderBy: { expirationDate: "asc" },
  });
}
