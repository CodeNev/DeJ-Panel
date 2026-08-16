const CF_API_BASE = "https://api.cloudflare.com/client/v4";

export type CloudflareAuthResult =
  | { ok: true; accountId: string; accountName: string }
  | { ok: false; reason: "INVALID_TOKEN" | "CORS_BLOCKED" | "NETWORK_ERROR"; message: string };

export async function verifyCloudflareTokenFromBrowser(apiToken: string): Promise<CloudflareAuthResult> {
  try {
    const verifyRes = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!verifyRes.ok) {
      if (verifyRes.status === 401 || verifyRes.status === 403) {
        return { ok: false, reason: "INVALID_TOKEN", message: "Cloudflare rejected this API token." };
      }
      return { ok: false, reason: "NETWORK_ERROR", message: `Cloudflare API returned status ${verifyRes.status}.` };
    }

    const verifyBody = (await verifyRes.json()) as { success: boolean };
    if (!verifyBody.success) {
      return { ok: false, reason: "INVALID_TOKEN", message: "Cloudflare rejected this API token." };
    }

    const accountsRes = await fetch(`${CF_API_BASE}/accounts`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const accountsBody = (await accountsRes.json()) as {
      success: boolean;
      result: { id: string; name: string }[];
    };

    const account = accountsBody.result?.[0];
    if (!account) {
      return { ok: false, reason: "INVALID_TOKEN", message: "Token is valid but has no accessible account." };
    }

    return { ok: true, accountId: account.id, accountName: account.name };
  } catch (err) {
    const message = (err as Error).message ?? "";
    const looksLikeCors = message.toLowerCase().includes("fetch") || message.toLowerCase().includes("failed");
    return {
      ok: false,
      reason: looksLikeCors ? "CORS_BLOCKED" : "NETWORK_ERROR",
      message:
        "Direct browser calls to the Cloudflare API were blocked. This can happen due to CORS restrictions on some Cloudflare endpoints; if this persists, DeJ Panel needs its lightweight relay Worker for this step instead of calling Cloudflare directly from GitHub Pages.",
    };
  }
}

export function buildCloudflareTokenCreationUrl(): string {
  return "https://dash.cloudflare.com/profile/api-tokens";
}

export const REQUIRED_CLOUDFLARE_PERMISSIONS = [
  "Account.Workers Scripts:Edit",
  "Account.D1:Edit",
  "Account.Account Settings:Read",
  "User.User Details:Read",
];
