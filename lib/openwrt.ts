import https from "node:https";

const EMPTY_SESSION = "00000000000000000000000000000000";
const AUTH_ERROR_CODES = new Set([4, 6]);

type RpcEnvelope<T> = { jsonrpc: "2.0"; id: number; result?: [number, T]; error?: { code: number; message: string } };
export type SystemInfo = { uptime: number; load: number[]; memory: { total: number; free: number; available?: number }; root: { total: number; free: number; used: number } };
export type NetworkAddress = { address: string; mask: number };
export type OpenWrtInterface = { interface: string; up: boolean; l3_device?: string; proto?: string; uptime?: number; "ipv4-address"?: NetworkAddress[]; route?: { target: string; mask: number; nexthop?: string }[]; "dns-server"?: string[] };
export type DhcpClient = { expires: number; hostname: string; macaddr: string; ipaddr: string };

type Session = { id: string; expiresAt: number };

/** Server-only client for uhttpd-mod-ubus. One client instance caches the short-lived ubus token. */
export class OpenWrtClient {
  private session?: Session;
  private requestId = 0;
  private readonly endpoint: string;
  private readonly username: string;
  private readonly password?: string;

  constructor(config: { endpoint?: string; username?: string; password?: string } = {}) {
    // Legacy environment values remain a convenience for a single-router deployment.
    this.endpoint = config.endpoint ?? process.env.OPENWRT_URL ?? "https://192.168.10.1/ubus";
    this.username = config.username ?? process.env.OPENWRT_USERNAME ?? "root";
    this.password = config.password ?? process.env.OPENWRT_PASSWORD;
  }

  private async post<T>(payload: unknown): Promise<RpcEnvelope<T>> {
    const body = JSON.stringify(payload);
    const url = new URL(this.endpoint);
    return new Promise((resolve, reject) => {
      const request = https.request({ hostname: url.hostname, port: url.port || 443, path: `${url.pathname}${url.search}`, method: "POST", rejectUnauthorized: false, headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } }, (response) => {
        let result = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { result += chunk; });
        response.on("end", () => {
          try { resolve(JSON.parse(result) as RpcEnvelope<T>); } catch { reject(new Error("OpenWrt returned invalid JSON")); }
        });
      });
      request.on("error", reject);
      request.write(body);
      request.end();
    });
  }

  private async login() {
    if (!this.password) throw new Error("OPENWRT_PASSWORD is not configured");
    const response = await this.post<{ ubus_rpc_session: string; expires: number }>({ jsonrpc: "2.0", id: ++this.requestId, method: "call", params: [EMPTY_SESSION, "session", "login", { username: this.username, password: this.password }] });
    const [status, data] = response.result ?? [-1, undefined];
    if (status !== 0 || !data?.ubus_rpc_session) throw new Error(response.error?.message ?? "OpenWrt login failed");
    this.session = { id: data.ubus_rpc_session, expiresAt: Date.now() + data.expires * 1000 };
  }

  private async ensureSession() { if (!this.session || this.session.expiresAt - Date.now() < 60_000) await this.login(); }

  private async call<T>(object: string, method: string, args: Record<string, never> = {}): Promise<T> {
    await this.ensureSession();
    let response = await this.post<T>({ jsonrpc: "2.0", id: ++this.requestId, method: "call", params: [this.session!.id, object, method, args] });
    if (AUTH_ERROR_CODES.has(response.result?.[0] ?? response.error?.code ?? -1)) {
      this.session = undefined;
      await this.ensureSession();
      response = await this.post<T>({ jsonrpc: "2.0", id: ++this.requestId, method: "call", params: [this.session!.id, object, method, args] });
    }
    const [status, data] = response.result ?? [-1, undefined];
    if (status !== 0 || data === undefined) throw new Error(response.error?.message ?? `OpenWrt RPC ${object}.${method} failed (${status})`);
    return data;
  }

  async getSystemInfo() { return this.call<SystemInfo>("system", "info"); }
  async getInterfaces() { return (await this.call<{ interface: OpenWrtInterface[] }>("network.interface", "dump")).interface; }
  async getDhcpClients() { return (await this.call<{ dhcp_leases: DhcpClient[] }>("luci-rpc", "getDHCPLeases")).dhcp_leases; }
}
export const openWrt = new OpenWrtClient();
