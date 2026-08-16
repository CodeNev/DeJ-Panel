export type PlatformId = "cloudflare" | "railway";

export type ProviderCapabilities = {
  supportsD1: boolean;
  supportsWorkers: boolean;
  supportsServices: boolean;
  supportsSecrets: boolean;
  supportsVariables: boolean;
  supportsCustomDomains: boolean;
  supportsLogs: boolean;
  supportsHealthCheck: boolean;
  supportsRollback: boolean;
  supportsDockerBuild: boolean;
};

export type ProviderCredentials = {
  apiToken: string;
  accountId?: string;
};

export type AccountInfo = {
  id: string;
  name: string;
  email?: string;
};

export type ProjectInfo = {
  id: string;
  name: string;
  createdAt: string | null;
  raw?: unknown;
};

export type DatabaseInfo = {
  id: string;
  name: string;
  raw?: unknown;
};

export type DeploymentStatus =
  | "QUEUED"
  | "BUILDING"
  | "DEPLOYING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";

export type DeploymentInfo = {
  id: string;
  status: DeploymentStatus;
  url: string | null;
  createdAt: string | null;
  raw?: unknown;
};

export type DeploymentLogLine = {
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  message: string;
};

export type HealthCheckResult = {
  healthy: boolean;
  httpStatus?: number;
  latencyMs?: number;
  message?: string;
};

export type DomainStatus = {
  domain: string;
  verified: boolean;
  httpsActive: boolean;
};

export type ProviderErrorCode =
  | "PLATFORM_AUTH_FAILED"
  | "PLATFORM_API_FAILED"
  | "PLATFORM_RATE_LIMITED"
  | "PLATFORM_NOT_FOUND"
  | "PLATFORM_TIMEOUT"
  | "PLATFORM_PERMISSION_DENIED"
  | "PLATFORM_UNSUPPORTED_OPERATION";

export class ProviderError extends Error {
  constructor(
    public code: ProviderErrorCode,
    message: string,
    public retryable: boolean = false,
    public details?: unknown
  ) {
    super(message);
  }
}

export type NewProjectOptions = {
  name: string;
  region?: string;
};

export type EnvironmentVariables = Record<string, string>;
export type SecretVariables = Record<string, string>;

export interface DeploymentProvider {
  readonly platformId: PlatformId;
  readonly capabilities: ProviderCapabilities;

  authenticate(credentials: ProviderCredentials): Promise<void>;
  validateCredentials(): Promise<boolean>;
  getAccount(): Promise<AccountInfo>;

  getProjects(): Promise<ProjectInfo[]>;
  createProject(options: NewProjectOptions): Promise<ProjectInfo>;
  getProject(projectId: string): Promise<ProjectInfo>;
  updateProject(projectId: string, options: Partial<NewProjectOptions>): Promise<ProjectInfo>;
  deleteProject(projectId: string): Promise<void>;

  createDatabase(name: string): Promise<DatabaseInfo>;
  configureDatabase(projectId: string, databaseId: string): Promise<void>;

  configureEnvironment(projectId: string, vars: EnvironmentVariables): Promise<void>;
  configureSecrets(projectId: string, secrets: SecretVariables): Promise<void>;

  deploy(projectId: string): Promise<DeploymentInfo>;
  getDeployment(projectId: string, deploymentId: string): Promise<DeploymentInfo>;
  getDeploymentLogs(projectId: string, deploymentId: string): Promise<DeploymentLogLine[]>;

  getDomain(projectId: string): Promise<DomainStatus | null>;
  configureDomain(projectId: string, domain: string): Promise<DomainStatus>;

  healthCheck(url: string): Promise<HealthCheckResult>;
  rollback(projectId: string, deploymentId: string): Promise<DeploymentInfo>;
  redeploy(projectId: string): Promise<DeploymentInfo>;
  destroy(projectId: string): Promise<void>;
}
