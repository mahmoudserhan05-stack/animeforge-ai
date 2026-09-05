import { withAuth } from "next-auth/middleware";

// Protects everything under /dashboard: unauthenticated visitors are
// redirected to /sign-in. API routes enforce auth independently (see
// src/lib/session.ts) since middleware only guards page navigation.
export default withAuth({
  pages: {
    signIn: "/sign-in",
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
