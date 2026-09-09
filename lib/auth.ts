export const SESSION_COOKIE = "openfi_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/** Web Crypto (not node:crypto) so this runs identically in the Edge middleware runtime and the Node route runtime. */
function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(signature);
}

/** Constant-time-ish string compare; avoids leaking match length via short-circuit `===`. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Configured once by the operator; there is no default so a fresh deployment fails closed rather than shipping a guessable password. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.OPENFI_PASSWORD);
}

export function verifyPassword(input: string): boolean {
  const password = process.env.OPENFI_PASSWORD;
  return Boolean(password) && safeEqual(input, password!);
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await hmac(process.env.OPENFI_PASSWORD!, String(expiresAt));
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false;
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);
  if (!expiresAt || !signature || Date.now() > expiresAt) return false;
  const expected = await hmac(process.env.OPENFI_PASSWORD!, expiresAtRaw);
  return safeEqual(expected, signature);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/** Best-effort, single-process brute-force throttle for the login endpoint. Resets on restart; not distributed. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) { attempts.set(key, { count: 1, resetAt: now + WINDOW_MS }); return false; }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
