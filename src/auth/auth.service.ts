import { eq, and, gt } from "drizzle-orm";
import { users, sessions, auditLogs } from "../db/schema";
import { hashPassword, verifyPassword, generateSecureToken, generateUuid } from "../security/crypto";
import type { DrizzleDb } from "../db/client";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 1000 * 60 * 15;

const failedAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

function isLockedOut(username: string): boolean {
  const entry = failedAttempts.get(username);
  if (!entry) return false;
  if (Date.now() - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(username);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(username: string): void {
  const entry = failedAttempts.get(username);
  if (!entry || Date.now() - entry.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(username, { count: 1, firstAttemptAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(username: string): void {
  failedAttempts.delete(username);
}

export async function login(
  orm: DrizzleDb,
  username: string,
  password: string,
  deviceInfo: string | null
): Promise<{ sessionToken: string; userId: string; expiresAt: number }> {
  if (isLockedOut(username)) {
    throw new AuthError("AUTH_LOCKED", "Too many failed login attempts. Try again later.");
  }

  const [user] = await orm.select().from(users).where(eq(users.username, username)).limit(1);

  if (!user || user.status !== "ACTIVE") {
    recordFailedAttempt(username);
    throw new AuthError("AUTH_INVALID", "Invalid username or password.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailedAttempt(username);
    throw new AuthError("AUTH_INVALID", "Invalid username or password.");
  }

  clearFailedAttempts(username);

  const sessionId = generateUuid();
  const sessionToken = generateSecureToken(32);
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  await orm.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    deviceInfo,
    createdAt: now,
    lastActiveAt: now,
    expiresAt,
    revoked: 0,
  });

  await orm.update(users).set({ lastLoginAt: now }).where(eq(users.id, user.id));

  await orm.insert(auditLogs).values({
    id: generateUuid(),
    event: "auth.login_success",
    actorId: user.id,
    targetType: "user",
    targetId: user.id,
    metadataJson: null,
    createdAt: now,
  });

  return { sessionToken: `${sessionId}.${sessionToken}`, userId: user.id, expiresAt };
}

export async function validateSession(
  orm: DrizzleDb,
  sessionToken: string
): Promise<{ userId: string; sessionId: string } | null> {
  const [sessionId] = sessionToken.split(".");
  if (!sessionId) return null;

  const now = Date.now();
  const [session] = await orm
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.revoked, 0), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!session) return null;

  await orm.update(sessions).set({ lastActiveAt: now }).where(eq(sessions.id, sessionId));

  return { userId: session.userId, sessionId: session.id };
}

export async function logout(orm: DrizzleDb, sessionId: string, actorId: string): Promise<void> {
  await orm.update(sessions).set({ revoked: 1 }).where(eq(sessions.id, sessionId));
  await orm.insert(auditLogs).values({
    id: generateUuid(),
    event: "auth.logout",
    actorId,
    targetType: "session",
    targetId: sessionId,
    metadataJson: null,
    createdAt: Date.now(),
  });
}

export async function createInitialAdmin(
  orm: DrizzleDb,
  username: string,
  password: string
): Promise<string> {
  const [existing] = await orm.select().from(users).limit(1);
  if (existing) {
    throw new AuthError("ADMIN_EXISTS", "An admin account already exists.");
  }
  const id = generateUuid();
  const now = Date.now();
  await orm.insert(users).values({
    id,
    username,
    passwordHash: await hashPassword(password),
    role: "ADMIN",
    status: "ACTIVE",
    language: "fa",
    theme: "dark",
    timezone: "UTC",
    createdAt: now,
    updatedAt: now,
  });
  return id;
}
