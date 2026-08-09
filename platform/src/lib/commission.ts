import { prisma } from "@/lib/prisma";
import type { CommissionRule, LoadFinancials, UserRole } from "@prisma/client";

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

/**
 * The full LoadFinancials row includes the platform's and dispatcher's cut
 * of every load, which is internal-operator information — a broker (the
 * customer paying for the load) should see what they're being charged and
 * whether it's been paid, not how the platform splits its own margin with
 * the dispatcher/carrier. The UI already only renders the broker-safe
 * subset, but authorization has to hold at the API layer too: a broker
 * opening devtools must not find the full breakdown in the JSON response
 * just because the UI chose not to render it.
 */
export function scopeFinancialsForRole<T extends LoadFinancials | null>(
  financials: T,
  role: UserRole
): T extends null ? null : Partial<LoadFinancials> {
  if (!financials) return null as any;
  // Brokers see what they're charged and whether it's paid, not the
  // platform/dispatcher margin split. Drivers have no product surface for
  // financials at all today (DriverLoadDetail never renders them) — same
  // redaction applies so the API doesn't leak more than the UI shows.
  if (role === "BROKER" || role === "DRIVER") {
    return {
      id: financials.id,
      loadId: financials.loadId,
      grossRevenue: financials.grossRevenue,
      invoiceStatus: financials.invoiceStatus,
      paymentDate: financials.paymentDate,
      transactionId: financials.transactionId,
      createdAt: financials.createdAt,
      updatedAt: financials.updatedAt,
    } as any;
  }
  return financials as any;
}
