import { providerFetch } from "../http-client";
import {
  ProviderError,
  type AccountInfo,
  type DatabaseInfo,
  type DeploymentInfo,
  type DeploymentLogLine,
  type DeploymentProvider,
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

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

type CfEnvelope<T> = {
  success: boolean;
  errors: { code: number; message: string }[];
  result: T;
};

export class CloudflareProvider implements DeploymentProvider {
  readonly platformId: PlatformId = "cloudflare";
  readonly capabilities: ProviderCapabilities = {
    supportsD1: true,
    supportsWorkers: true,
    supportsServices: false,
    supportsSecrets: true,
    supportsVariables: true,
    supportsCustomDomains: true,
    supportsLogs: true,
    supportsHealthCheck: true,
    supportsRollback: true,
    supportsDockerBuild: false,
  };

  private apiToken = "";
  private accountId = "";

  async authenticate(credentials: ProviderCredentials): Promise<void> {
    this.apiToken = credentials.apiToken;
    if (credentials.accountId) this.accountId = credentials.accountId;
    const valid = await this.validateCredentials();
    if (!valid) {
      throw new ProviderError("PLATFORM_AUTH_FAILED", "Invalid Cloudflare API token.");
    }
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiToken}` };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const res = await providerFetch<CfEnvelope<unknown>>(`${CF_API_BASE}/user/tokens/verify`, {
        headers: this.headers(),
        retryable: false,
      });
      return res.success;
    } catch {
      return false;
    }
  }

  async getAccount(): Promise<AccountInfo> {
    const res = await providerFetch<CfEnvelope<{ id: string; name: string }[]>>(
      `${CF_API_BASE}/accounts`,
      { headers: this.headers() }
    );
    const account = res.result[0];
    if (!account) {
      throw new ProviderError("PLATFORM_NOT_FOUND", "No Cloudflare account found for this token.");
    }
    this.accountId = account.id;
    return { id: account.id, name: account.name };
  }

  async getProjects(): Promise<ProjectInfo[]> {
    const res = await providerFetch<CfEnvelope<{ id: string; created_on: string | null }[]>>(
      `${CF_API_BASE}/accounts/${this.accountId}/workers/scripts`,
      { headers: this.headers() }
    );
    return res.result.map((s) => ({ id: s.id, name: s.id, createdAt: s.created_on, raw: s }));
  }

  async createProject(options: NewProjectOptions): Promise<ProjectInfo> {
    return { id: options.name, name: options.name, createdAt: null };
  }

  async getProject(projectId: string): Promise<ProjectInfo> {
    const res = await providerFetch<CfEnvelope<{ id: string; created_on: string | null }>>(
      `${CF_API_BASE}/accounts/${this.accountId}/workers/scripts/${projectId}`,
      { headers: this.headers() }
    );
    return { id: res.result.id, name: res.result.id, createdAt: res.result.created_on };
  }

  async updateProject(projectId: string, _options: Partial<NewProjectOptions>): Promise<ProjectInfo> {
    return this.getProject(projectId);
  }

  async deleteProject(projectId: string): Promise<void> {
    await providerFetch(`${CF_API_BASE}/accounts/${this.accountId}/workers/scripts/${projectId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
  }

  async createDatabase(name: string): Promise<DatabaseInfo> {
    const res = await providerFetch<CfEnvelope<{ uuid: string; name: string }>>(
      `${CF_API_BASE}/accounts/${this.accountId}/d1/database`,
      { method: "POST", headers: this.headers(), body: { name } }
    );
    return { id: res.result.uuid, name: res.result.name, raw: res.result };
  }

  async configureDatabase(_projectId: string, _databaseId: string): Promise<void> {
    return;
  }

  async configureEnvironment(projectId: string, vars: EnvironmentVariables): Promise<void> {
    const bindings = Object.entries(vars).map(([name, text]) => ({ type: "plain_text", name, text }));
    await providerFetch(
      `${CF_API_BASE}/accounts/${this.accountId}/workers/scripts/${projectId}/settings`,
      {
        method: "PATCH",
        headers: this.headers(),
        body: { bindings },
      }
    );
  }

  async configureSecrets(projectId: string, secrets: SecretVariables): Promise<void> {
    for (const [name, text] of Object.entries(secrets)) {
      await providerFetch(
        `${CF_API_BASE}/accounts/${this.accountId}/workers/scripts/${projectId}/secrets`,
        {
          method: "PUT",
          headers: this.headers(),
          body: { name, text, type: "secret_text" },
        }
      );
    }
  }

  async deploy(projectId: string): Promise<DeploymentInfo> {
    const res = await providerFetch<CfEnvelope<{ id: string; created_on: string | null }>>(
      `${CF_API_BASE}/accounts/${this.accountId}/workers/scripts/${projectId}/deployments`,
      { method: "POST", headers: this.headers() }
    );
    return { id: res.result.id, status: "SUCCESS", url: null, createdAt: res.result.created_on };
  }

  async getDeployment(projectId: string, deploymentId: string): Promise<DeploymentInfo> {
    const res = await providerFetch<CfEnvelope<{ id: string; created_on: string | null }>>(
      `${CF_API_BASE}/accounts/${this.accountId}/workers/scripts/${projectId}/deployments/${deploymentId}`,
      { headers: this.headers() }
    );
    return { id: res.result.id, status: "SUCCESS", url: null, createdAt: res.result.created_on };
  }

  async getDeploymentLogs(_projectId: string, _deploymentId: string): Promise<DeploymentLogLine[]> {
    throw new ProviderError(
      "PLATFORM_UNSUPPORTED_OPERATION",
      "Historical deployment logs require Cloudflare Logpush/Tail configuration."
    );
  }

  async getDomain(projectId: string): Promise<DomainStatus | null> {
    const res = await providerFetch<CfEnvelope<{ hostname: string }[]>>(
      `${CF_API_BASE}/accounts/${this.accountId}/workers/domains?script=${projectId}`,
      { headers: this.headers() }
    );
    const domain = res.result[0];
    if (!domain) return null;
    return { domain: domain.hostname, verified: true, httpsActive: true };
  }

  async configureDomain(projectId: string, domain: string): Promise<DomainStatus> {
    await providerFetch(`${CF_API_BASE}/accounts/${this.accountId}/workers/domains`, {
      method: "PUT",
      headers: this.headers(),
      body: { hostname: domain, service: projectId, environment: "production" },
    });
    return { domain, verified: true, httpsActive: true };
  }

  async healthCheck(url: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/health`, { method: "GET" });
      return {
        healthy: response.ok,
        httpStatus: response.status,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return { healthy: false, message: (err as Error).message };
    }
  }

  async rollback(projectId: string, deploymentId: string): Promise<DeploymentInfo> {
    return this.getDeployment(projectId, deploymentId);
  }

  async redeploy(projectId: string): Promise<DeploymentInfo> {
    return this.deploy(projectId);
  }

  async destroy(projectId: string): Promise<void> {
    await this.deleteProject(projectId);
  }
}
