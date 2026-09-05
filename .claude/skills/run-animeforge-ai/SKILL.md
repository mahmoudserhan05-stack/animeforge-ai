---
name: run-animeforge-ai
description: Build, run, and drive AnimeForge AI (Next.js 14 app). Use when asked to start AnimeForge, run its dev server, sign in, take a screenshot of the dashboard or wizard, generate a script/scenes, run its lint, or otherwise interact with the running app.
---

AnimeForge AI is a Next.js 14 (App Router) web app — SQLite via Prisma, NextAuth
credentials auth, an RTL/Arabic UI, and a swappable AI layer that runs a built-in
**mock provider** when no API keys are set (so the whole wizard works offline).

Drive it by starting `next dev` and pointing the bundled driver at it:
**`.claude/skills/run-animeforge-ai/driver.mjs`** — a zero-dependency headless-Chrome
harness (CDP over Node's global `WebSocket`). It launches the Chrome already
installed on this machine, runs a script of `nav` / `click` / `fill` / `screenshot`
commands, and cleans up after itself.

All paths below are relative to the `animeforge-ai/` project directory. Commands
were verified with the **Bash tool (git-bash)** on Windows 10, Node v24.19.

## Prerequisites

- **Node 22.4+** (the driver uses the unflagged global `WebSocket`; v24 tested).
- **Google Chrome** — auto-detected at `C:/Program Files/Google/Chrome/Application/chrome.exe`
  or `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Override with
  `CHROME_PATH=/path/to/chrome.exe`.
- No `apt-get` — this is a Windows host, not a Linux container. No Playwright, no
  `chromium-cli`; the driver is self-contained.

## Setup

Install deps and create/seed the local SQLite DB. **Do this with the dev server
stopped** — a running `next dev` locks `query_engine-windows.dll.node` and
`prisma generate` fails with `EPERM ... rename`.

```bash
npm install
npm run db:push     # prisma generate + push schema to prisma/dev.db
npm run db:seed     # seeds demo@animeforge.ai / demo1234  (starts with credits)
```

`.env` already exists (SQLite URL, a real `NEXTAUTH_SECRET`, all AI keys blank =
mock mode). Nothing to configure for a local run.

Note: this repo's npm (v11) gates install scripts, so `npm install` does **not**
run the `postinstall` prisma generate — `npm run db:push` above is what generates
the client. If `@prisma/client` ever errors about not being generated, re-run it.

## Build

None for the agent path — `next dev` compiles on demand. (`npm run build` +
`npm start` is the production path; not needed to drive the app.)

## Run (agent path)

**1. Start the dev server** in the background (Bash tool `run_in_background: true`,
or `npm run dev &`), then wait for the port — don't `sleep`:

```bash
npm run dev            # -> http://localhost:3000
timeout 90 bash -c 'until curl -sf http://localhost:3000 >/dev/null 2>&1; do sleep 1; done'
```

First server compile takes ~15–25s; then each route compiles on first hit —
`/dashboard` can take 20–30s cold. The driver's `wait` / `wait-text` default to a
40s timeout to absorb this; on a very slow machine raise `WAIT_MS`. Running the
smoke a second time is fast (routes stay compiled).

**2. Run the end-to-end smoke** — signs in as the demo user, creates a project,
walks the wizard to the Options step, and generates a script with the mock AI
provider:

```bash
node .claude/skills/run-animeforge-ai/driver.mjs .claude/skills/run-animeforge-ai/smoke.txt
```

Expected tail: `saw text: عدّل السيناريو` … `OK: no console errors`, exit 0.
Screenshots land in `.claude/skills/run-animeforge-ai/shots/`
(`01-dashboard.png`, `02-options.png`, `03-script.png`). Override the location
with `SHOTS_DIR=/abs/path`.

**3. One-off interactions** — pass commands inline with `-e`, or pipe a script on
stdin. Each run starts a **fresh Chrome tab**; only cookies persist between runs,
so every script must start from its own `nav` (the smoke re-signs-in each time).

```bash
node .claude/skills/run-animeforge-ai/driver.mjs \
  -e "nav /sign-in" \
  -e "wait #email" \
  -e "fill #email demo@animeforge.ai" \
  -e "fill #password demo1234" \
  -e 'click button[type="submit"]' \
  -e "wait-text أحدث المشاريع" \
  -e "screenshot dash.png"
```

### Driver commands

| command | what it does |
|---|---|
| `nav <url\|/path>` | navigate (bare path → `BASE_URL` + path); waits for load |
| `wait <css>` | poll until selector exists (`WAIT_MS`, default 40s) |
| `wait-text <substring>` | poll until `document.body.innerText` contains substring |
| `click <css>` | click first match (`element.click()`) |
| `click-text <substring>` | click first `button`/`a`/`[role]` whose text contains substring — the way to hit Arabic-labelled buttons |
| `fill <css> <value>` | set an input/textarea value React-safely (native setter + `input`/`change` events) |
| `press <css> <key>` | focus selector, dispatch a key (e.g. `Enter`, `Tab`) |
| `text <css>` / `attr <css> <name>` / `count <css>` | read innerText / attribute / match count |
| `eval <expr>` | evaluate JS in the page, print JSON result |
| `url` | print `location.href` |
| `screenshot [name]` | full-page PNG → `SHOTS_DIR` (default `shots/shot-<n>.png`) |
| `sleep <ms>` | wait |
| `console` | dump collected console output + page exceptions |
| `assert-no-errors` | exit 1 if any real console error / exception was seen (a missing-favicon 404 is ignored as noise) |

### Driver env vars

| var | default | purpose |
|---|---|---|
| `CHROME_PATH` | auto-detect | Chrome/Edge executable |
| `CDP_PORT` | `9222` | DevTools port. If it's already live the driver **reuses** that Chrome and leaves it running; otherwise it launches its own and kills it on exit |
| `KEEP=1` | off | never kill Chrome on exit (faster iteration; reuse the same instance) |
| `SHOTS_DIR` | `<skill>/shots` | screenshot output dir |
| `BASE_URL` | `http://localhost:3000` | target for bare `nav` paths |
| `WINDOW_SIZE` | `1440,1900` | emulated viewport |
| `WAIT_MS` | `40000` | `wait` / `wait-text` timeout (raise for a very cold server) |
| `HEADFUL=1` | off | show the browser window |

### Stopping things

```bash
# dev server (frees :3000 so the next run doesn't hit EADDRINUSE)
netstat -ano | grep ':3000' | grep LISTENING | awk '{print $5}' | sort -u \
  | while read pid; do taskkill //F //PID "$pid"; done

# a stray driver Chrome left by KEEP=1 / reuse (kill only the debug-port owner)
netstat -ano | grep ':9222' | grep LISTENING | awk '{print $5}' | sort -u \
  | while read pid; do taskkill //F //PID "$pid"; done
```

Do **not** `taskkill //IM chrome.exe` — that also kills the user's normal browser.

## Run (human path)

```bash
npm run dev     # open http://localhost:3000, sign in with demo@animeforge.ai / demo1234, Ctrl-C to stop
```

## Test

No unit test suite. Lint is the sanity check:

```bash
npm run lint    # -> "✔ No ESLint warnings or errors"
```

## Gotchas

- **`prisma generate` fails while `next dev` runs** — `EPERM: operation not
  permitted, rename '…query_engine-windows.dll.node'`. The running server holds
  the DLL open. Stop the dev server before `npm install` / `npm run db:push`.
- **The wizard has *two* idea steps.** `/dashboard/projects/new` is a standalone
  idea box whose button is **"متابعة إلى خيارات الفيديو"**; it POSTs `/api/projects`
  and redirects into `/dashboard/projects/[id]`, whose wizard **also** opens on an
  idea step ("فكرة الفيديو") with a different button, **"متابعة إلى الخيارات"**.
  You must click through both to reach Options.
- **Don't key `wait-text` off short strings.** "خيارات الفيديو" appears in the
  wizard idea-step description *and* as the Options step title — waiting on it
  stops you one step early. The smoke waits on **"أسلوب الأنمي"** (Options) and
  **"عدّل السيناريو"** (Script) instead, which are unique.
- **`sleep` after a click is not enough** for wizard transitions — project
  create + first AI call takes 3s+ and compiles an API route on first hit. Always
  `wait-text` a marker on the next screen.
- **Each driver invocation = a new tab.** Page state does not carry across
  separate `node driver.mjs` runs (cookies do). Put a whole flow in one script,
  or use `KEEP=1` and still re-`nav` each run.
- **`/favicon.ico` 404s on every page** — this app ships no favicon. The driver
  filters it out of `assert-no-errors`; ignore it.
- **The dashboard sidebar looks "missing" in screenshots** — it renders, but its
  `bg-surface/60` is nearly the page background; only the gradient CTA button is
  visible. Not a bug. Navigate by URL (`nav /dashboard/credits` etc.) rather than
  clicking sidebar links.
- **RSC streaming** — after sign-in the dashboard shows skeletons briefly.
  `wait-text أحدث المشاريع` (a server-rendered heading) means it's settled.

## Troubleshooting

- **`Chrome not found. Set CHROME_PATH=…`** — no Chrome/Edge at the known paths.
  Pass `CHROME_PATH=/c/Program Files/Google/Chrome/Application/chrome.exe`.
- **`timeout waiting for text …` on the first run** — a cold `/dashboard` (or
  other route) compile ran past `WAIT_MS`. Re-run (routes stay compiled), or
  `WAIT_MS=90000 node .claude/skills/run-animeforge-ai/driver.mjs …`.
- **`CDP timeout: Page.navigate` / driver hangs on first `nav`** — dev server
  still compiling that route. Re-run; the route is cached after the first hit.
- **`click-text: nothing clickable containing "…"`** — you're on the wrong step
  (see the two-idea-steps gotcha) or the button hasn't rendered. Add a
  `wait-text` for the current screen's unique marker first, or
  `eval [...document.querySelectorAll('button')].map(b=>b.innerText)` to see
  what's actually there.
- **`EADDRINUSE :3000`** — a previous `next dev` is still listening. Kill it with
  the port command under *Stopping things*.
- **`assert-no-errors` fails with a real message** — dump full context with the
  `console` command; a rendered shell over failing data fetches still "loads".
- **Reused Chrome shows a stale page / wrong login** — a `KEEP=1` Chrome kept old
  cookies. Kill the `:9222` owner (see *Stopping things*) and let the driver
  launch a fresh one.
