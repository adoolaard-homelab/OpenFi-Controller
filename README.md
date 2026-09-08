# OpenFi Controller

A self-hosted Next.js dashboard for OpenWrt routers using the `uhttpd-mod-ubus` JSON-RPC API. It provides a UniFi-inspired dark network overview, client table, and a server-side OpenWrt client with cached session renewal.

## Start with Docker Compose (recommended)

1. Create your local configuration and enter the OpenWrt credentials:

   ```bash
   cp .env.example .env
   ```

2. Build and start the dashboard:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:3000`. To use a different host port, set `OPENFI_PORT` in `.env` before starting the service.

Use `docker compose logs -f` to view logs and `docker compose down` to stop it. The service restarts automatically after a reboot unless it is explicitly stopped.

The container connects to `OPENWRT_URL` from its own network namespace. Make sure that the configured router address is reachable from Docker (a normal LAN IP address usually is).

## Local development

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
