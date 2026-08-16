import { validateAddress, validatePort } from "../types";
import type { ConfigGenerator, ValidationResult } from "../types";

export type WireguardParams = {
  privateKey: string;
  publicKey: string;
  address: string;
  dns?: string;
  endpoint: string;
  endpointPort: number;
  allowedIps?: string;
  mtu?: number;
  persistentKeepalive?: number;
  name: string;
};

const BASE64_KEY_REGEX = /^[A-Za-z0-9+/]{42,44}={0,2}$/;

export class WireguardGenerator implements ConfigGenerator<WireguardParams> {
  readonly protocol = "wireguard" as const;

  validate(params: WireguardParams): ValidationResult {
    const errors: string[] = [];
    if (!BASE64_KEY_REGEX.test(params.privateKey)) errors.push("Invalid private key format.");
    if (!BASE64_KEY_REGEX.test(params.publicKey)) errors.push("Invalid public key format.");
    if (!validateAddress(params.endpoint)) errors.push("Invalid endpoint address.");
    if (!validatePort(params.endpointPort)) errors.push("Invalid endpoint port.");
    if (params.mtu && (params.mtu < 576 || params.mtu > 9000)) errors.push("MTU out of valid range.");
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  generateUri(params: WireguardParams): string {
    const validation = this.validate(params);
    if (!validation.valid) {
      throw new Error(`Invalid WireGuard configuration: ${validation.errors.join(", ")}`);
    }

    const lines = [
      "[Interface]",
      `PrivateKey = ${params.privateKey}`,
      `Address = ${params.address}`,
      params.dns ? `DNS = ${params.dns}` : null,
      params.mtu ? `MTU = ${params.mtu}` : null,
      "",
      "[Peer]",
      `PublicKey = ${params.publicKey}`,
      `Endpoint = ${params.endpoint}:${params.endpointPort}`,
      `AllowedIPs = ${params.allowedIps ?? "0.0.0.0/0, ::/0"}`,
      params.persistentKeepalive ? `PersistentKeepalive = ${params.persistentKeepalive}` : null,
    ].filter((line): line is string => line !== null);

    return lines.join("\n");
  }

  generateSecureKeypairPlaceholder(): { note: string } {
    return {
      note: "WireGuard keys must be generated with Curve25519 (wg genkey / wg pubkey). Browser/Workers do not implement X25519 keygen natively; use a dedicated crypto library server-side before calling this generator.",
    };
  }
}
