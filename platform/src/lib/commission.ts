import { prisma } from "@/lib/prisma";
import type { CommissionRule } from "@prisma/client";

export interface FinancialBreakdown {
  grossRevenue: number;
  platformCommission: number;
  dispatcherCommission: number;
  otherFees: number;
  carrierPayment: number;
  netAmount: number;
}

function applyRule(rule: CommissionRule | undefined, gross: number): number {
  if (!rule) return 0;
  if (rule.type === "PERCENTAGE") return round2((gross * rule.value) / 100);
  if (rule.type === "FLAT_PER_LOAD" || rule.type === "DISPATCH_FLAT_FEE") return round2(rule.value);
  return 0; // SUBSCRIPTION/MEMBERSHIP/BROKER_FEE don't apply per-load
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Resolves the effective commission rules for a carrier — a company-specific
 * rule always overrides the platform default of the same kind. Nothing here
 * hard-codes a percentage; admins configure `CommissionRule` rows.
 */
export async function resolveCommissionRules(carrierCompanyId: string | null) {
  const rules = await prisma.commissionRule.findMany({
    where: {
      active: true,
      OR: [{ companyId: null }, { companyId: carrierCompanyId ?? undefined }],
    },
  });

  const pick = (predicate: (r: CommissionRule) => boolean) => {
    const companySpecific = rules.find((r) => r.companyId === carrierCompanyId && predicate(r));
    if (companySpecific) return companySpecific;
    return rules.find((r) => r.companyId === null && predicate(r));
  };

  const platformRule = pick(
    (r) => r.appliesToRole == null && (r.type === "PERCENTAGE" || r.type === "FLAT_PER_LOAD")
  );
  const dispatcherRule = pick((r) => r.appliesToRole === "DISPATCHER");

  return { platformRule, dispatcherRule };
}

export async function computeLoadFinancials(input: {
  grossRevenue: number;
  carrierCompanyId: string | null;
}): Promise<FinancialBreakdown> {
  const { platformRule, dispatcherRule } = await resolveCommissionRules(input.carrierCompanyId);

  const platformCommission = applyRule(platformRule, input.grossRevenue);
  const dispatcherCommission = applyRule(dispatcherRule, input.grossRevenue);
  const otherFees = 0;
  const netAmount = round2(
    input.grossRevenue - platformCommission - dispatcherCommission - otherFees
  );

  return {
    grossRevenue: round2(input.grossRevenue),
    platformCommission,
    dispatcherCommission,
    otherFees,
    carrierPayment: netAmount,
    netAmount,
  };
}
