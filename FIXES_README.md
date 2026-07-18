# What was fixed, and what you need to do to deploy it

## 1. Google OAuth: implicit flow → Authorization Code + PKCE + refresh token

**Root cause of the Google Fit / Gmail / Drive / Calendar "stops working" issue:**
the old flow (`response_type=token`) never issued a refresh token, so every
connection quietly died after ~1 hour and you had to manually reconnect.

**Also fixed:** the `state` value was generated and stored but never checked
against what Google sent back — a real CSRF gap.

**What changed:**
- `src/lib/integrations.ts` — `connectGoogle()` now does Authorization Code +
  PKCE, requests `access_type=offline&prompt=consent` (so Google actually
  issues a refresh token), and verifies `state` on return.
- Because Google's token endpoint requires a `client_secret` even with PKCE
  (unlike Spotify), the code↔token exchange happens through a new Supabase
  Edge Function: `supabase/functions/google-oauth`. The secret never reaches
  the browser.
- `refreshAllIntegrations()` and a new 30s interval in `App.tsx` now silently
  refresh the Google token before it expires, the same way Spotify already did.
- `src/main.tsx` — removed the now-dead implicit-flow hash parsing.

**You need to do, before this works:**
1. In Google Cloud Console → your OAuth Client → copy the **Client Secret**
   (you already have the Client ID).
2. `supabase functions deploy google-oauth`
3. `supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...`
4. Nothing else changes on the Google Cloud Console side — same redirect URI,
   same client ID.

## 2. Google Fit not syncing

This was a symptom of #1 (same expiring token). It should now stay connected
and auto-refresh. If it still fails after redeploying, reconnect Google once
in Settings → Integrations so a fresh refresh token (with the fitness scopes)
gets issued.

## 3. Notifications not arriving after mobile install

**Root cause:** the app never implemented real Web Push. It only had
`Notification.requestPermission()` + the **Periodic Background Sync API**.
That API doesn't exist on iOS Safari at all, and on Android Chrome it only
fires occasionally and only under specific engagement conditions — it isn't
reliable for "notify me even when the app is closed."

**What changed — real Web Push added:**
- `supabase/migrations/20260719_push_notifications.sql` — new
  `push_subscriptions` and `scheduled_notifications` tables (RLS-protected,
  one row per device / per pending reminder).
- `src/lib/push.ts` — subscribes the browser to Web Push and stores the
  subscription in Supabase.
- `src/lib/notifications.ts` — `syncScheduleToSW()` now also mirrors the
  schedule into `scheduled_notifications`, so delivery no longer depends on
  the SW/tab staying alive.
- `supabase/functions/send-due-notifications` — a new Edge Function that
  actually sends the push (using VAPID) for anything due, meant to be
  triggered every minute by `pg_cron`.
- `App.tsx` calls `subscribeToPush()` once notification permission is granted.
- The old local SW-timer / periodic-sync path is left in place as a
  best-effort fallback while the app is open — it's harmless, just no longer
  the only path.

**You need to do, before this works:**
1. Generate a VAPID key pair: `npx web-push generate-vapid-keys`
2. Add the **public** key to your env as `VITE_VAPID_PUBLIC_KEY` (Netlify env
   vars + local `.env`).
3. `supabase functions deploy send-due-notifications --no-verify-jwt`
4. `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=some-random-string`
5. Run the migration (`supabase/migrations/20260719_push_notifications.sql`)
   in the SQL Editor — **before running it**, edit the `cron.schedule(...)`
   block at the bottom: replace `YOUR-PROJECT` with your project ref and the
   secret placeholder with the same value you set as `CRON_SECRET`.
6. Redeploy the frontend (Netlify) with the new env var set.
7. On your phone: open the installed app, grant notification permission again
   (this triggers the new subscription flow) — you only need to do this once.

## 4. Other things worth knowing (not changed, flagged for awareness)

- **Tokens live in localStorage/sessionStorage.** Fine for a personal tool,
  but any dependency-introduced XSS could read them. If this ever has other
  users, the Google/Spotify API calls should move behind a backend too.
- **`window.open()` popups can be blocked or behave oddly inside an
  installed, standalone PWA on iOS.** If "Connect Google/Spotify" ever
  silently does nothing on an installed iPhone app (works fine in Safari
  tab), that's likely why — a known iOS PWA limitation, not a bug in this
  code.
