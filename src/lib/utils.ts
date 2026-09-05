import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, resolving conflicts (last one wins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a credit count for display, e.g. 1200 -> "1,200". */
export function formatCredits(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Small helper to await a fixed delay — used by the mock AI provider to
 * simulate realistic generation latency without external calls. */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deterministic-ish pseudo-random pick, seeded by a string, so demo content
 * stays stable-ish across a given project/scene without needing real state. */
export function pickFromSeed<T>(seed: string, items: T[]): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % items.length;
  return items[idx];
}

export function slugifyTitle(idea: string) {
  return idea
    .trim()
    .slice(0, 60)
    .replace(/\s+/g, " ");
}
