CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  language TEXT NOT NULL DEFAULT 'fa',
  theme TEXT NOT NULL DEFAULT 'dark',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  device_info TEXT,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  transport TEXT,
  tls_enabled INTEGER NOT NULL DEFAULT 1,
  sni TEXT,
  region TEXT,
  provider TEXT,
  tags TEXT,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  created_at INTEGER NOT NULL
);

CREATE TABLE node_health (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  status TEXT NOT NULL,
  latency_ms INTEGER,
  checked_at INTEGER NOT NULL
);
CREATE INDEX idx_node_health_node_id ON node_health(node_id);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  traffic_limit_bytes INTEGER,
  traffic_used_bytes INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

CREATE TABLE configurations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  user_id TEXT REFERENCES users(id),
  subscription_id TEXT REFERENCES subscriptions(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  params_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_configurations_subscription_id ON configurations(subscription_id);
CREATE INDEX idx_configurations_node_id ON configurations(node_id);
CREATE INDEX idx_configurations_status ON configurations(status);

CREATE TABLE traffic_usage (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  download_bytes INTEGER NOT NULL DEFAULT 0,
  upload_bytes INTEGER NOT NULL DEFAULT 0,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX idx_traffic_usage_subscription_id ON traffic_usage(subscription_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  actor_id TEXT,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE deployment_records (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  project TEXT,
  service TEXT,
  version TEXT,
  status TEXT NOT NULL,
  deployment_url TEXT,
  error_code TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE installer_records (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  current_step TEXT NOT NULL,
  completed_steps_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
