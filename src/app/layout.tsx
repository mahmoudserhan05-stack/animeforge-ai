import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "AnimeForge AI — Turn Your Ideas Into Anime Videos",
  description:
    "Write a one-line idea and AnimeForge AI turns it into a short, original-style anime video — script, scenes, images, voice and music — ready for TikTok, YouTube Shorts and Instagram Reels.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${display.variable} dark`}>
      <body className="min-h-screen antialiased selection:bg-primary/30">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
