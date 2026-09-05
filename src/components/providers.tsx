"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "hsl(250 24% 10%)",
            color: "white",
            border: "1px solid hsl(250 18% 20%)",
          },
        }}
      />
    </SessionProvider>
  );
}
