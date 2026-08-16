import { VlessGenerator } from "./generators/vless.generator";
import { VmessGenerator } from "./generators/vmess.generator";
import { TrojanGenerator } from "./generators/trojan.generator";
import { ShadowsocksGenerator } from "./generators/shadowsocks.generator";
import { WireguardGenerator } from "./generators/wireguard.generator";
import type { ConfigProtocol } from "./types";

export const generators = {
  vless: new VlessGenerator(),
  vmess: new VmessGenerator(),
  trojan: new TrojanGenerator(),
  shadowsocks: new ShadowsocksGenerator(),
  wireguard: new WireguardGenerator(),
} as const;

export function getGenerator(protocol: ConfigProtocol) {
  const generator = generators[protocol];
  if (!generator) {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
  return generator;
}

export function nextAvailableConfigName(existingNames: string[], base = "DeJ config"): string {
  const usedNumbers = new Set(
    existingNames
      .map((name) => {
        const match = name.match(new RegExp(`^${base} (\\d+)$`));
        const captured = match?.[1];
        return captured ? parseInt(captured, 10) : null;
      })
      .filter((n): n is number => n !== null)
  );

  let candidate = 1;
  while (usedNumbers.has(candidate)) {
    candidate += 1;
  }
  return `${base} ${candidate}`;
}

export * from "./types";
