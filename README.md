# AnimeForge AI

**Live demo:** https://animeforge-ai-red.vercel.app · demo login `demo@animeforge.ai` / `demo1234`

**Turn a one-line idea into a short, original-style anime video.** Script → Scenes → Images → Voice → Music → Final video, ready for TikTok, YouTube Shorts and Instagram Reels.

This is a full, working product scaffold — not a static mockup. Every screen is wired to a real Next.js backend, a real database, and a real (swappable) AI abstraction layer. It runs completely **offline in Demo Mode** with zero API keys, so you can try the entire flow today, then flip in real AI provider keys later without touching any UI code.

---

## 1. Tech stack — and why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (App Router) + TypeScript** | Server components for data-heavy pages (dashboard, projects list) + client components for the interactive wizard, one deploy target, first-class API routes. |
| Styling | **Tailwind CSS** | Fast to build a consistent dark/neon design system; utility classes keep the anime-futuristic look (gradients, glassmorphism, glow) maintainable. |
| Database | **SQLite via Prisma (dev) → Postgres (prod)** | Zero setup locally (`file:./dev.db`, no server to install). Prisma makes the swap to Postgres/MySQL a one-line `provider` change in `prisma/schema.prisma` — the rest of the app is untouched. |
| Auth | **NextAuth.js (Credentials provider, JWT sessions)** | Full email/password auth with no third-party account needed to try the app. Adding Google/GitHub OAuth later is additive (one more entry in `providers: []`). |
| AI layer | **Custom `AIService` interface + provider factory** | See §4 — the whole point is that no vendor is hardcoded into the app. |
| Credits | **Append-only ledger (`CreditTransaction`)** | Balance = sum of transactions, never a mutable counter, so spend is always auditable and race-safe. |

---

## 2. Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Generate a real secret for NEXTAUTH_SECRET:
openssl rand -base64 32

# 3. Create the local database
npm run db:push

# 4. (optional) Seed a ready-to-use demo account
npm run db:seed
# → demo@animeforge.ai / demo1234  (200 free credits)

# 5. Run it
npm run dev
```

Open http://localhost:3000 — sign up (or use the seeded demo account) and click **"Create Anime Video"**. Every AI step (script, scenes, images, voice, video) works instantly using the built-in **Mock AI Provider** — no external accounts, no cost, no waiting on real inference.

---

## 3. Project structure

```
prisma/
  schema.prisma          # User, Project, Scene, GeneratedAsset, Video, CreditTransaction
  seed.ts                 # creates a demo account with free credits

src/
  app/
    page.tsx              # Landing page
    (auth)/sign-in, sign-up
    dashboard/
      layout.tsx           # Sidebar + TopBar shell (server component, reads session)
      page.tsx             # Overview (stats + recent projects)
      projects/            # List, "new project" (Step 1), and the wizard host [id]
      templates/           # Ready-made idea presets
      credits/             # Balance + transaction history
      settings/
    api/
      auth/[...nextauth], auth/register
      projects/…           # CRUD + one route per wizard AI step
      credits/, dashboard/stats/

  components/
    landing/               # Navbar, Hero, HowItWorks, Features, Pricing, Footer
    dashboard/             # Sidebar, MobileNav, TopBar, StatCard, ProjectCard, CreditsProvider
    wizard/                # WizardShell + one component per step (StepIdea … StepPreview)
    ui/                     # Button, Card, Input, Select, Badge, Skeleton, EmptyState…

  lib/
    ai/                     # ← the AI abstraction layer, see §4
    prisma.ts, auth.ts, session.ts, credits.ts, credit-costs.ts
    rate-limit.ts, validations.ts, api-utils.ts, utils.ts

  types/index.ts            # DTOs shared between API routes and the frontend

public/demo/                # Placeholder scene images, demo video and voice clip
                             # used by the Mock AI provider (all generated locally,
                             # 100% original — no copyrighted characters or art)
```

---

## 4. The AI abstraction layer (`src/lib/ai`)

Every AI-backed feature goes through one interface:

```ts
interface AIService {
  generateScript(input): Promise<{ script; suggestedTitle }>;
  generateScenePrompts(input): Promise<{ scenes: SceneDraft[] }>;
  generateImage(input): Promise<{ url; provider }>;
  generateVoice(input): Promise<{ url; provider; durationSeconds }>;
  generateVideo(input): Promise<{ url; thumbnailUrl; provider; durationSeconds }>;
}
```

- `src/lib/ai/providers/mock-provider.ts` — fully offline implementation used automatically when no real key is configured. This is what makes the whole product testable today.
- `src/lib/ai/providers/openai-provider.ts` — production shape: `generateScript`/`generateScenePrompts` already call a real OpenAI-compatible chat-completions endpoint; `generateImage`/`generateVoice`/`generateVideo` are clearly marked integration points (each throws a descriptive error telling you exactly which env vars and fetch call to fill in for your chosen vendor — Stability/Runway/ElevenLabs/etc.).
- `src/lib/ai/index.ts` — the **only** place that decides which provider is active (`getAIService()`), based purely on whether `OPENAI_API_KEY` is set. Every API route calls this factory; none of them import a provider class directly.

**API keys are never sent to the browser.** Every provider file lives under `src/lib/ai/**` and is only ever imported from server-side code (`src/app/api/**/route.ts`). `.env` values are read with `process.env.*` inside those server files only.

To add a new provider (e.g. swap OpenAI for Anthropic, or wire a real image API): write one new class implementing `AIService`, point `getAIService()` at it — zero changes anywhere else in the app.

---

## 5. Credits system

- Every AI operation has a fixed cost (`src/lib/credit-costs.ts`): script (5), scene breakdown (3), image per scene (4), voice-over (6), final video (15).
- Balance is the sum of a `CreditTransaction` ledger — never a mutable counter — so every debit is atomic and auditable (`src/lib/credits.ts`, `spendCredits()` runs inside a DB transaction and throws `InsufficientCreditsError` if the balance is too low).
- The UI shows "Credits remaining" in the top bar at all times and blocks the relevant action with a clear message + "Upgrade" link when the balance is insufficient.
- **No real payment is wired up in this version** (per spec) — but the structure is ready: the pricing page/plans already exist, `User.plan` and `CreditTransaction.reason` are in place, so adding Stripe later means: create a checkout session, and on the webhook call `grantCredits(userId, amount, "stripe_purchase")`. That's it.

---

## 6. Adding real AI providers

1. Fill in the relevant keys in `.env`:
   ```
   OPENAI_API_KEY=sk-...          # powers script + scene breakdown
   IMAGE_API_BASE_URL=...         # your image provider
   IMAGE_API_KEY=...
   VOICE_API_BASE_URL=...         # your TTS provider
   VOICE_API_KEY=...
   VIDEO_API_BASE_URL=...         # your video-assembly provider
   VIDEO_API_KEY=...
   ```
2. For image/voice/video, open `src/lib/ai/providers/openai-provider.ts` and fill in the `fetch()` call in the marked `TODO` inside each method — the input/output contract (`GenerateImageInput` → `GenerateImageResult`, etc., in `src/lib/ai/types.ts`) is already correct, so nothing else needs to change.
3. Restart the app. `getAIService()` will now return the real provider automatically once `OPENAI_API_KEY` is set (the demo/mock stays the fallback for anyone without keys configured).

---

## 7. Security notes

- **Auth**: NextAuth Credentials provider, bcrypt-hashed passwords (12 rounds), JWT sessions.
- **Authorization**: every project-scoped API route loads the project through `getOwnedProjectOrThrow(projectId, userId)` (`src/lib/session.ts`) — a user can never read or mutate another user's project; a mismatched owner returns 404, not 403, so project existence isn't leaked either.
- **Validation**: every route parses its input through a `zod` schema (`src/lib/validations.ts`) before touching the database.
- **Rate limiting**: a lightweight in-memory limiter (`src/lib/rate-limit.ts`) throttles auth attempts and AI-generation calls per user/IP. This is fine for a single instance / local use; the moment you scale past one process, swap it for `@upstash/ratelimit` (Redis-backed) — the call sites don't need to change.
- **Route protection**: `src/middleware.ts` redirects unauthenticated visitors away from `/dashboard/**`; API routes independently check the session too (defense in depth).
- **Secrets**: all AI provider keys are read server-side only (see §4) — nothing is ever bundled into client JavaScript.
- **File validation**: this version has no user-uploaded files (every asset is AI-generated or a bundled placeholder), so there's no upload surface to validate yet. When you wire a real image/voice provider that lets users upload a reference image, an avatar, etc., validate it server-side before storing: check `Content-Type`/magic bytes (not just the extension), enforce a size limit, and re-encode images (e.g. with `sharp`) rather than trusting the uploaded bytes as-is.

---

## 8. Deploying to Postgres

1. In `prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npm run db:migrate` to create real migrations (instead of `db:push`, which is fine for the SQLite dev loop but you'll want tracked migrations in production).

---

## 9. What's intentionally not real yet

- **Payments** — structure is ready (see §5), Stripe itself isn't wired up.
- **Real AI calls for image/voice/video** — the integration points are clearly marked (see §6); text generation (script/scenes) already has a working OpenAI-compatible implementation.
- **Demo assets** — the placeholder scene images, the demo video and the voice-over clip in `public/demo/` are all generated locally (gradients + text via ffmpeg) — 100% original, no copyrighted characters, art, or footage.
