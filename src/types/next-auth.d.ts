import type { DefaultSession } from "next-auth";

// Augments NextAuth's Session/JWT types with the user id we attach in the
// jwt/session callbacks (src/lib/auth.ts). After this, `session.user.id` is
// properly typed everywhere instead of needing a manual cast.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
