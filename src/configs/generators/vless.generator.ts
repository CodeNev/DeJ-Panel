import { encodeUriComponentStrict, validateAddress, validatePort } from "../types";
import type { ConfigGenerator, ValidationResult } from "../types";

export type VlessParams = {
  uuid: string;
  address: string;
  port: number;
  name: string;
  encryption?: "none";
  security: "none" | "tls" | "reality";
  network: "tcp" | "ws" | "grpc" | "http";
  sni?: string;
  fingerprint?: string;
  publicKey?: string;
  shortId?: string;
  flow?: string;
  path?: string;
  host?: string;
  serviceName?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class VlessGenerator implements ConfigGenerator<VlessParams> {
  readonly protocol = "vless" as const;

  validate(params: VlessParams): ValidationResult {
    const errors: string[] = [];

    if (!UUID_REGEX.test(params.uuid)) errors.push("Invalid UUID format.");
    if (!validateAddress(params.address)) errors.push("Invalid address.");
    if (!validatePort(params.port)) errors.push("Invalid port.");
    if (params.security === "reality" && (!params.publicKey || !params.shortId)) {
      errors.push("Reality security requires publicKey and shortId.");
    }
    if (params.network === "ws" && !params.path) errors.push("WebSocket network requires a path.");
    if (params.network === "grpc" && !params.serviceName) errors.push("gRPC network requires a serviceName.");

    return errors.length ? { valid: false, errors } : { valid: true };
  }

  generateUri(params: VlessParams): string {
    const validation = this.validate(params);
    if (!validation.valid) {
      throw new Error(`Invalid VLESS configuration: ${validation.errors.join(", ")}`);
    }

    const query = new URLSearchParams();
    query.set("encryption", params.encryption ?? "none");
    query.set("security", params.security);
    query.set("type", params.network);

    if (params.sni) query.set("sni", params.sni);
    if (params.fingerprint) query.set("fp", params.fingerprint);
    if (params.security === "reality") {
      if (params.publicKey) query.set("pbk", params.publicKey);
      if (params.shortId) query.set("sid", params.shortId);
    }
    if (params.flow) query.set("flow", params.flow);
    if (params.network === "ws") {
      if (params.path) query.set("path", params.path);
      if (params.host) query.set("host", params.host);
    }
    if (params.network === "grpc" && params.serviceName) {
      query.set("serviceName", params.serviceName);
    }

    const fragment = encodeUriComponentStrict(params.name);
    return `vless://${params.uuid}@${params.address}:${params.port}?${query.toString()}#${fragment}`;
  }
}
