import { describe, it, expect } from "vitest";
import { createProvider } from "../src/providers";

describe("provider factory", () => {
  it("creates a Cloudflare provider with D1 capability", () => {
    const provider = createProvider("cloudflare");
    expect(provider.platformId).toBe("cloudflare");
    expect(provider.capabilities.supportsD1).toBe(true);
    expect(provider.capabilities.supportsServices).toBe(false);
  });

  it("creates a Railway provider without D1 capability", () => {
    const provider = createProvider("railway");
    expect(provider.platformId).toBe("railway");
    expect(provider.capabilities.supportsD1).toBe(false);
    expect(provider.capabilities.supportsServices).toBe(true);
  });

  it("rejects unsupported platform ids at runtime", () => {
    expect(() => createProvider("unknown" as never)).toThrow();
  });
});
