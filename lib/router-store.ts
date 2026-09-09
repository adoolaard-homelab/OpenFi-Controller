import { promises as fs } from "node:fs";
import path from "node:path";

export type RouterRecord = {
  id: string;
  name: string;
  endpoint: string;
  username: string;
  password: string;
  createdAt: string;
};

const storePath = process.env.OPENFI_DATA_PATH ?? path.join(process.cwd(), ".openfi", "routers.json");

async function read(): Promise<RouterRecord[]> {
  try { return JSON.parse(await fs.readFile(storePath, "utf8")) as RouterRecord[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
async function write(routers: RouterRecord[]) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(routers, null, 2), { mode: 0o600 });
}
export async function getRouters() { return read(); }
export async function createRouter(input: Omit<RouterRecord, "id" | "createdAt">) {
  const routers = await read();
  const router = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  routers.push(router); await write(routers); return router;
}
export async function deleteRouter(id: string) { const routers = await read(); await write(routers.filter((router) => router.id !== id)); }
/** Do not return controller credentials to browser clients. */
export function publicRouter(router: RouterRecord) { const { password: _password, username: _username, ...safe } = router; return safe; }
