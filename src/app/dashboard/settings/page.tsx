import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted">معلومات حسابك وتفضيلاتك.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الملف الشخصي</CardTitle>
          <CardDescription>هذه المعلومات خاصة بك ولا تظهر لأحد.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>الاسم</Label>
            <Input defaultValue={user?.name ?? ""} disabled />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input defaultValue={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label>الخطة الحالية</Label>
            <div>
              <Badge tone="info">{user?.plan ?? "FREE"}</Badge>
            </div>
          </div>
          <p className="text-xs text-muted">
            تعديل هذه الحقول غير مفعّل في هذه النسخة التجريبية — البنية جاهزة لإضافته لاحقًا.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تفضيلات الإنشاء الافتراضية</CardTitle>
          <CardDescription>تُستخدم كقيم مبدئية عند بدء مشروع جديد.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>اللغة المفضلة</Label>
            <Input defaultValue="العربية" disabled />
          </div>
          <div>
            <Label>أسلوب الأنمي المفضل</Label>
            <Input defaultValue="Shonen Action" disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
