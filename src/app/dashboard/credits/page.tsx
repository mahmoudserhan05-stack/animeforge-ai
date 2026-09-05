"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCredits, cn } from "@/lib/utils";

type Transaction = {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
};

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "رصيد ترحيبي عند التسجيل",
  script_generation: "توليد السيناريو",
  scene_breakdown: "تقسيم المشاهد",
  image_generation: "توليد صورة مشهد",
  voice_generation: "توليد التعليق الصوتي",
  video_generation: "توليد الفيديو النهائي",
};

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((data) => {
        setBalance(data.balance);
        setTransactions(data.transactions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">الرصيد</h1>
        <p className="mt-1 text-sm text-muted">تابع رصيدك وسجل كل عملية استهلاك.</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/15 to-accent-cyan/10">
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <Coins className="size-7" />
            </div>
            <div>
              <p className="text-sm text-muted">الرصيد المتبقي</p>
              {loading ? (
                <Skeleton className="mt-1 h-8 w-24" />
              ) : (
                <p className="font-display text-3xl font-bold">{formatCredits(balance ?? 0)}</p>
              )}
            </div>
          </div>
          <Link href="/#pricing">
            <Button icon={<Sparkles className="size-4" />}>ترقية الرصيد</Button>
          </Link>
        </CardContent>
      </Card>

      {!loading && (balance ?? 0) <= 10 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          رصيدك منخفض. قد لا تتمكن من إكمال عمليات الذكاء الاصطناعي القادمة — فكّر بالترقية.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>سجل العمليات</CardTitle>
          <CardDescription>آخر 50 عملية على حسابك.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={<Coins className="size-6" />} title="لا توجد عمليات بعد" />
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-sm transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-lg",
                        t.amount >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}
                    >
                      {t.amount >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    </span>
                    <div>
                      <p className="font-medium">{REASON_LABELS[t.reason] || t.reason}</p>
                      <p className="text-xs text-muted">{new Date(t.createdAt).toLocaleString("ar")}</p>
                    </div>
                  </div>
                  <span className={cn("font-display font-semibold", t.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {t.amount >= 0 ? "+" : ""}
                    {t.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
