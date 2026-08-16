import { providerFetch } from "../http-client";
import {
  ProviderError,
  type AccountInfo,
  type DatabaseInfo,
  type DeploymentInfo,
  type DeploymentLogLine,
  type DeploymentProvider,
  type DeploymentStatus,
  type DomainStatus,
  type EnvironmentVariables,
  type HealthCheckResult,
  type NewProjectOptions,
  type PlatformId,
  type ProjectInfo,
  type ProviderCapabilities,
  type ProviderCredentials,
  type SecretVariables,
} from "../types";

const RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.app/graphql/v2";

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

function mapRailwayStatus(status: string): DeploymentStatus {
  const upper = status.toUpperCase();
  if (["SUCCESS", "FAILED", "CANCELLED", "QUEUED", "BUILDING", "DEPLOYING"].includes(upper)) {
    return upper as DeploymentStatus;
  }
  if (upper === "REMOVED" || upper === "SKIPPED") return "CANCELLED";
  if (upper === "INITIALIZING" || upper === "WAITING") return "QUEUED";
  return "QUEUED";
}

export class RailwayProvider implements DeploymentProvider {
  readonly platformId: PlatformId = "railway";
  readonly capabilities: ProviderCapabilities = {
    supportsD1: false,
    supportsWorkers: false,
    supportsServices: true,
    supportsSecrets: true,
    supportsVariables: true,
    supportsCustomDomains: true,
    supportsLogs: true,
    supportsHealthCheck: true,
    supportsRollback: false,
    supportsDockerBuild: true,
  };

  private apiToken = "";
  private accountId = "";

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    this.apiToken = credentials.apiToken;
    const valid = await this.validateCredentials();
    if (!valid) {
      throw new ProviderError("PLATFORM_AUTH_FAILED", "Invalid Railway API token.");
    }
  }

  private async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await providerFetch<GraphQLResponse<T>>(RAILWAY_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiToken}` },
      body: { query, variables },
    });
    if (res.errors?.length) {
      throw new ProviderError("PLATFORM_API_FAILED", res.errors.map((e) => e.message).join("; "));
    }
    if (!res.data) {
      throw new ProviderError("PLATFORM_API_FAILED", "Empty response from Railway API.");
    }
    return res.data;
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.graphql<{ me: { id: string } }>(`query { me { id } }`);
      return true;
    } catch {
      return false;
    }
  }

  async getAccount(): Promise<AccountInfo> {
    const data = await this.graphql<{ me: { id: string; name: string; email: string } }>(
      `query { me { id name email } }`
    );
    this.accountId = data.me.id;
    return { id: data.me.id, name: data.me.name, email: data.me.email };
  }

  async getProjects(): Promise<ProjectInfo[]> {
    const data = await this.graphql<{
      projects: { edges: { node: { id: string; name: string; createdAt: string } }[] };
    }>(`query { projects { edges { node { id name createdAt } } } }`);
    return data.projects.edges.map((e) => ({ id: e.node.id, name: e.node.name, createdAt: e.node.createdAt }));
  }

  async createProject(options: NewProjectOptions): Promise<ProjectInfo> {
    const data = await this.graphql<{ projectCreate: { id: string; name: string; createdAt: string } }>(
      `mutation($name: String!) { projectCreate(input: { name: $name }) { id name createdAt } }`,
      { name: options.name }
    );
    return { id: data.projectCreate.id, name: data.projectCreate.name, createdAt: data.projectCreate.createdAt };
  }

  async getProject(projectId: string): Promise<ProjectInfo> {
    const data = await this.graphql<{ project: { id: string; name: string; createdAt: string } }>(
      `query($id: String!) { project(id: $id) { id name createdAt } }`,
      { id: projectId }
    );
    return { id: data.project.id, name: data.project.name, createdAt: data.project.createdAt };
  }

  async updateProject(projectId: string, options: Partial<NewProjectOptions>): Promise<ProjectInfo> {
    const data = await this.graphql<{ projectUpdate: { id: string; name: string; createdAt: string } }>(
      `mutation($id: String!, $name: String) { projectUpdate(id: $id, input: { name: $name }) { id name createdAt } }`,
      { id: projectId, name: options.name }
    );
    return { id: data.projectUpdate.id, name: data.projectUpdate.name, createdAt: data.projectUpdate.createdAt };
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.graphql(`mutation($id: String!) { projectDelete(id: $id) }`, { id: projectId });
  }

  async createDatabase(_name: string): Promise<DatabaseInfo> {
    throw new ProviderError(
      "PLATFORM_UNSUPPORTED_OPERATION",
      "Railway does not provide D1. Use a Railway-hosted database plugin instead."
    );
  }

  async configureDatabase(_projectId: string, _databaseId: string): Promise<void> {
    throw new ProviderError("PLATFORM_UNSUPPORTED_OPERATION", "Not applicable for Railway.");
  }

  async configureEnvironment(projectId: string, vars: EnvironmentVariables): Promise<void> {
    await this.graphql(
      `mutation($projectId: String!, $variables: ServiceVariablesUpsertInput!) {
        variableCollectionUpsert(input: { projectId: $projectId, variables: $variables })
      }`,
      { projectId, variables: vars }
    );
  }

  async configureSecrets(projectId: string, secrets: SecretVariables): Promise<void> {
    await this.configureEnvironment(projectId, secrets);
  }

  async deploy(projectId: string): Promise<DeploymentInfo> {
    const data = await this.graphql<{ serviceInstanceDeploy: string }>(
      `mutation($serviceId: String!) { serviceInstanceDeploy(serviceId: $serviceId) }`,
      { serviceId: projectId }
    );
    return { id: data.serviceInstanceDeploy, status: "QUEUED", url: null, createdAt: new Date().toISOString() };
  }

  async getDeployment(_projectId: string, deploymentId: string): Promise<DeploymentInfo> {
    const data = await this.graphql<{
      deployment: { id: string; status: string; url: string | null; createdAt: string };
    }>(`query($id: String!) { deployment(id: $id) { id status url createdAt } }`, { id: deploymentId });
    return {
      id: data.deployment.id,
      status: mapRailwayStatus(data.deployment.status),
      url: data.deployment.url,
      createdAt: data.deployment.createdAt,
    };
  }

  async getDeploymentLogs(_projectId: string, deploymentId: string): Promise<DeploymentLogLine[]> {
    const data = await this.graphql<{
      deploymentLogs: { timestamp: string; severity: string; message: string }[];
    }>(
      `query($deploymentId: String!) { deploymentLogs(deploymentId: $deploymentId) { timestamp severity message } }`,
      { deploymentId }
    );
    return data.deploymentLogs.map((l) => ({
      timestamp: l.timestamp,
      level: (l.severity?.toUpperCase() as DeploymentLogLine["level"]) ?? "INFO",
      message: l.message,
    }));
  }

  async getDomain(projectId: string): Promise<DomainStatus | null> {
    const data = await this.graphql<{ domains: { serviceDomains: { domain: string }[] } }>(
      `query($projectId: String!) { domains(projectId: $projectId) { serviceDomains { domain } } }`,
      { projectId }
    );
    const domain = data.domains.serviceDomains[0];
    if (!domain) return null;
    return { domain: domain.domain, verified: true, httpsActive: true };
  }

  async configureDomain(projectId: string, _domain: string): Promise<DomainStatus> {
    const data = await this.graphql<{ serviceDomainCreate: { domain: string } }>(
      `mutation($projectId: String!) { serviceDomainCreate(input: { projectId: $projectId }) { domain } }`,
      { projectId }
    );
    return { domain: data.serviceDomainCreate.domain, verified: true, httpsActive: true };
  }

  async healthCheck(url: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(url, { method: "GET" });
      return { healthy: response.ok, httpStatus: response.status, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, message: (err as Error).message };
    }
  }

  async rollback(_projectId: string, _deploymentId: string): Promise<DeploymentInfo> {
    throw new ProviderError("PLATFORM_UNSUPPORTED_OPERATION", "Railway rollback requires manual redeploy of a prior deployment.");
  }

  async redeploy(projectId: string): Promise<DeploymentInfo> {
    return this.deploy(projectId);
  }

  async destroy(projectId: string): Promise<void> {
    await this.deleteProject(projectId);
  }
}
