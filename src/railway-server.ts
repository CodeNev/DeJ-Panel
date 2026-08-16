import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { getDbFromSqliteFile } from "./db/client";
import { ok, newRequestId } from "./utils/response";
import type { DrizzleDb } from "./db/client";

const PORT = Number(process.env.PORT ?? 8787);
const DB_FILE = process.env.DEJ_SQLITE_PATH ?? "./data/dej-panel.sqlite";
const APP_VERSION = process.env.APP_VERSION ?? "0.1.0";
const APP_ENV = process.env.APP_ENV ?? "production";

type RailwayVariables = {
  requestId: string;
  db: DrizzleDb;
};

async function bootstrap() {
  const db = await getDbFromSqliteFile(DB_FILE);
  const app = new Hono<{ Variables: RailwayVariables }>();

  app.use("*", async (c, next) => {
    c.set("requestId", newRequestId());
    c.set("db", db);
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

  app.get("/health", (c) =>
    c.json(ok({ status: "healthy", version: APP_VERSION, environment: APP_ENV, platform: "railway" }))
  );

  app.get("/ready", async (c) => {
    try {
      await db.run("SELECT 1" as never);
      return c.json(ok({ ready: true, database: "online" }));
    } catch {
      return c.json(ok({ ready: false, database: "offline" }), 503);
    }
  });

  app.use("/*", serveStatic({ root: "./app-dist" }));
  app.get("*", serveStatic({ path: "./app-dist/index.html" }));

  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`DeJ Panel (Railway) listening on port ${info.port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start DeJ Panel on Railway:", err);
  process.exit(1);
});
