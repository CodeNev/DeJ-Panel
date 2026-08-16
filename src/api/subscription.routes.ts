import { Hono } from "hono";
import { getSubscriptionConfigsForToken } from "../subscriptions/subscription.service";
import { getGenerator } from "../configs";
import { ok, fail, newRequestId } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

export const subscriptionRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

const rateLimitWindow = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(token: string): boolean {
  const now = Date.now();
  const entry = rateLimitWindow.get(token);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitWindow.set(token, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

subscriptionRoutes.get("/:token", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const token = c.req.param("token");

  if (isRateLimited(token)) {
    return c.json(fail("RATE_LIMITED", "Too many requests for this subscription.", requestId), 429);
  }

  const result = await getSubscriptionConfigsForToken(c.env.DB, token);
  if (!result) {
    return c.json(fail("NOT_FOUND", "Subscription not found.", requestId), 404);
  }

  if (!result.access.allowed) {
    return c.json(ok({ status: result.access.reason, configs: [] }));
  }

  const uris = result.configs.map((config) => {
    const params = JSON.parse(config.paramsJson);
    const generator = getGenerator(config.protocol as never);
    return generator.generateUri(params as never);
  });

  return c.text(uris.join("\n"));
});
