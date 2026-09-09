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

### Next up
- SEO: internal LAN admin tool, not public content — decided to set `robots: noindex`
  rather than add OG/structured-data (not applicable to this app type), no user input needed.
- Accessibility pass (ARIA, keyboard nav, contrast) across the main pages.
- Responsive breakpoint check (mobile/tablet/desktop) for Sidebar/Topbar and data tables.
- Re-run full automated checks after each batch of fixes.
