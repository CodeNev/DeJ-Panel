import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { configurations } from "../db/schema";
import { getGenerator, nextAvailableConfigName } from "../configs";
import { generateUuid } from "../security/crypto";
import { requireAuth } from "../middleware/session";
import { ok, fail, newRequestId } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

export const configRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();
configRoutes.use("*", requireAuth);

const createSchema = z.object({
  protocol: z.enum(["vless", "vmess", "trojan", "shadowsocks", "wireguard"]),
  nodeId: z.string().min(1),
  name: z.string().min(1).max(64).optional(),
  params: z.record(z.unknown()),
  subscriptionId: z.string().optional(),
});

configRoutes.get("/", async (c) => {
  const orm = drizzle(c.env.DB);
  const list = await orm.select().from(configurations).limit(100);
  return c.json(ok(list));
});

configRoutes.post("/", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(fail("VALIDATION_FAILED", "Invalid configuration payload.", requestId, parsed.error.flatten()), 400);
  }

  const orm = drizzle(c.env.DB);
  const existing = await orm.select({ name: configurations.name }).from(configurations);
  const name = parsed.data.name ?? nextAvailableConfigName(existing.map((e) => e.name));

  try {
    const generator = getGenerator(parsed.data.protocol);
    const validation = generator.validate(parsed.data.params as never);
    if (!validation.valid) {
      return c.json(fail("CONFIG_INVALID", "Configuration parameters are invalid.", requestId, validation.errors), 400);
    }
  } catch (err) {
    return c.json(fail("CONFIG_GENERATION_FAILED", (err as Error).message, requestId), 400);
  }

  const id = generateUuid();
  const now = Date.now();

  await orm.insert(configurations).values({
    id,
    name,
    protocol: parsed.data.protocol,
    nodeId: parsed.data.nodeId,
    userId: c.get("userId") ?? null,
    subscriptionId: parsed.data.subscriptionId ?? null,
    status: "ACTIVE",
    paramsJson: JSON.stringify(parsed.data.params),
    createdAt: now,
    updatedAt: now,
  });

  return c.json(ok({ id, name }));
});

configRoutes.get("/:id/uri", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const orm = drizzle(c.env.DB);
  const [config] = await orm.select().from(configurations).where(eq(configurations.id, c.req.param("id"))).limit(1);

  if (!config) {
    return c.json(fail("NOT_FOUND", "Configuration not found.", requestId), 404);
  }

  const generator = getGenerator(config.protocol as never);
  const uri = generator.generateUri(JSON.parse(config.paramsJson));
  return c.json(ok({ uri }));
});

configRoutes.post("/:id/disable", async (c) => {
  const orm = drizzle(c.env.DB);
  await orm
    .update(configurations)
    .set({ status: "DISABLED", updatedAt: Date.now() })
    .where(eq(configurations.id, c.req.param("id")));
  return c.json(ok({ disabled: true }));
});

configRoutes.delete("/:id", async (c) => {
  const orm = drizzle(c.env.DB);
  await orm.delete(configurations).where(eq(configurations.id, c.req.param("id")));
  return c.json(ok({ deleted: true }));
});
