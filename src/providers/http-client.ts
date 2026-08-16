import { ProviderError, type ProviderErrorCode } from "./types";

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

export type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retryable?: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapHttpStatusToErrorCode(status: number): ProviderErrorCode {
  if (status === 401 || status === 403) return "PLATFORM_AUTH_FAILED";
  if (status === 404) return "PLATFORM_NOT_FOUND";
  if (status === 429) return "PLATFORM_RATE_LIMITED";
  return "PLATFORM_API_FAILED";
}

export async function providerFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS, retryable = true } = options;

  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt <= (retryable ? MAX_RETRIES : 0); attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        const text = await response.text().catch(() => "");
        const err = new ProviderError(code, `Request failed with status ${response.status}`, code === "PLATFORM_RATE_LIMITED", text);

        if (code === "PLATFORM_RATE_LIMITED" && attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get("Retry-After");
          const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : BASE_BACKOFF_MS * 2 ** attempt;
          await sleep(waitMs);
          lastError = err;
          continue;
        }

        throw err;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return (await response.json()) as T;
      }
      return (await response.text()) as unknown as T;
    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof ProviderError) {
        throw err;
      }

      if ((err as Error).name === "AbortError") {
        lastError = new ProviderError("PLATFORM_TIMEOUT", "Request timed out.", true);
      } else {
        lastError = new ProviderError("PLATFORM_API_FAILED", (err as Error).message, true);
      }

      if (attempt < MAX_RETRIES && retryable) {
        await sleep(BASE_BACKOFF_MS * 2 ** attempt);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new ProviderError("PLATFORM_API_FAILED", "Request failed after retries.", false);
}
