import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { sql, eq } from "drizzle-orm";
import { configurations, subscriptions, nodes } from "../db/schema";
import { requireAuth } from "../middleware/session";
import { ok } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

export const dashboardRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();
dashboardRoutes.use("*", requireAuth);

dashboardRoutes.get("/summary", async (c) => {
  const orm = drizzle(c.env.DB);

  const [configTotal] = await orm.select({ count: sql<number>`count(*)` }).from(configurations);
  const [configActive] = await orm
    .select({ count: sql<number>`count(*)` })
    .from(configurations)
    .where(eq(configurations.status, "ACTIVE"));

  const [subTotal] = await orm.select({ count: sql<number>`count(*)` }).from(subscriptions);
  const [subActive] = await orm
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "ACTIVE"));

  const [nodeTotal] = await orm.select({ count: sql<number>`count(*)` }).from(nodes);
  const [nodeOnline] = await orm
    .select({ count: sql<number>`count(*)` })
    .from(nodes)
    .where(eq(nodes.status, "ONLINE"));

  return c.json(
    ok({
      configurations: { total: configTotal?.count ?? 0, active: configActive?.count ?? 0 },
      subscriptions: { total: subTotal?.count ?? 0, active: subActive?.count ?? 0 },
      nodes: { total: nodeTotal?.count ?? 0, online: nodeOnline?.count ?? 0 },
      platform: c.env.DEPLOYMENT_PLATFORM,
      environment: c.env.APP_ENV,
      version: c.env.APP_VERSION,
    })
  );
});
