"use client";
import { useEffect, useState } from "react";

export type RouterSummary = { id: string; name: string; endpoint: string; createdAt: string };

export function useRouters() {
  const [routers, setRouters] = useState<RouterSummary[]>();
  useEffect(() => { void fetch("/api/routers").then((r) => r.json()).then(setRouters).catch(() => setRouters([])); }, []);
  return routers;
}
