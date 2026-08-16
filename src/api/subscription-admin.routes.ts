import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";
import { subscriptions } from "../db/schema";
import { createSubscription } from "../subscriptions/subscription.service";
import { requireAuth } from "../middleware/session";
import { ok, fail, newRequestId } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

export const subscriptionAdminRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();
subscriptionAdminRoutes.use("*", requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(64),
  trafficLimitBytes: z.number().positive().optional(),
  expiresAt: z.number().positive().optional(),
});

subscriptionAdminRoutes.get("/", async (c) => {
  const orm = drizzle(c.env.DB);
  const list = await orm.select().from(subscriptions).limit(200);
  return c.json(ok(list));
});

subscriptionAdminRoutes.post("/", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(fail("VALIDATION_FAILED", "Invalid subscription payload.", requestId, parsed.error.flatten()), 400);
  }

  const result = await createSubscription(c.env.DB, {
    name: parsed.data.name,
    userId: c.get("userId"),
    trafficLimitBytes: parsed.data.trafficLimitBytes,
    expiresAt: parsed.data.expiresAt,
  });

  return c.json(ok(result));
});
