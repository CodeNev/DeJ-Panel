import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { nodes } from "../db/schema";
import { generateUuid } from "../security/crypto";
import { serializeTags, parseTags, checkNodeHealth } from "../nodes/node.service";
import { requireAuth } from "../middleware/session";
import { ok, fail, newRequestId } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

export const nodeRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();
nodeRoutes.use("*", requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(64),
  address: z.string().min(1),
  port: z.number().int().positive().max(65535),
  protocol: z.string().min(1),
  region: z.string().optional(),
  provider: z.string().optional(),
  tags: z.array(z.string()).optional(),
  tlsEnabled: z.boolean().optional(),
});

nodeRoutes.get("/", async (c) => {
  const orm = drizzle(c.env.DB);
  const list = await orm.select().from(nodes).limit(200);
  return c.json(ok(list.map((n) => ({ ...n, tags: parseTags(n.tags) }))));
});

nodeRoutes.post("/", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(fail("VALIDATION_FAILED", "Invalid node payload.", requestId, parsed.error.flatten()), 400);
  }

  const orm = drizzle(c.env.DB);
  const id = generateUuid();

  await orm.insert(nodes).values({
    id,
    name: parsed.data.name,
    address: parsed.data.address,
    port: parsed.data.port,
    protocol: parsed.data.protocol,
    tlsEnabled: parsed.data.tlsEnabled === false ? 0 : 1,
    region: parsed.data.region ?? null,
    provider: parsed.data.provider ?? null,
    tags: serializeTags(parsed.data.tags ?? []),
    status: "UNKNOWN",
    createdAt: Date.now(),
  });

  return c.json(ok({ id }));
});

nodeRoutes.post("/:id/health-check", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const orm = drizzle(c.env.DB);
  const [node] = await orm.select().from(nodes).where(eq(nodes.id, c.req.param("id"))).limit(1);

  if (!node) {
    return c.json(fail("NOT_FOUND", "Node not found.", requestId), 404);
  }

  const result = await checkNodeHealth(node.address, node.port, node.tlsEnabled === 1);
  await orm.update(nodes).set({ status: result.status }).where(eq(nodes.id, node.id));

  return c.json(ok(result));
});
