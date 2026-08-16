import type { InstallerPlatform, PrerequisiteCheck } from "./types";

async function checkHttps(): Promise<PrerequisiteCheck> {
  const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost";
  return {
    id: "https",
    title: "HTTPS",
    description: isSecure ? "Connection is secure." : "Installer must be served over HTTPS.",
    status: isSecure ? "PASS" : "FAIL",
    resolution: isSecure ? undefined : "Open the installer via its https:// GitHub Pages URL.",
  };
}

async function checkBrowserCapabilities(): Promise<PrerequisiteCheck> {
  const hasCrypto = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
  const hasFetch = typeof fetch !== "undefined";
  const ok = hasCrypto && hasFetch;
  return {
    id: "browser_capabilities",
    title: "Browser capabilities",
    description: ok ? "Browser supports required Web APIs." : "Browser is missing required Web APIs.",
    technicalDetail: `crypto.subtle=${hasCrypto} fetch=${hasFetch}`,
    status: ok ? "PASS" : "FAIL",
    resolution: ok ? undefined : "Use an up-to-date Chrome, Firefox, Safari, or Edge browser.",
  };
}

async function checkPlatformApiConnectivity(platform: InstallerPlatform): Promise<PrerequisiteCheck> {
  const url = platform === "cloudflare" ? "https://api.cloudflare.com/client/v4" : "https://backboard.railway.app/graphql/v2";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(url, { method: "OPTIONS", signal: controller.signal }).catch(() => null);
    clearTimeout(timeout);
    return {
      id: "platform_connectivity",
      title: platform === "cloudflare" ? "Cloudflare API reachability" : "Railway API reachability",
      description: "Network path to the platform API appears reachable.",
      status: "PASS",
    };
  } catch {
    return {
      id: "platform_connectivity",
      title: platform === "cloudflare" ? "Cloudflare API reachability" : "Railway API reachability",
      description: "Could not reach the platform API from this browser.",
      status: "WARNING",
      resolution: "Check your internet connection or any network/firewall restrictions.",
    };
  }
}

export async function runPrerequisiteChecks(platform: InstallerPlatform): Promise<PrerequisiteCheck[]> {
  const checks = await Promise.all([
    checkHttps(),
    checkBrowserCapabilities(),
    checkPlatformApiConnectivity(platform),
  ]);
  return checks;
}
