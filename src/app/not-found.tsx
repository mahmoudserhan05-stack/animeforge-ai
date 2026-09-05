import Link from "next/link";
import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-grid-glow px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Ghost className="size-8" />
      </div>
      <h1 className="font-display text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="max-w-sm text-muted">
        الرابط الذي فتحته غير موجود، أو ربما تم حذف هذا المشروع.
      </p>
      <Link href="/dashboard">
        <Button>العودة إلى لوحة التحكم</Button>
      </Link>
    </div>
  );
}
