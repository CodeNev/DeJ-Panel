export async function waitForWorkerHealthy(url: string, maxAttempts = 10): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/health`, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      // Deployment propagation can take a few seconds/minutes; keep retrying.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * Math.min(attempt + 1, 4)));
  }
  return false;
}

export async function createAdminAccount(
  panelUrl: string,
  username: string,
  password: string
): Promise<{ ok: true; data: { userId: string } } | { ok: false; code: string; message: string }> {
  try {
    const res = await fetch(`${panelUrl.replace(/\/$/, "")}/api/install/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = (await res.json()) as {
      success: boolean;
      data?: { userId: string };
      error?: { code: string; message: string };
    };
    if (!body.success || !body.data) {
      return { ok: false, code: body.error?.code ?? "AUTH_INVALID", message: body.error?.message ?? "Failed to create admin account." };
    }
    return { ok: true, data: body.data };
  } catch (err) {
    return { ok: false, code: "PLATFORM_API_FAILED", message: (err as Error).message || "Failed to reach the deployed panel." };
  }
}
