import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("ADMIN"),
  status: text("status").notNull().default("ACTIVE"),
  language: text("language").notNull().default("fa"),
  theme: text("theme").notNull().default("dark"),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  lastLoginAt: integer("last_login_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  deviceInfo: text("device_info"),
  createdAt: integer("created_at").notNull(),
  lastActiveAt: integer("last_active_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  revoked: integer("revoked").notNull().default(0),
});

export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  port: integer("port").notNull(),
  protocol: text("protocol").notNull(),
  transport: text("transport"),
  tlsEnabled: integer("tls_enabled").notNull().default(1),
  sni: text("sni"),
  region: text("region"),
  provider: text("provider"),
  tags: text("tags"),
  status: text("status").notNull().default("UNKNOWN"),
  createdAt: integer("created_at").notNull(),
});

export const nodeHealth = sqliteTable("node_health", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  status: text("status").notNull(),
  latencyMs: integer("latency_ms"),
  checkedAt: integer("checked_at").notNull(),
});

export const configurations = sqliteTable("configurations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(),
  nodeId: text("node_id").notNull(),
  userId: text("user_id"),
  subscriptionId: text("subscription_id"),
  status: text("status").notNull().default("ACTIVE"),
  paramsJson: text("params_json").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  trafficLimitBytes: integer("traffic_limit_bytes"),
  trafficUsedBytes: integer("traffic_used_bytes").notNull().default(0),
  expiresAt: integer("expires_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const trafficUsage = sqliteTable("traffic_usage", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull(),
  downloadBytes: integer("download_bytes").notNull().default(0),
  uploadBytes: integer("upload_bytes").notNull().default(0),
  recordedAt: integer("recorded_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  event: text("event").notNull(),
  actorId: text("actor_id"),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadataJson: text("metadata_json"),
  createdAt: integer("created_at").notNull(),
});

export const deploymentRecords = sqliteTable("deployment_records", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  project: text("project"),
  service: text("service"),
  version: text("version"),
  status: text("status").notNull(),
  deploymentUrl: text("deployment_url"),
  errorCode: text("error_code"),
  startedAt: integer("started_at").notNull(),
  completedAt: integer("completed_at"),
});

export const installerRecords = sqliteTable("installer_records", {
  id: text("id").primaryKey(),
  platform: text("platform").notNull(),
  currentStep: text("current_step").notNull(),
  completedStepsJson: text("completed_steps_json").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
