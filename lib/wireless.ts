import type { OpenWrtClient, UciSection, WirelessRadioStatus } from "@/lib/openwrt";

export type Band = "2.4GHz" | "5GHz";
export type RadioSummary = {
  section: string; band: Band; channel: string; htmode: string; txpower?: number;
  disabled: boolean; up?: boolean; availableChannels: { channel: number; restricted: boolean }[];
};
export type SsidSummary = {
  section: string; ssid: string; network: string; encryption: string; hidden: boolean;
  disabled: boolean; radioSection: string; band: Band; clients: number;
};

function bandOf(radio: UciSection | undefined, channel?: number): Band {
  const band = String(radio?.band ?? "");
  if (band === "5g" || band === "6g") return "5GHz";
  if (band === "2g") return "2.4GHz";
  const hwmode = String(radio?.hwmode ?? "");
  if (/^11a/.test(hwmode)) return "5GHz";
  if (channel && channel > 14) return "5GHz";
  return "2.4GHz";
}

export async function loadRadios(client: OpenWrtClient): Promise<RadioSummary[]> {
  const config = await client.getWirelessConfig();
  const status = await client.getWirelessStatus().catch((): Record<string, WirelessRadioStatus> => ({}));
  const radios = Object.values(config).filter((section) => section[".type"] === "wifi-device");
  return Promise.all(radios.map(async (radio) => {
    const section = radio[".name"];
    const channelOpt = radio.channel as string | undefined;
    const numericChannel = channelOpt && channelOpt !== "auto" ? Number(channelOpt) : undefined;
    let availableChannels: { channel: number; restricted: boolean }[] = [];
    try { availableChannels = (await client.iwinfoFreqlist(section)).filter((freq) => freq.channel).map((freq) => ({ channel: freq.channel as number, restricted: Boolean(freq.restricted) })); }
    catch { /* radio is down or iwinfo has no backend for it */ }
    return {
      section, band: bandOf(radio, numericChannel ?? availableChannels[0]?.channel),
      channel: channelOpt ?? "auto", htmode: (radio.htmode as string) ?? "", txpower: radio.txpower !== undefined ? Number(radio.txpower) : undefined,
      disabled: radio.disabled === "1", up: status[section]?.up, availableChannels,
    };
  }));
}

export async function loadSsids(client: OpenWrtClient): Promise<SsidSummary[]> {
  const config = await client.getWirelessConfig();
  const status = await client.getWirelessStatus().catch((): Record<string, WirelessRadioStatus> => ({}));
  const ifaces = Object.values(config).filter((section) => section[".type"] === "wifi-iface");
  const radios: Record<string, UciSection> = {};
  for (const section of Object.values(config)) if (section[".type"] === "wifi-device") radios[section[".name"]] = section;
  return Promise.all(ifaces.map(async (iface) => {
    const radioSection = String(iface.device ?? "");
    const radio = radios[radioSection];
    const channelOpt = radio?.channel as string | undefined;
    const numericChannel = channelOpt && channelOpt !== "auto" ? Number(channelOpt) : undefined;
    const radioStatus = status[radioSection];
    const ifname = radioStatus?.interfaces?.find((entry) => (entry.config as { ssid?: string } | undefined)?.ssid === iface.ssid)?.ifname;
    let clients = 0;
    if (ifname) { try { clients = (await client.iwinfoAssoclist(ifname)).length; } catch { /* iface is down */ } }
    return {
      section: iface[".name"], ssid: String(iface.ssid ?? ""), network: String(iface.network ?? "lan"),
      encryption: String(iface.encryption ?? "none"), hidden: iface.hidden === "1", disabled: iface.disabled === "1",
      radioSection, band: bandOf(radio, numericChannel), clients,
    };
  }));
}

/** Human label for a uci wireless `encryption` value (e.g. "psk2" -> "WPA2 Personal"). */
export function securityLabel(encryption: string): string {
  if (!encryption || encryption === "none") return "Open";
  if (encryption.startsWith("sae") || encryption === "wpa3") return encryption.includes("mixed") ? "WPA2/WPA3 Personal" : "WPA3 Personal";
  if (encryption.startsWith("wpa3")) return "WPA3 Enterprise";
  if (encryption.startsWith("psk2")) return "WPA2 Personal";
  if (encryption.startsWith("psk")) return "WPA Personal";
  if (encryption.startsWith("wpa2")) return "WPA2 Enterprise";
  if (encryption.startsWith("wpa")) return "WPA Enterprise";
  return encryption.toUpperCase();
}
