# Stack Patterns: Ovulation Tracker (Next.js + Baserow + Pushover on Vercel)

Research date: 2026-05-19. All recommendations assume Next.js 15+ App Router on Vercel with Fluid Compute enabled.

## 1. Single-User Password Gate

**Recommendation:** Edge middleware + signed, httpOnly session cookie + a single bcrypt'd password stored in an env var (`APP_PASSWORD_HASH`). One `/login` Server Action verifies the password with `bcryptjs`, then issues a JWT-style session cookie signed with `jose` (HS256, secret in `SESSION_SECRET`). `middleware.ts` checks the cookie on every non-`/login` route.

Why: NextAuth Credentials is genuine overkill for one user — no OAuth, no user table, no account recovery. Edge Basic Auth via `WWW-Authenticate` leaks the password on every request and has no logout. The middleware+cookie pattern is ~60 lines, fully serverless, and rotateable by changing the env vars. With Fluid Compute, middleware now runs full Node.js, so `bcryptjs` works in middleware too — but keep verification inside the Server Action and let middleware do only the cheap cookie check (signature + expiry) so cold middleware stays fast.

## 2. Baserow Access from Server

**Recommendation:** Plain `fetch` from Route Handlers / Server Actions with a thin handwritten wrapper and Zod-validated row types. No SDK.

Endpoint shape: `GET/POST/PATCH/DELETE https://api.baserow.io/api/database/rows/table/{table_id}/[{row_id}/]?user_field_names=true`. Auth header: `Authorization: Token ${process.env.BASEROW_TOKEN}`. Always pass `user_field_names=true` so payloads use your column names, not `field_1234`.

Pagination: `size` (max 200, default 100) + `page` (1-indexed); response includes `next`/`previous` URLs and `count`. Filters: `filters={"Status":"Active"}` JSON, or `filter__{field}__{op}=value` per-field. Sort: `order_by=-Date`. Rate limit on baserow.io SaaS is generous for single-user (well under 60 req/min in normal use) — not a real concern here.

The `/watzon/baserow-client` TS SDK exists but adds a dependency for endpoints you'll hit maybe 5 places. Hand-rolled `baserow.ts` with typed helpers (`listRows<T>`, `createRow<T>`, `updateRow<T>`) is leaner. Tag fetches with `next: { revalidate: 0 }` or use `'use cache'` selectively; mutations should `revalidatePath('/')` after.

## 3. Pushover Send

**Endpoint:** `POST https://api.pushover.net/1/messages.json` with `application/x-www-form-urlencoded` or JSON body. Required: `token` (app token), `user` (user key), `message`. Useful optional: `title`, `priority` (-2..2), `sound`, `url`, `url_title`, `ttl`. Returns `{status: 1, request: "..."}` on success.

**Where to call from:** A dedicated `/api/cron/nudge` Route Handler (GET, protected by Vercel's `CRON_SECRET` Bearer header) for scheduled nudges; a Server Action for ad-hoc test sends from the UI. Don't bother with a queue — it's one POST.

## 4. Scheduled Jobs on Vercel

**Recommendation:** Use the new `vercel.ts` config (the 2025+ replacement for `vercel.json`) with one cron entry hitting `/api/cron/nudge`. Schedule: `0 13 * * *` = 8am Central daily (adjust offset for her timezone; cron runs in UTC).

```ts
crons: [{ path: '/api/cron/nudge', schedule: '0 13 * * *' }]
```

**Plan limits (2026):** All plans allow up to 100 cron jobs per project. **Hobby is capped at once-per-day with ±59 min jitter** — fine for an 8am nudge. Pro is required for per-minute precision or multiple runs/day. The handler should verify `Authorization: Bearer ${process.env.CRON_SECRET}` (Vercel injects this automatically for cron invocations).

## 5. shadcn/ui Components

**Must-haves for a phone-first cycle tracker:**
- `Calendar` (period/symptom logging — the centerpiece)
- `Drawer` (mobile bottom-sheet for the daily-log form — better mobile ergonomics than `Sheet`)
- `Sheet` (settings/secondary nav)
- `Card` + `Badge` (cycle-day card, fertile-window badges)
- `Form` + `react-hook-form` + Zod (daily log)
- `Button`, `Input`, `Select`, `Toggle`/`Switch` (BBT, symptoms)
- `Chart` (shadcn-charts, see §7)
- `Toast` (Sonner — confirm "logged" / "nudge sent")
- `Dialog` (confirm delete, PDF download)

Skip `NavigationMenu`/`Menubar` — single user, single device-class.

## 6. PDF Generation

**Recommendation:** `@react-pdf/renderer` v4+ in a Route Handler (`/api/report/pdf`), streamed back as `application/pdf`.

Why: Puppeteer/Playwright on Vercel requires `@sparticuz/chromium`, eats ~150MB of the function bundle, and cold-starts in 3-5s — overkill for one report a month. `pdfkit` is imperative and ugly. `@react-pdf/renderer` lets you compose the report as JSX with its own `<Document>/<Page>/<Text>/<View>` primitives, runs in a normal Node Lambda (no Chromium), and renders in well under 5s for a few-page report. Vercel functions now support 300s execution and Fluid Compute keeps the renderer warm between calls — but you won't need either limit.

Tradeoff: `@react-pdf/renderer` has its own layout engine (Yoga/flexbox), so you can't reuse your shadcn/Tailwind components — you write a parallel PDF component tree. Acceptable cost for one report.

## 7. Charting

**Recommendation:** `shadcn/ui Charts` (which wraps Recharts) for line/bar/area; drop to raw Recharts for the calendar heatmap, or render the heatmap as a CSS grid of colored Tailwind divs (simplest, zero deps).

Why not visx: low-level, beautiful, but you'll spend a weekend on axes and tooltips. Why not Tremor: dashboard-focused, opinionated styling that fights shadcn. shadcn-charts gives you theme-aware colors via CSS vars, proper tooltips, and a `<ChartContainer>` that handles responsive sizing on mobile out of the box.

Three views to build: cycle-length-over-time (`LineChart`), fertile-window-history (`BarChart` with reference areas), calendar heatmap (CSS grid — recharts has no native heatmap and adding `@nivo/calendar` for one view isn't worth ~80KB gzipped).
