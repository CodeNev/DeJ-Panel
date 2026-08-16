const CF_API_BASE = "https://api.cloudflare.com/client/v4";

export type CfCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

async function cfCall<T>(
  url: string,
  apiToken: string,
  init?: RequestInit
): Promise<CfCallResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const body = (await res.json()) as { success: boolean; result: T; errors?: { message: string }[] };
    if (!res.ok || !body.success) {
      const message = body.errors?.map((e) => e.message).join("; ") ?? `HTTP ${res.status}`;
      return { ok: false, code: res.status === 429 ? "PLATFORM_RATE_LIMITED" : "PLATFORM_API_FAILED", message };
    }
    return { ok: true, data: body.result };
  } catch (err) {
    return { ok: false, code: "CORS_BLOCKED", message: (err as Error).message || "Network request failed." };
  }
}

export async function cfCreateD1Database(
  apiToken: string,
  accountId: string,
  name: string
): Promise<CfCallResult<{ uuid: string; name: string }>> {
  return cfCall(`${CF_API_BASE}/accounts/${accountId}/d1/database`, apiToken, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function cfListD1Databases(
  apiToken: string,
  accountId: string
): Promise<CfCallResult<{ uuid: string; name: string }[]>> {
  return cfCall(`${CF_API_BASE}/accounts/${accountId}/d1/database`, apiToken);
}

export async function cfCheckWorkerNameAvailable(
  apiToken: string,
  accountId: string,
  name: string
): Promise<boolean> {
  const result = await cfCall<{ id: string }>(
    `${CF_API_BASE}/accounts/${accountId}/workers/scripts/${name}`,
    apiToken
  );
  return !result.ok;
}

const WORKER_BUNDLE_URL = "https://raw.githubusercontent.com/CodeNev/DeJ-Panel/main/dist/worker-bundle.js";
const MIGRATION_URL = "https://raw.githubusercontent.com/CodeNev/DeJ-Panel/main/migrations/0001_initial_schema.sql";

export async function fetchWorkerBundleSource(): Promise<CfCallResult<string>> {
  try {
    const res = await fetch(WORKER_BUNDLE_URL, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, code: "PLATFORM_NOT_FOUND", message: `Could not fetch worker bundle (HTTP ${res.status}). It may not have been published by CI yet.` };
    }
    const text = await res.text();
    return { ok: true, data: text };
  } catch (err) {
    return { ok: false, code: "CORS_BLOCKED", message: (err as Error).message || "Failed to fetch worker bundle." };
  }
}

export async function fetchInitialMigrationSql(): Promise<CfCallResult<string>> {
  try {
    const res = await fetch(MIGRATION_URL, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, code: "PLATFORM_NOT_FOUND", message: `Could not fetch migration SQL (HTTP ${res.status}).` };
    }
    const text = await res.text();
    return { ok: true, data: text };
  } catch (err) {
    return { ok: false, code: "CORS_BLOCKED", message: (err as Error).message || "Failed to fetch migration SQL." };
  }
}

export async function cfUploadWorkerModule(
  apiToken: string,
  accountId: string,
  scriptName: string,
  moduleSource: string,
  databaseId: string
): Promise<CfCallResult<{ id: string }>> {
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2025-01-01",
    compatibility_flags: ["nodejs_compat"],
    bindings: [
      { type: "d1", name: "DB", id: databaseId },
      { type: "plain_text", name: "APP_ENV", text: "production" },
      { type: "plain_text", name: "APP_VERSION", text: "0.1.0" },
      { type: "plain_text", name: "DEPLOYMENT_PLATFORM", text: "cloudflare" },
    ],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new Blob([moduleSource], { type: "application/javascript+module" }), "worker.js");

  try {
    const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
    });
    const body = (await res.json()) as { success: boolean; result: { id: string }; errors?: { message: string }[] };
    if (!res.ok || !body.success) {
      const message = body.errors?.map((e) => e.message).join("; ") ?? `HTTP ${res.status}`;
      return { ok: false, code: "PLATFORM_API_FAILED", message };
    }
    return { ok: true, data: body.result };
  } catch (err) {
    return { ok: false, code: "CORS_BLOCKED", message: (err as Error).message || "Failed to upload worker script." };
  }
}

export async function cfEnableWorkersDevSubdomain(
  apiToken: string,
  accountId: string,
  scriptName: string
): Promise<CfCallResult<{ enabled: boolean }>> {
  return cfCall(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`, apiToken, {
    method: "POST",
    body: JSON.stringify({ enabled: true }),
  });
}

export async function cfGetAccountWorkersSubdomain(
  apiToken: string,
  accountId: string
): Promise<CfCallResult<{ subdomain: string }>> {
  return cfCall(`${CF_API_BASE}/accounts/${accountId}/workers/subdomain`, apiToken);
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

export async function cfRunD1Migration(
  apiToken: string,
  accountId: string,
  databaseId: string,
  sql: string
): Promise<CfCallResult<{ statementsRun: number }>> {
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    const result = await cfCall<unknown>(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`, apiToken, {
      method: "POST",
      body: JSON.stringify({ sql: statement }),
    });
    if (!result.ok) {
      return { ok: false, code: result.code, message: `Migration failed on statement: ${statement.slice(0, 60)}... — ${result.message}` };
    }
  }
  return { ok: true, data: { statementsRun: statements.length } };
}


