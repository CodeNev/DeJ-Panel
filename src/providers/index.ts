import { CloudflareProvider } from "./cloudflare/cloudflare.provider";
import { RailwayProvider } from "./railway/railway.provider";
import type { DeploymentProvider, PlatformId } from "./types";

export function createProvider(platformId: PlatformId): DeploymentProvider {
  switch (platformId) {
    case "cloudflare":
      return new CloudflareProvider();
    case "railway":
      return new RailwayProvider();
    default: {
      const exhaustiveCheck: never = platformId;
      throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
    }
  }
}

export * from "./types";
