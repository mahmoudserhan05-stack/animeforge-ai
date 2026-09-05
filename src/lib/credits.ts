import { prisma } from "@/lib/prisma";
import { CREDIT_COSTS, type CreditReason } from "@/lib/credit-costs";
export { CREDIT_COSTS } from "@/lib/credit-costs";
export type { CreditReason } from "@/lib/credit-costs";

/**
 * Credits are an append-only ledger (CreditTransaction), never a mutable
 * counter on User — balance is always the sum of transactions. This keeps
 * spend auditable and makes "insufficient credits" races safe to reason
 * about: we compute the balance and insert the debit in one transaction.
 *
 * NOTE: this module imports Prisma and must only ever be imported from
 * server-side code (API routes, server components). Client components that
 * just need to display a cost (e.g. "Generate — 5 credits") should import
 * CREDIT_COSTS from "@/lib/credit-costs" directly instead of from here.
 */

export async function getCreditBalance(userId: string): Promise<number> {
  const result = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export class InsufficientCreditsError extends Error {
  required: number;
  balance: number;
  constructor(required: number, balance: number) {
    super("Insufficient credits");
    this.required = required;
    this.balance = balance;
  }
}

/**
 * Atomically checks the balance and records a debit. Throws
 * InsufficientCreditsError if the user can't afford it — callers should
 * catch that and surface the "Upgrade" prompt rather than a generic 500.
 */
export async function spendCredits(
  userId: string,
  reason: CreditReason,
  projectId?: string
): Promise<{ balance: number; spent: number }> {
  const cost = CREDIT_COSTS[reason];

  return prisma.$transaction(async (tx) => {
    const result = await tx.creditTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const balance = result._sum.amount ?? 0;

    if (balance < cost) {
      throw new InsufficientCreditsError(cost, balance);
    }

    await tx.creditTransaction.create({
      data: { userId, amount: -cost, reason, projectId },
    });

    return { balance: balance - cost, spent: cost };
  });
}

export async function grantCredits(userId: string, amount: number, reason: string) {
  await prisma.creditTransaction.create({
    data: { userId, amount, reason },
  });
}
