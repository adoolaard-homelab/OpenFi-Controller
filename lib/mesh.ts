import type { OpenWrtClient } from "@/lib/openwrt";

const SSL_BACKENDS = ["mbedtls", "openssl", "wolfssl"] as const;

/** Given the currently installed wpad* package name, returns the mesh-capable package that should replace
 * it, or undefined if the installed package already supports 802.11s mesh encryption. Per the OpenWrt wiki,
 * only the "-mesh-*" and full (non "-basic-") wpad variants carry mesh (SAE) support. */
export function meshWpadTarget(installedName: string | undefined): string | undefined {
  if (!installedName) return "wpad-mesh-mbedtls";
  if (installedName.includes("-mesh")) return undefined;
  const backend = SSL_BACKENDS.find((b) => installedName.endsWith(b));
  if (!backend) return undefined; // custom/unknown wpad build - leave it alone
  if (installedName === `wpad-${backend}`) return undefined; // full wpad already supports mesh
  if (installedName.startsWith("wpad-basic-")) return `wpad-mesh-${backend}`;
  return undefined;
}

/** Finds the wpad* package name reported by `opkg list-installed`, if any. */
export async function currentWpadPackage(client: OpenWrtClient): Promise<string | undefined> {
  const result = await client.opkgListInstalled();
  const line = result.stdout.split("\n").map((l) => l.trim()).find((l) => /^wpad(-\S+)?\s+-/.test(l));
  return line?.split(" - ")[0];
}

export type WpadEnsureResult = { changed: boolean; installed?: string; error?: string };

/** Swaps a non-mesh wpad variant for its mesh-capable equivalent, removing the old package before installing
 * the new one (the order the OpenWrt wiki documents to avoid file conflicts between the two variants). */
export async function ensureMeshWpad(client: OpenWrtClient): Promise<WpadEnsureResult> {
  const current = await currentWpadPackage(client);
  const target = meshWpadTarget(current);
  if (!target) return { changed: false, installed: current };
  try {
    await client.opkgUpdate();
    if (current) await client.opkgRemove(current);
    const result = await client.opkgInstall(target);
    if (result.code !== 0) return { changed: false, error: result.stderr || result.stdout || `Could not install ${target}.` };
    return { changed: true, installed: target };
  } catch (error) {
    return { changed: false, error: error instanceof Error ? error.message : "wpad install failed." };
  }
}
