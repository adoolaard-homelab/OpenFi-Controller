# OpenFi Controller

A self-hosted, UniFi-inspired controller interface for one or more OpenWrt routers using the `uhttpd-mod-ubus` JSON-RPC API.

## Pair devices from the UI

Open **OpenWrt Devices** and select **Add OpenWrt Device**. Enter the router's uBus endpoint (normally `https://router-ip/ubus`), username, and password. Credentials are stored server-side in `.openfi/routers.json` locally and `/data/routers.json` in Docker (or `OPENFI_DATA_PATH`) with owner-only file permissions and are never returned by the controller API.

No router-specific `.env` settings are required. `.env` is optional and only supports app deployment settings such as `OPENFI_PORT` and `OPENFI_DATA_PATH`; see `.env.example`.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, pair your routers, and use **Client Devices** for the cross-router inventory and per-client drawer.

## Data and polling

`database.sql` provides the production PostgreSQL schema for routers, clients, sessions, and traffic logs. `lib/polling-service.ts` provides a concurrent multi-router polling primitive for a scheduled worker; it collects system, board and DHCP snapshots. A production deployment should persist these snapshots into the schema and extend the OpenWrt collector with `iwinfo` / `hostapd_cli` data for wireless metrics and traffic counters.

## Feature status

Only the `uhttpd-mod-ubus` JSON-RPC API is used to talk to routers — no SSH or custom agent. Every page below reads real, live data through it; nothing is hardcoded or mocked. Where a feature isn't wired up yet, the UI says so explicitly (a "Not implemented yet" card) instead of showing placeholder numbers.

**Implemented:** device pairing and inventory (`system.board`, `system.info`), Dashboard, Client Devices (`luci-rpc getDHCPLeases`), a single-level Topology view (adopted devices + their DHCP clients), and the full page/navigation skeleton (Radios, Ports, Insights, Settings → System/Networks/WiFi/DHCP & DNS/Firewall, and the per-device Overview/Insights/Settings/Tools drawer).

**Not implemented yet** (each has a place in the UI already): wireless radio/SSID management and channel analysis, switch port/VLAN configuration, interface CRUD (WAN/LAN/Guest/VLAN), DHCP static leases and custom DNS, firewall zones/port forwarding/traffic rules, routing/ARP/conntrack views, system log streaming and process management, system administration (hostname/timezone/NTP/SSH/root password), OPKG package management, cron/startup scripts, LED configuration, diagnostics (ping/traceroute/nslookup), backup/restore, and firmware updates. These will be built out incrementally, all through `uci` and other ubus RPC objects on the same session-authenticated connection already used for pairing.

## Checks

```bash
npm run typecheck
npm run build
```
