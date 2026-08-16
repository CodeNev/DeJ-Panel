export type InstallerPlatform = "cloudflare" | "railway";

export type InstallerStepId =
  | "PLATFORM_SELECTION"
  | "PREREQUISITE_CHECK"
  | "AUTHENTICATION"
  | "ACCOUNT_VALIDATION"
  | "PROJECT_CONFIGURATION"
  | "DATABASE_CONFIGURATION"
  | "SECURITY_CONFIGURATION"
  | "ENVIRONMENT_CONFIGURATION"
  | "DOMAIN_CONFIGURATION"
  | "DEPLOYMENT_PREPARATION"
  | "DEPLOYMENT"
  | "DEPLOYMENT_MONITORING"
  | "DATABASE_MIGRATION"
  | "HEALTH_CHECK"
  | "VERIFICATION"
  | "COMPLETED";

export type InstallerStatus = "IDLE" | "RUNNING" | "COMPLETED" | "FAILED" | "ROLLBACK";

export type PrerequisiteStatus = "PASS" | "WARNING" | "FAIL" | "RUNNING" | "SKIPPED";

export type PrerequisiteCheck = {
  id: string;
  title: string;
  description: string;
  technicalDetail?: string;
  resolution?: string;
  status: PrerequisiteStatus;
};

export type InstallerLogLine = {
  timestamp: number;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  message: string;
};

export type InstallerErrorInfo = {
  code: string;
  message: string;
  failedStep: InstallerStepId;
  possibleCauses: string[];
  requestId: string;
  retryable: boolean;
};

export type CreatedResource = {
  type: "worker" | "d1_database" | "railway_project" | "railway_service" | "domain";
  id: string;
  name: string;
  createdAt: number;
};

export type InstallerFormData = {
  workerName?: string;
  databaseName?: string;
  domain?: string;
  adminUsername?: string;
  adminPassword?: string;
  railwayProjectName?: string;
};

export type InstallerState = {
  installationId: string;
  platform: InstallerPlatform | null;
  steps: InstallerStepId[];
  currentStepIndex: number;
  completedSteps: InstallerStepId[];
  status: InstallerStatus;
  prerequisites: PrerequisiteCheck[];
  credentials: { apiToken: string; accountId?: string } | null;
  formData: InstallerFormData;
  logs: InstallerLogLine[];
  createdResources: CreatedResource[];
  deploymentUrl: string | null;
  error: InstallerErrorInfo | null;
};

export function getStepsForPlatform(platform: InstallerPlatform): InstallerStepId[] {
  const common: InstallerStepId[] = [
    "PLATFORM_SELECTION",
    "PREREQUISITE_CHECK",
    "AUTHENTICATION",
    "ACCOUNT_VALIDATION",
    "PROJECT_CONFIGURATION",
  ];

  if (platform === "cloudflare") {
    return [
      ...common,
      "DATABASE_CONFIGURATION",
      "SECURITY_CONFIGURATION",
      "ENVIRONMENT_CONFIGURATION",
      "DOMAIN_CONFIGURATION",
      "DEPLOYMENT_PREPARATION",
      "DEPLOYMENT",
      "DEPLOYMENT_MONITORING",
      "DATABASE_MIGRATION",
      "HEALTH_CHECK",
      "VERIFICATION",
      "COMPLETED",
    ];
  }

  return [
    ...common,
    "SECURITY_CONFIGURATION",
    "ENVIRONMENT_CONFIGURATION",
    "DOMAIN_CONFIGURATION",
    "DEPLOYMENT_PREPARATION",
    "DEPLOYMENT",
    "DEPLOYMENT_MONITORING",
    "HEALTH_CHECK",
    "VERIFICATION",
    "COMPLETED",
  ];
}

export function createInitialInstallerState(): InstallerState {
  return {
    installationId: crypto.randomUUID(),
    platform: null,
    steps: ["PLATFORM_SELECTION"],
    currentStepIndex: 0,
    completedSteps: [],
    status: "IDLE",
    prerequisites: [],
    credentials: null,
    formData: {},
    logs: [],
    createdResources: [],
    deploymentUrl: null,
    error: null,
  };
}
