// Pure constants — no server-only imports (no Prisma) — so this file is safe
// to import from BOTH client components (to display "costs N credits" on a
// button) and server code (src/lib/credits.ts re-exports it for the actual
// ledger logic). Keeping the numbers in one place avoids the UI and the
// server ever disagreeing about what something costs.

export const CREDIT_COSTS = {
  script_generation: 5,
  scene_breakdown: 3,
  image_generation: 4, // per scene image
  voice_generation: 6, // per project (all scene lines)
  video_generation: 15,
} as const;

export type CreditReason = keyof typeof CREDIT_COSTS;
