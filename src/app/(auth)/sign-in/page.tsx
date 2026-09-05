"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        // NextAuth's Credentials provider intentionally collapses whatever
        // authorize() throws (wrong password, rate-limited, ...) into a
        // generic "CredentialsSignin" code on the client, by design (it
        // avoids leaking which part of the login was wrong). So we show one
        // clear message here instead of surfacing res.error verbatim.
        toast.error("البريد الإلكتروني أو كلمة المرور غير صحيحة، أو تجاوزت عدد المحاولات المسموح");
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح");
      router.push(searchParams.get("callbackUrl") || "/dashboard");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تسجيل الدخول</CardTitle>
        <CardDescription>أهلًا بعودتك — أكمل مشاريعك من حيث توقفت.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading} icon={<LogIn className="size-4" />}>
            تسجيل الدخول
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          ليس لديك حساب؟{" "}
          <Link href="/sign-up" className="font-medium text-primary hover:underline">
            أنشئ حسابًا جديدًا
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
