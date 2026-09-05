import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { jsonError, handleRouteError } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { SIGNUP_BONUS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`register:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
    if (!rl.success) {
      return jsonError("محاولات كثيرة جدًا، حاول لاحقًا", 429);
    }

    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة", 422);
    }

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("هذا البريد الإلكتروني مسجّل بالفعل", 409);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
      },
    });

    await prisma.creditTransaction.create({
      data: { userId: user.id, amount: SIGNUP_BONUS, reason: "signup_bonus" },
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
