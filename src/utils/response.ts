export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export const ErrorCodes = {
  AUTH_INVALID: "AUTH_INVALID",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  DB_MIGRATION_FAILED: "DB_MIGRATION_FAILED",
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_GENERATION_FAILED: "CONFIG_GENERATION_FAILED",
  SUBSCRIPTION_LIMIT_REACHED: "SUBSCRIPTION_LIMIT_REACHED",
  DEPLOYMENT_FAILED: "DEPLOYMENT_FAILED",
  HEALTH_CHECK_FAILED: "HEALTH_CHECK_FAILED",
  PLATFORM_AUTH_FAILED: "PLATFORM_AUTH_FAILED",
  PLATFORM_API_FAILED: "PLATFORM_API_FAILED",
  DOMAIN_VERIFICATION_FAILED: "DOMAIN_VERIFICATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
} as const;

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return { success: true, data, meta };
}

export function fail(code: string, message: string, requestId: string, details?: unknown): ApiError {
  return { success: false, error: { code, message, details }, requestId };
}

export function newRequestId(): string {
  return crypto.randomUUID();
}
