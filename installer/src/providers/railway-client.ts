const RAILWAY_API = "https://backboard.railway.app/graphql/v2";
const REPO_FULL_NAME = "CodeNev/DeJ-Panel";

export type RwCallResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function rwCall<T>(apiToken: string, query: string, variables?: Record<string, unknown>): Promise<RwCallResult<T>> {
  try {
    const res = await fetch(RAILWAY_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };

    if (!res.ok || body.errors?.length) {
      const message = body.errors?.map((e) => e.message).join("; ") ?? `HTTP ${res.status}`;
      return { ok: false, code: res.status === 401 || res.status === 403 ? "PLATFORM_AUTH_FAILED" : "PLATFORM_API_FAILED", message };
    }

    if (!body.data) {
      return { ok: false, code: "PLATFORM_API_FAILED", message: "Empty response from Railway API." };
    }

    return { ok: true, data: body.data };
  } catch (err) {
    return { ok: false, code: "CORS_BLOCKED", message: (err as Error).message || "Network request failed." };
  }
}

export async function rwVerifyToken(apiToken: string): Promise<RwCallResult<{ id: string; name: string; email: string }>> {
  const result = await rwCall<{ me: { id: string; name: string; email: string } }>(
    apiToken,
    `query { me { id name email } }`
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.me };
}

export async function rwCreateProject(apiToken: string, name: string): Promise<RwCallResult<{ id: string; name: string }>> {
  const result = await rwCall<{ projectCreate: { id: string; name: string } }>(
    apiToken,
    `mutation($name: String!) { projectCreate(input: { name: $name }) { id name } }`,
    { name }
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.projectCreate };
}

export async function rwCreateServiceFromRepo(
  apiToken: string,
  projectId: string,
  serviceName: string
): Promise<RwCallResult<{ id: string; name: string }>> {
  const result = await rwCall<{ serviceCreate: { id: string; name: string } }>(
    apiToken,
    `mutation($projectId: String!, $name: String!, $repo: String!) {
      serviceCreate(input: { projectId: $projectId, name: $name, source: { repo: $repo } }) {
        id
        name
      }
    }`,
    { projectId, name: serviceName, repo: REPO_FULL_NAME }
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.serviceCreate };
}

export async function rwSetVariables(
  apiToken: string,
  projectId: string,
  serviceId: string,
  variables: Record<string, string>
): Promise<RwCallResult<{ upserted: boolean }>> {
  const result = await rwCall<{ variableCollectionUpsert: boolean }>(
    apiToken,
    `mutation($projectId: String!, $serviceId: String!, $variables: ServiceVariablesUpsertInput!) {
      variableCollectionUpsert(input: { projectId: $projectId, serviceId: $serviceId, variables: $variables })
    }`,
    { projectId, serviceId, variables }
  );
  if (!result.ok) return result;
  return { ok: true, data: { upserted: result.data.variableCollectionUpsert } };
}

export async function rwGetDefaultEnvironmentId(apiToken: string, projectId: string): Promise<RwCallResult<string>> {
  const result = await rwCall<{ project: { environments: { edges: { node: { id: string; name: string } }[] } } }>(
    apiToken,
    `query($id: String!) { project(id: $id) { environments { edges { node { id name } } } } }`,
    { id: projectId }
  );
  if (!result.ok) return result;
  const env = result.data.project.environments.edges.find((e) => e.node.name === "production") ?? result.data.project.environments.edges[0];
  if (!env) return { ok: false, code: "PLATFORM_NOT_FOUND", message: "No environment found for this Railway project." };
  return { ok: true, data: env.node.id };
}

export async function rwDeployService(
  apiToken: string,
  serviceId: string,
  environmentId: string
): Promise<RwCallResult<{ deploymentId: string | null }>> {
  const result = await rwCall<{ serviceInstanceDeployV2: string | null }>(
    apiToken,
    `mutation($serviceId: String!, $environmentId: String!) {
      serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    { serviceId, environmentId }
  );
  if (!result.ok) return result;
  return { ok: true, data: { deploymentId: result.data.serviceInstanceDeployV2 } };
}

export async function rwCreateDomain(
  apiToken: string,
  serviceId: string,
  environmentId: string
): Promise<RwCallResult<{ domain: string }>> {
  const result = await rwCall<{ serviceDomainCreate: { domain: string } }>(
    apiToken,
    `mutation($serviceId: String!, $environmentId: String!) {
      serviceDomainCreate(input: { serviceId: $serviceId, environmentId: $environmentId }) { domain }
    }`,
    { serviceId, environmentId }
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.serviceDomainCreate };
}

export async function rwGetDeploymentStatus(apiToken: string, deploymentId: string): Promise<RwCallResult<string>> {
  const result = await rwCall<{ deployment: { status: string } }>(
    apiToken,
    `query($id: String!) { deployment(id: $id) { status } }`,
    { id: deploymentId }
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.deployment.status };
}
