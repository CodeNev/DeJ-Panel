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
