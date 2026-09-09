# OpenFi Controller — Progress Log

Tracking DoD verification per `CLAUDE.md`. Updated continuously.

## Project shape
Next.js 14 (App Router) + TypeScript + Tailwind. Server talks to one or more OpenWrt
routers exclusively via the `uhttpd-mod-ubus` JSON-RPC API (`lib/openwrt.ts`). No test
suite exists yet. No CI config exists yet. Router credentials are stored server-side in
`.openfi/routers.json` (mode 0600), never returned to the browser (`publicRouter`).

Per `README.md`, a large slice of OpenWrt subsystems (switch/VLAN, interface CRUD,
firewall zones, routing/ARP views, backup/restore, firmware updates, etc.) are
intentionally stubbed with a "Not implemented yet" UI card rather than mocked data.
This is a deliberate product boundary, not a bug — treating "implement literally every
possible OpenWrt feature" as in-scope for this pass would be scope creep beyond what's
being asked; the DoD is being applied to what exists today plus fixing real defects.

## 2026-09-09 — Session 1

### Baseline checks (before any changes)
- `npm install` — OK, but flagged 2 vulns (1 high, 1 critical) in `next`/`postcss` — see Security below.
- `npx tsc --noEmit` — clean, zero errors.
- `npm run build` — clean, zero errors, all 20 routes build.
- `npm run lint` — **no ESLint config existed** (`next lint` prompted interactively, which
  can't run non-interactively). Added `.eslintrc.json` (`next/core-web-vitals`) and pinned
  `eslint@^8.57.0` + `eslint-config-next@^14.2.24` to match the installed Next 14.2 (avoids
  pulling ESLint 9 / eslint-config-next 16, which target Next 15+ flat config and would
  have been a silent version mismatch).
- After adding lint config: 8 `react-hooks/exhaustive-deps` warnings across
  `app/radios/page.tsx`, `app/settings/networks/page.tsx`, `app/settings/routing/page.tsx`,
  `app/settings/security/page.tsx`, `components/system-settings.tsx` (×3).
  **Fixed:** wrapped each `refresh` closure in `useCallback` (deps matching what it
  actually captures, e.g. `deviceId`) and depend on `refresh` itself in the `useEffect`,
  instead of depending on the primitive and omitting the function. This is the correct
  fix, not a suppression — it keeps the "refetch when the id changes, don't loop forever"
  behavior while satisfying the rule honestly.
  → `npm run lint` now reports zero warnings/errors. Re-verified `tsc --noEmit` and
  `npm run build` still clean after the edits.

### Security review (in progress)
Reviewed every route that shells out to the router (`file.exec` via `lib/openwrt.ts`):
diagnostics (ping/traceroute/nslookup), opkg (install/remove/find), process kill, dropbear
config. All user-supplied values that reach `exec` are allowlist-regex validated before
use, and `exec` always passes arguments as an argv array to ubus's `file.exec`, never
through a shell — so there's no shell-injection surface here. This was already done
correctly in the existing code.

Open items:
- `npm audit`: 1 critical + 1 high advisory, both in `next`/`postcss`, fixed only by a
  major-version bump to Next 16 (breaking change for App Router config in this repo).
  Deferred — needs a deliberate upgrade pass + regression check, not a drive-by
  `--force`. Logged as a follow-up, not silently applied.
- No security headers configured in `next.config.mjs` (no `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, CSP). Adding now.
- **No authentication on the controller app itself.** Every `/api/routers/*` route (add
  router, delete router, reboot device, kill process, install packages, change the
  router's root password) is reachable by anyone who can reach this Next.js server —
  there's no login/session layer in front of it, unlike the LuCI UI on the routers
  themselves. Asked the user how they want this handled (see conversation) rather than
  unilaterally bolting on a login system, since it changes deployment/UX and they may
  already be relying on network-perimeter security (VPN/Tailscale/reverse-proxy auth).

### Auth decision (asked the user, see conversation)
User chose: add a simple shared-password gate rather than document-as-boundary.
Implemented:
- `lib/auth.ts` — password check + HMAC-signed session tokens via **Web Crypto**
  (`crypto.subtle`, not `node:crypto`), so the same code works identically in the
  Edge middleware runtime and the Node route-handler runtime without needing shared
  in-memory state between them. Deliberately does **not** auto-generate a password
  when `OPENFI_PASSWORD` is unset — an auto-generated secret can't be derived
  identically in both runtimes without either persistence or drift, so the app fails
  closed (503, clear message) instead. `OPENFI_PASSWORD` must be set explicitly.
- `middleware.ts` — gates every route except `/login`, `/api/login`, `/api/logout`,
  `/api/health`. Redirects page requests to `/login`, returns 401 JSON for API requests.
- `/api/login`, `/api/logout`, `/login` page, `httpOnly`/`sameSite=lax` cookie,
  12h session, best-effort in-memory per-IP rate limit on login attempts.
- `/api/health` stays public — **updated `compose.yaml`'s Docker healthcheck** to hit
  it instead of `/`, since `/` now 307s to `/login` for an unauthenticated healthcheck.
- Moved all dashboard routes under `app/(dashboard)/` (route groups don't affect
  URLs) so `/login` renders without the Sidebar/Topbar chrome.
- Added a "Sign out" button to `Topbar`.
- Verified end-to-end via curl against both `next dev` and `next start` (production
  build): unauthenticated → redirect/401, wrong password → 401, correct password →
  session cookie → unlocked, logout → re-locked, unconfigured `OPENFI_PASSWORD` → 503
  everywhere except `/api/health`. Full request/response logs checked, no server errors.

### Responsive design fix
Found and fixed a real gap: `.sidebar` (the only site navigation) was `display:none`
below 700px with nothing replacing it — mobile users had no way to navigate between
pages. Rebuilt as a slide-in drawer (`components/sidebar.tsx` + `app/globals.css`):
a `Menu`/`X` toggle button appears only below 700px, opens the sidebar as an overlay
with a backdrop, and shows full text labels (not just hover tooltips, which don't
work on touch) while open. Closes automatically on route change.

### Other DoD items covered this session
- **Security headers** added in `next.config.mjs`: X-Frame-Options, X-Content-Type-
  Options, Referrer-Policy, Permissions-Policy. Verified present on responses via curl.
- **SEO**: set `robots: { index: false, follow: false }` in the root layout — this is
  an internal LAN admin tool, not public content, so OG tags/structured data don't apply.
- **a11y**: added `aria-label`s to icon-only sidebar nav links and the new mobile menu
  toggle (`aria-expanded` included). Did not do a full WCAG contrast audit this pass.
- **Automated checks**: `tsc --noEmit`, `next lint` (now configured, zero warnings),
  and `next build` all pass clean as of the last commit (`3823081`).

### Known limitations / explicitly out of scope this pass
- **No visual browser verification.** This sandbox has no headless browser
  (`chromium-cli` unavailable, no Playwright/Puppeteer/system Chromium installed).
  Everything was verified structurally (curl against real dev/prod servers, checking
  response codes, headers, and rendered HTML for expected markup/classes) rather than
  with a screenshot. If a browser is available in a follow-up session, do a real
  visual pass, especially of the new login page and mobile drawer.
- `npm audit`: 1 critical + 1 high advisory in `next`/`postcss`, fixed only by a Next
  16 major-version bump. Not applied — needs its own upgrade + regression pass.
- The large "Not implemented yet" feature surface documented in `README.md` (switch/
  VLAN config, interface CRUD, firewall zones, routing/ARP views, backup/restore,
  firmware updates, etc.) is unchanged — treated as an intentional product boundary,
  not a DoD gap, per the existing README framing.
- No automated test suite exists in this repo; DoD verification here relied on
  typecheck/lint/build plus manual curl-driven functional checks.
- Full WCAG contrast/keyboard-nav audit not done — spot-checked only (aria-labels on
  icon buttons, focus states already present in existing CSS for inputs).

## Commit
`3823081` — "Add controller login gate, security headers, and fix lint/responsive gaps"
— pushed to `origin/main`.

## 2026-09-09 — Session 2: login stuck on "Signing in…"

User reported the login screen hangs indefinitely on "Signing in…" in a real browser.
Root cause: `app/api/login/route.ts` set the session cookie's `secure` flag from
`process.env.NODE_ENV === "production"`. Docker always runs with `NODE_ENV=production`,
but this controller is reached over plain `http://<lan-ip>:3000` (no TLS) — browsers
silently refuse to store `Secure` cookies on an insecure origin. The login POST still
returned `200 {"ok":true}`, `router.replace("/")` ran, but with no cookie actually
persisted the middleware bounced the client straight back to `/login`; since that's the
same route, the component didn't remount and `busy` (driving the "Signing in…" label)
never reset — exactly the symptom reported.

**This is why curl-based verification in Session 1 didn't catch it**: curl stores and
resends cookies regardless of the `Secure` attribute, unlike a real browser, so every
automated check passed while the real login path was broken. Noting this as a testing
methodology gap, not just a code gap — this class of bug specifically requires either a
real browser or reasoning about browser-only enforcement, not just HTTP-level checks.

**Fix**: derive `secure` from the actual request (`x-forwarded-proto` header if behind a
reverse proxy, else the request's own URL scheme) instead of `NODE_ENV`. Verified the
`Set-Cookie` response header no longer includes `Secure` when hit over plain HTTP via
`next start` (production mode, matching Docker), and that the full login → authenticated
`GET /` flow works with that cookie. Re-ran `tsc --noEmit` / `next lint` / `next build` —
all clean.
