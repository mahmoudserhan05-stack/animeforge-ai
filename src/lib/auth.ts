import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const SIGNUP_BONUS = Number(process.env.SIGNUP_BONUS_CREDITS ?? 100);

/**
 * NextAuth configuration.
 *
 * We use the Credentials provider with a JWT session strategy (no database
 * adapter needed) — the User table is ours, managed directly through Prisma
 * in /api/auth/register and here. Swapping in an OAuth provider later (e.g.
 * Google) is additive: add it to `providers` below, nothing else changes.
 */
export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("البريد الإلكتروني وكلمة المرور مطلوبان");
        }

        // Basic brute-force throttling keyed by email (best-effort; see
        // src/lib/rate-limit.ts for the single-instance caveat).
        const rl = rateLimit(
          `auth:${credentials.email.toLowerCase()}`,
          RATE_LIMITS.auth.limit,
          RATE_LIMITS.auth.windowMs
        );
        if (!rl.success) {
          throw new Error("محاولات كثيرة جدًا، حاول لاحقًا");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export { SIGNUP_BONUS };
