import https from "node:https";

const EMPTY_SESSION = "00000000000000000000000000000000";
const AUTH_ERROR_CODES = new Set([4, 6]);

type RpcEnvelope<T> = { jsonrpc: "2.0"; id: number; result?: [number, T]; error?: { code: number; message: string } };
export type SystemInfo = { uptime: number; load: number[]; memory: { total: number; free: number; available?: number }; root: { total: number; free: number; used: number } };
export type NetworkAddress = { address: string; mask: number };
export type OpenWrtInterface = { interface: string; up: boolean; l3_device?: string; proto?: string; uptime?: number; "ipv4-address"?: NetworkAddress[]; route?: { target: string; mask: number; nexthop?: string }[]; "dns-server"?: string[] };
export type DhcpClient = { expires: number; hostname: string; macaddr: string; ipaddr: string };
export type BoardInfo = { hostname: string; model?: string; board_name?: string; release?: { distribution?: string; version?: string; revision?: string; target?: string; description?: string } };

/** A ubus/uci config section. Metadata keys are dot-prefixed exactly as the uci ubus plugin reports them. */
export type UciSection = { ".name": string; ".type": string; ".anonymous"?: boolean; [option: string]: unknown };
export type ExecResult = { code: number; stdout: string; stderr: string };
export type LogEntry = { msg: string; time?: number; priority?: number; source?: number };
export type WirelessRadioStatus = { up?: boolean; pending?: boolean; autostart?: boolean; disabled?: boolean; config?: Record<string, unknown>; interfaces?: { ifname?: string; config?: Record<string, unknown> }[] };
export type IwinfoInfo = { channel?: number; txpower?: number; txpower_offset?: number; bitrate?: number; quality?: number; quality_max?: number; signal?: number; noise?: number; ssid?: string; mode?: string; hwmode?: string; hwmodes?: string[]; country?: string; htmode?: string };
export type IwinfoAssocEntry = { mac: string; signal?: number; noise?: number; inactive?: number; rx?: { rate?: number }; tx?: { rate?: number } };
export type IwinfoFreq = { channel?: number; mhz?: number; restricted?: boolean; active?: boolean };
export type IwinfoTxpower = { dbm: number; mw: number };

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

  private async invoke<T>(object: string, method: string, args: Record<string, unknown> = {}): Promise<RpcEnvelope<T>> {
    await this.ensureSession();
    let response = await this.post<T>({ jsonrpc: "2.0", id: ++this.requestId, method: "call", params: [this.session!.id, object, method, args] });
    if (AUTH_ERROR_CODES.has(response.result?.[0] ?? response.error?.code ?? -1)) {
      this.session = undefined;
      await this.ensureSession();
      response = await this.post<T>({ jsonrpc: "2.0", id: ++this.requestId, method: "call", params: [this.session!.id, object, method, args] });
    }
    return response;
  }

  /** For RPC methods that reply with a data payload (uci get/add, session login, iwinfo, ...). */
  private async call<T>(object: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
    const response = await this.invoke<T>(object, method, args);
    const [status, data] = response.result ?? [-1, undefined];
    if (status !== 0 || data === undefined) throw new Error(response.error?.message ?? `OpenWrt RPC ${object}.${method} failed (${status})`);
    return data;
  }

  /** For RPC methods (uci set/delete/commit, system.reboot, ...) whose ubus reply carries a status code only,
   * no data blob — rpcd never calls ubus_send_reply for these, so `result` is `[status]` even on success. */
  private async callVoid(object: string, method: string, args: Record<string, unknown> = {}): Promise<void> {
    const response = await this.invoke<unknown>(object, method, args);
    const status = response.result?.[0] ?? -1;
    if (status !== 0) throw new Error(response.error?.message ?? `OpenWrt RPC ${object}.${method} failed (${status})`);
  }

  // --- Core system info (used by the polling service / device drawer) ---
  async getSystemInfo() { return this.call<SystemInfo>("system", "info"); }
  async getBoardInfo() { return this.call<BoardInfo>("system", "board"); }
  async getInterfaces() { return (await this.call<{ interface: OpenWrtInterface[] }>("network.interface", "dump")).interface; }
  async getDhcpClients() { return (await this.call<{ dhcp_leases: DhcpClient[] }>("luci-rpc", "getDHCPLeases")).dhcp_leases; }

  // --- Generic UCI configuration access ---
  /** Every section of a config package, keyed by section id (".name"/".type" carry uci metadata). */
  async uciGetAll(config: string): Promise<Record<string, UciSection>> {
    return (await this.call<{ values: Record<string, UciSection> }>("uci", "get", { config })).values ?? {};
  }
  async uciGetSection(config: string, section: string): Promise<UciSection> {
    return (await this.call<{ value: UciSection }>("uci", "get", { config, section })).value;
  }
  async uciSet(config: string, section: string, values: Record<string, unknown>): Promise<void> {
    await this.callVoid("uci", "set", { config, section, values });
  }
  /** Creates a section. Pass `name` for a named section (e.g. "lan"), omit for an anonymous one; returns the resulting section id. */
  async uciAdd(config: string, type: string, values: Record<string, unknown> = {}, name?: string): Promise<string> {
    return (await this.call<{ section: string }>("uci", "add", { config, type, values, ...(name ? { name } : {}) })).section;
  }
  async uciDelete(config: string, section: string, options?: string[]): Promise<void> {
    await this.callVoid("uci", "delete", { config, section, ...(options ? { options } : {}) });
  }
  async uciCommit(config: string): Promise<void> { await this.callVoid("uci", "commit", { config }); }
  /** Persists staged changes for one or more config packages to disk. Callers still need to reload the owning service. */
  async uciApply(configs: string[]): Promise<void> { for (const config of configs) await this.uciCommit(config); }
  /** Finds the first section of a given type, e.g. the anonymous "system" or "timeserver" section in config `system`. */
  async uciFindByType(config: string, type: string): Promise<UciSection | undefined> {
    return Object.values(await this.uciGetAll(config)).find((section) => section[".type"] === type);
  }

  // --- Command execution via rpcd's file plugin (mirrors what LuCI itself uses for ping/opkg/ps/etc.) ---
  /** Tries each absolute path in order (busybox binaries live in different locations across targets) and returns the first that runs. */
  async exec(paths: string[], params: string[] = []): Promise<ExecResult> {
    let lastError: unknown;
    for (const command of paths) {
      try {
        const result = await this.call<{ code: number; stdout?: string; stderr?: string }>("file", "exec", { command, params });
        return { code: result.code, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
      } catch (error) { lastError = error; }
    }
    throw lastError instanceof Error ? lastError : new Error("This command is not available on the device (rpcd file ACL may be missing).");
  }

  // --- System administration ---
  async reboot(): Promise<void> { await this.callVoid("system", "reboot", {}); }
  /** Requires the rpcd `luci` plugin (luci-mod-rpc / rpcd-mod-luci), which stock LuCI installs ship. */
  async setPassword(username: string, password: string): Promise<void> { await this.callVoid("luci", "setPassword", { username, password }); }
  async reloadNetwork(): Promise<void> { await this.exec(["/sbin/reload_config", "/etc/init.d/network"], ["reload"]).catch(() => this.exec(["/etc/init.d/network"], ["reload"])); }
  async reloadWifi(): Promise<void> { await this.exec(["/sbin/wifi"], ["reload"]); }
  async reloadDnsmasq(): Promise<void> { await this.exec(["/etc/init.d/dnsmasq"], ["reload"]); }
  async reloadFirewall(): Promise<void> { await this.exec(["/etc/init.d/firewall"], ["reload"]); }
  async reloadDropbear(): Promise<void> { await this.exec(["/etc/init.d/dropbear"], ["restart"]); }

  // --- Logs & processes ---
  async readLog(lines = 200): Promise<LogEntry[]> { return (await this.call<{ log?: LogEntry[] }>("log", "read", { lines })).log ?? []; }
  async readKernelLog(): Promise<string> { return (await this.exec(["/bin/dmesg"], [])).stdout; }
  async listProcesses(): Promise<ExecResult> { return this.exec(["/bin/ps", "/usr/bin/ps"], ["w"]); }
  async killProcess(pid: string): Promise<ExecResult> { return this.exec(["/bin/kill", "/usr/bin/kill"], ["-9", pid]); }

  // --- Software (opkg) ---
  async opkgListInstalled(): Promise<ExecResult> { return this.exec(["/bin/opkg", "/usr/bin/opkg"], ["list-installed"]); }
  async opkgFind(pattern: string): Promise<ExecResult> { return this.exec(["/bin/opkg", "/usr/bin/opkg"], ["find", `*${pattern}*`]); }
  async opkgUpdate(): Promise<ExecResult> { return this.exec(["/bin/opkg", "/usr/bin/opkg"], ["update"]); }
  async opkgInstall(pkg: string): Promise<ExecResult> { return this.exec(["/bin/opkg", "/usr/bin/opkg"], ["install", pkg]); }
  async opkgRemove(pkg: string): Promise<ExecResult> { return this.exec(["/bin/opkg", "/usr/bin/opkg"], ["remove", pkg]); }

  // --- Diagnostics ---
  async ping(target: string, count = 4): Promise<ExecResult> { return this.exec(["/bin/ping", "/usr/bin/ping"], ["-c", String(count), "-W", "2", target]); }
  async traceroute(target: string): Promise<ExecResult> { return this.exec(["/usr/bin/traceroute", "/bin/traceroute", "/usr/sbin/traceroute"], ["-n", "-q", "1", "-w", "2", target]); }
  async nslookup(target: string): Promise<ExecResult> { return this.exec(["/bin/nslookup", "/usr/bin/nslookup"], [target]); }

  // --- Wireless ---
  async getWirelessConfig(): Promise<Record<string, UciSection>> { return this.uciGetAll("wireless"); }
  async getWirelessStatus(): Promise<Record<string, WirelessRadioStatus>> { return this.call<Record<string, WirelessRadioStatus>>("network.wireless", "status", {}); }
  async iwinfoInfo(device: string): Promise<IwinfoInfo> { return this.call<IwinfoInfo>("iwinfo", "info", { device }); }
  async iwinfoAssoclist(device: string): Promise<IwinfoAssocEntry[]> { return (await this.call<{ results: IwinfoAssocEntry[] }>("iwinfo", "assoclist", { device })).results ?? []; }
  async iwinfoFreqlist(device: string): Promise<IwinfoFreq[]> { return (await this.call<{ results: IwinfoFreq[] }>("iwinfo", "freqlist", { device })).results ?? []; }
  async iwinfoTxpowerlist(device: string): Promise<IwinfoTxpower[]> { return (await this.call<{ results: IwinfoTxpower[] }>("iwinfo", "txpowerlist", { device })).results ?? []; }
}
export const openWrt = new OpenWrtClient();
