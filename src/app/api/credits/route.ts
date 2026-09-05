import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { jsonError, handleRouteError } from "@/lib/api-utils";
import { getCreditBalance } from "@/lib/credits";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const [balance, transactions] = await Promise.all([
      getCreditBalance(userId),
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      balance,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
