# OpenFi Controller

A self-hosted, UniFi-inspired controller interface for one or more OpenWrt routers using the `uhttpd-mod-ubus` JSON-RPC API.

## Pair devices from the UI

Open **OpenWrt Devices** and select **Add OpenWrt Device**. Enter the router's uBus endpoint (normally `https://router-ip/ubus`), username, and password. Credentials are stored server-side in `.openfi/routers.json` (or `OPENFI_DATA_PATH`) with owner-only file permissions and are never returned by the controller API.

No router-specific `.env` settings are required. `.env` is optional and only supports app deployment settings such as `OPENFI_PORT` and `OPENFI_DATA_PATH`; see `.env.example`.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, pair your routers, and use **Client Devices** for the cross-router inventory and per-client drawer.

## Data and polling

`database.sql` provides the production PostgreSQL schema for routers, clients, sessions, and traffic logs. `lib/polling-service.ts` provides a concurrent multi-router polling primitive for a scheduled worker; it collects system and DHCP snapshots. A production deployment should persist these snapshots into the schema and extend the OpenWrt collector with `iwinfo` / `hostapd_cli` data for wireless metrics and traffic counters.

## Checks

```bash
npm run typecheck
npm run build
```
