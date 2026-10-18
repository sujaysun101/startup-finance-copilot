/** Character caps shared by the finance form and POST /api/analyze-finances. */
export const FINANCE_FIELD_LIMITS = {
  mrr: 16,
  monthlyBurn: 16,
  cashOnHand: 16,
  growthRate: 8,
  teamSize: 6,
  stage: 40,
} as const;

export type FinanceField = keyof typeof FINANCE_FIELD_LIMITS;
