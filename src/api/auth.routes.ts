import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import { login, logout, AuthError } from "../auth/auth.service";
import { getDbFromD1 } from "../db/client";
import { ok, fail, newRequestId } from "../utils/response";
import { requireAuth } from "../middleware/session";
import type { Bindings, AppVariables } from "../types/env";

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

authRoutes.post("/login", async (c) => {
  const requestId = c.get("requestId") ?? newRequestId();
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(fail("VALIDATION_FAILED", "Invalid login payload.", requestId, parsed.error.flatten()), 400);
  }

  try {
    const deviceInfo = c.req.header("user-agent") ?? null;
    const orm = getDbFromD1(c.env.DB);
    const result = await login(orm, parsed.data.username, parsed.data.password, deviceInfo);

    setCookie(c, "dej_session", result.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      expires: new Date(result.expiresAt),
    });

    return c.json(ok({ userId: result.userId }));
  } catch (err) {
    if (err instanceof AuthError) {
      return c.json(fail(err.code, err.message, requestId), 401);
    }
    return c.json(fail("AUTH_INVALID", "Login failed.", requestId), 401);
  }
});

authRoutes.post("/logout", requireAuth, async (c) => {
  const sessionId = c.get("sessionId");
  const userId = c.get("userId");
  if (sessionId && userId) {
    const orm = getDbFromD1(c.env.DB);
    await logout(orm, sessionId, userId);
  }
  deleteCookie(c, "dej_session", { path: "/" });
  return c.json(ok({ loggedOut: true }));
});

authRoutes.get("/me", requireAuth, async (c) => {
  return c.json(ok({ userId: c.get("userId") }));
});
