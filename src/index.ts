import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { authRoutes } from "./api/auth.routes";
import { installRoutes } from "./api/install.routes";
import { configRoutes } from "./api/config.routes";
import { subscriptionAdminRoutes } from "./api/subscription-admin.routes";
import { subscriptionRoutes } from "./api/subscription.routes";
import { nodeRoutes } from "./api/node.routes";
import { dashboardRoutes } from "./api/dashboard.routes";
import { ok, newRequestId } from "./utils/response";
import { runHealthCheckForAllNodes } from "./nodes/node.service";
import { recomputeExpiredStatuses } from "./subscriptions/subscription.service";
import type { Bindings, AppVariables } from "./types/env";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.use("*", async (c, next) => {
  c.set("requestId", newRequestId());
  await next();
});

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
    referrerPolicy: "no-referrer",
    xContentTypeOptions: "nosniff",
  })
);

app.use(
  "/api/*",
  cors({
    origin: (origin) => origin ?? "",
    credentials: true,
  })
);

app.get("/health", (c) => {
  return c.json(
    ok({
      status: "healthy",
      version: c.env.APP_VERSION,
      environment: c.env.APP_ENV,
      platform: c.env.DEPLOYMENT_PLATFORM,
    })
  );
});

app.get("/ready", async (c) => {
  try {
    await c.env.DB.prepare("SELECT 1").first();
    return c.json(ok({ ready: true, database: "online" }));
  } catch {
    return c.json(ok({ ready: false, database: "offline" }), 503);
  }
});

app.route("/api/auth", authRoutes);
app.route("/api/install", installRoutes);
app.route("/api/configs", configRoutes);
app.route("/api/subscriptions", subscriptionAdminRoutes);
app.route("/sub", subscriptionRoutes);
app.route("/api/nodes", nodeRoutes);
app.route("/api/dashboard", dashboardRoutes);

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings): Promise<void> {
    await runHealthCheckForAllNodes(env.DB);
    await recomputeExpiredStatuses(env.DB);
  },
};
