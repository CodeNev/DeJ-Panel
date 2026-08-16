import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { subscriptions, configurations, auditLogs } from "../db/schema";
import { generateSecureToken, generateUuid } from "../security/crypto";
import { evaluateSubscriptionAccess, computeSubscriptionStatus } from "../policy/policy.engine";

export type CreateSubscriptionInput = {
  name: string;
  userId?: string;
  trafficLimitBytes?: number;
  expiresAt?: number;
};

export async function createSubscription(db: D1Database, input: CreateSubscriptionInput) {
  const orm = drizzle(db);
  const now = Date.now();
  const id = generateUuid();
  const token = generateSecureToken(24);

  await orm.insert(subscriptions).values({
    id,
    token,
    userId: input.userId ?? null,
    name: input.name,
    status: "ACTIVE",
    trafficLimitBytes: input.trafficLimitBytes ?? null,
    trafficUsedBytes: 0,
    expiresAt: input.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await orm.insert(auditLogs).values({
    id: generateUuid(),
    event: "subscription.created",
    actorId: input.userId ?? null,
    targetType: "subscription",
    targetId: id,
    metadataJson: JSON.stringify({ name: input.name }),
    createdAt: now,
  });

  return { id, token };
}

export async function getSubscriptionConfigsForToken(db: D1Database, token: string) {
  const orm = drizzle(db);
  const [subscription] = await orm.select().from(subscriptions).where(eq(subscriptions.token, token)).limit(1);

  if (!subscription) return null;

  const now = Date.now();
  const access = evaluateSubscriptionAccess(
    {
      status: subscription.status as never,
      trafficLimitBytes: subscription.trafficLimitBytes,
      trafficUsedBytes: subscription.trafficUsedBytes,
      expiresAt: subscription.expiresAt,
    },
    now
  );

  if (!access.allowed) {
    return { subscription, access, configs: [] };
  }

  const configs = await orm
    .select()
    .from(configurations)
    .where(eq(configurations.subscriptionId, subscription.id));

  const activeConfigs = configs.filter((c) => c.status === "ACTIVE");

  return { subscription, access, configs: activeConfigs };
}

export async function recomputeExpiredStatuses(db: D1Database): Promise<number> {
  const orm = drizzle(db);
  const now = Date.now();
  const all = await orm.select().from(subscriptions);

  let updated = 0;
  for (const sub of all) {
    const newStatus = computeSubscriptionStatus(
      {
        status: sub.status as never,
        trafficLimitBytes: sub.trafficLimitBytes,
        trafficUsedBytes: sub.trafficUsedBytes,
        expiresAt: sub.expiresAt,
      },
      now
    );
    if (newStatus !== sub.status) {
      await orm.update(subscriptions).set({ status: newStatus, updatedAt: now }).where(eq(subscriptions.id, sub.id));
      updated += 1;
    }
  }
  return updated;
}
