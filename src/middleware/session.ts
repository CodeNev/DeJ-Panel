import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { validateSession } from "../auth/auth.service";
import { getDbFromD1 } from "../db/client";
import { fail, newRequestId } from "../utils/response";
import type { Bindings, AppVariables } from "../types/env";

export async function requireAuth(
  c: Context<{ Bindings: Bindings; Variables: AppVariables }>,
  next: Next
) {
  const token = getCookie(c, "dej_session");
  const requestId = c.get("requestId") ?? newRequestId();

  if (!token) {
    return c.json(fail("AUTH_INVALID", "Authentication required.", requestId), 401);
  }

  const orm = getDbFromD1(c.env.DB);
  const result = await validateSession(orm, token);
  if (!result) {
    return c.json(fail("AUTH_EXPIRED", "Session is invalid or expired.", requestId), 401);
  }

  c.set("userId", result.userId);
  c.set("sessionId", result.sessionId);
  await next();
}
