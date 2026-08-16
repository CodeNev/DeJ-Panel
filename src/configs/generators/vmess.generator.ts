import { validateAddress, validatePort } from "../types";
import type { ConfigGenerator, ValidationResult } from "../types";

export type VmessParams = {
  uuid: string;
  address: string;
  port: number;
  name: string;
  security: "auto" | "aes-128-gcm" | "chacha20-poly1305" | "none";
  network: "tcp" | "ws" | "grpc" | "http";
  tls: boolean;
  sni?: string;
  host?: string;
  path?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class VmessGenerator implements ConfigGenerator<VmessParams> {
  readonly protocol = "vmess" as const;

  validate(params: VmessParams): ValidationResult {
    const errors: string[] = [];
    if (!UUID_REGEX.test(params.uuid)) errors.push("Invalid UUID format.");
    if (!validateAddress(params.address)) errors.push("Invalid address.");
    if (!validatePort(params.port)) errors.push("Invalid port.");
    if (params.network === "ws" && !params.path) errors.push("WebSocket network requires a path.");
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  generateUri(params: VmessParams): string {
    const validation = this.validate(params);
    if (!validation.valid) {
      throw new Error(`Invalid VMess configuration: ${validation.errors.join(", ")}`);
    }

    const payload = {
      v: "2",
      ps: params.name,
      add: params.address,
      port: String(params.port),
      id: params.uuid,
      aid: "0",
      scy: params.security,
      net: params.network,
      type: "none",
      host: params.host ?? "",
      path: params.path ?? "",
      tls: params.tls ? "tls" : "",
      sni: params.sni ?? "",
    };

    const json = JSON.stringify(payload);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return `vmess://${base64}`;
  }
}
