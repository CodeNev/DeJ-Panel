export type SubscriptionRecord = {
  status: "ACTIVE" | "DISABLED" | "EXPIRED" | "REVOKED" | "LIMIT_REACHED";
  trafficLimitBytes: number | null;
  trafficUsedBytes: number;
  expiresAt: number | null;
};

export type EffectiveAccess = {
  allowed: boolean;
  reason: "ACTIVE" | "DISABLED" | "REVOKED" | "EXPIRED" | "LIMIT_REACHED";
};

export function evaluateSubscriptionAccess(subscription: SubscriptionRecord, now: number): EffectiveAccess {
  if (subscription.status === "REVOKED") return { allowed: false, reason: "REVOKED" };
  if (subscription.status === "DISABLED") return { allowed: false, reason: "DISABLED" };

  if (subscription.expiresAt !== null && subscription.expiresAt <= now) {
    return { allowed: false, reason: "EXPIRED" };
  }

  if (
    subscription.trafficLimitBytes !== null &&
    subscription.trafficUsedBytes >= subscription.trafficLimitBytes
  ) {
    return { allowed: false, reason: "LIMIT_REACHED" };
  }

  return { allowed: true, reason: "ACTIVE" };
}

export function computeSubscriptionStatus(
  subscription: SubscriptionRecord,
  now: number
): SubscriptionRecord["status"] {
  if (subscription.status === "REVOKED") return "REVOKED";
  if (subscription.status === "DISABLED") return "DISABLED";
  const access = evaluateSubscriptionAccess({ ...subscription, status: "ACTIVE" }, now);
  if (!access.allowed) {
    return access.reason as SubscriptionRecord["status"];
  }
  return "ACTIVE";
}

export function trafficPercentUsed(subscription: SubscriptionRecord): number | null {
  if (subscription.trafficLimitBytes === null || subscription.trafficLimitBytes === 0) return null;
  return Math.min(100, Math.round((subscription.trafficUsedBytes / subscription.trafficLimitBytes) * 100));
}

export function remainingBytes(subscription: SubscriptionRecord): number | null {
  if (subscription.trafficLimitBytes === null) return null;
  return Math.max(0, subscription.trafficLimitBytes - subscription.trafficUsedBytes);
}
