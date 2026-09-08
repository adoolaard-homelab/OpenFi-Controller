# OpenFi Controller

A self-hosted Next.js dashboard for OpenWrt routers using the `uhttpd-mod-ubus` JSON-RPC API. It provides a UniFi-inspired dark network overview, client table, and a server-side OpenWrt client with cached session renewal.

## Setup

```bash
cp .env.example .env.local
# Edit OPENWRT_URL, OPENWRT_USERNAME, and OPENWRT_PASSWORD
npm install
npm run dev
```

Open `http://localhost:3000`. The live integration endpoint is `GET /api/overview`; it returns a 503 JSON response with the connection error until router credentials are configured and reachable.

> The OpenWrt request client deliberately disables TLS certificate validation for the configured local endpoint, to support default/self-signed router certificates. Use only on a trusted local network.

## Checks

```bash
npm run typecheck
npm run build
```
