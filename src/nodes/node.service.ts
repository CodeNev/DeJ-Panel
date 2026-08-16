import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { nodes, nodeHealth } from "../db/schema";
import { generateUuid } from "../security/crypto";

export type NodeHealthStatus = "ONLINE" | "OFFLINE" | "DEGRADED" | "UNKNOWN";

const DEGRADED_LATENCY_THRESHOLD_MS = 800;
const HEALTH_CHECK_TIMEOUT_MS = 5000;

export async function checkNodeHealth(address: string, port: number, tlsEnabled: boolean): Promise<{
  status: NodeHealthStatus;
  latencyMs: number | null;
}> {
  const scheme = tlsEnabled ? "https" : "http";
  const url = `${scheme}://${address}:${port}/`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    return { status: latencyMs > DEGRADED_LATENCY_THRESHOLD_MS ? "DEGRADED" : "ONLINE", latencyMs };
  } catch {
    return { status: "OFFLINE", latencyMs: null };
  }
}

export async function runHealthCheckForAllNodes(db: D1Database): Promise<void> {
  const orm = drizzle(db);
  const allNodes = await orm.select().from(nodes);

  for (const node of allNodes) {
    const result = await checkNodeHealth(node.address, node.port, node.tlsEnabled === 1);
    const now = Date.now();

    await orm.insert(nodeHealth).values({
      id: generateUuid(),
      nodeId: node.id,
      status: result.status,
      latencyMs: result.latencyMs,
      checkedAt: now,
    });

    await orm.update(nodes).set({ status: result.status }).where(eq(nodes.id, node.id));
  }
}

export function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))));
}
