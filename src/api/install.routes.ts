import { Hono } from "hono";
import { z } from "zod";
import { createInitialAdmin, AuthError } from "../auth/auth.service";
import { getDbFromD1 } from "../db/client";
import { ok, fail, newRequestId } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

const createAdminSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(256),
});

export const installRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

installRoutes.post("/admin", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const body = await c.req.json().catch(() => null);
  const parsed = createAdminSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(fail("VALIDATION_FAILED", "Invalid admin payload.", requestId, parsed.error.flatten()), 400);
  }

  try {
    const orm = getDbFromD1(c.env.DB);
    const userId = await createInitialAdmin(orm, parsed.data.username, parsed.data.password);
    return c.json(ok({ userId }));
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(fail(err.code, err.message, requestId), 409);
    }
    return c.json(fail("DB_UNAVAILABLE", "Could not create admin account.", requestId), 500);
  }
});
