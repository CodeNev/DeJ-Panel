import { encodeUriComponentStrict, validateAddress, validatePort } from "../types";
import type { ConfigGenerator, ValidationResult } from "../types";

export type TrojanParams = {
  password: string;
  address: string;
  port: number;
  name: string;
  sni?: string;
  fingerprint?: string;
  network: "tcp" | "ws" | "grpc";
  path?: string;
  host?: string;
  serviceName?: string;
};

export class TrojanGenerator implements ConfigGenerator<TrojanParams> {
  readonly protocol = "trojan" as const;

  validate(params: TrojanParams): ValidationResult {
    const errors: string[] = [];
    if (!params.password || params.password.length < 8) errors.push("Password must be at least 8 characters.");
    if (!validateAddress(params.address)) errors.push("Invalid address.");
    if (!validatePort(params.port)) errors.push("Invalid port.");
    if (params.network === "ws" && !params.path) errors.push("WebSocket network requires a path.");
    if (params.network === "grpc" && !params.serviceName) errors.push("gRPC network requires a serviceName.");
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  generateUri(params: TrojanParams): string {
    const validation = this.validate(params);
    if (!validation.valid) {
      throw new Error(`Invalid Trojan configuration: ${validation.errors.join(", ")}`);
    }

    const query = new URLSearchParams();
    query.set("type", params.network);
    query.set("security", "tls");
    if (params.sni) query.set("sni", params.sni);
    if (params.fingerprint) query.set("fp", params.fingerprint);
    if (params.network === "ws") {
      if (params.path) query.set("path", params.path);
      if (params.host) query.set("host", params.host);
    }
    if (params.network === "grpc" && params.serviceName) {
      query.set("serviceName", params.serviceName);
    }

    const fragment = encodeUriComponentStrict(params.name);
    const encodedPassword = encodeUriComponentStrict(params.password);
    return `trojan://${encodedPassword}@${params.address}:${params.port}?${query.toString()}#${fragment}`;
  }
}
