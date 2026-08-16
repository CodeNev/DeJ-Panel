import { encodeUriComponentStrict, validateAddress, validatePort } from "../types";
import type { ConfigGenerator, ValidationResult } from "../types";

export type ShadowsocksParams = {
  password: string;
  address: string;
  port: number;
  name: string;
  method:
    | "aes-128-gcm"
    | "aes-256-gcm"
    | "chacha20-ietf-poly1305"
    | "2022-blake3-aes-128-gcm"
    | "2022-blake3-aes-256-gcm";
  plugin?: string;
  pluginOpts?: string;
};

export class ShadowsocksGenerator implements ConfigGenerator<ShadowsocksParams> {
  readonly protocol = "shadowsocks" as const;

  validate(params: ShadowsocksParams): ValidationResult {
    const errors: string[] = [];
    if (!params.password) errors.push("Password is required.");
    if (!validateAddress(params.address)) errors.push("Invalid address.");
    if (!validatePort(params.port)) errors.push("Invalid port.");
    return errors.length ? { valid: false, errors } : { valid: true };
  }

  generateUri(params: ShadowsocksParams): string {
    const validation = this.validate(params);
    if (!validation.valid) {
      throw new Error(`Invalid Shadowsocks configuration: ${validation.errors.join(", ")}`);
    }

    const userInfo = btoa(`${params.method}:${params.password}`);
    const query = new URLSearchParams();
    if (params.plugin) {
      query.set("plugin", params.pluginOpts ? `${params.plugin};${params.pluginOpts}` : params.plugin);
    }

    const fragment = encodeUriComponentStrict(params.name);
    const queryString = query.toString();
    return `ss://${userInfo}@${params.address}:${params.port}${queryString ? `?${queryString}` : ""}#${fragment}`;
  }
}
