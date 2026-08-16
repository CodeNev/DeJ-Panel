export type ConfigProtocol = "vless" | "vmess" | "trojan" | "shadowsocks" | "wireguard";

export type BaseNodeTarget = {
  address: string;
  port: number;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

export function validatePort(port: number): boolean {
  return Number.isInteger(port) && port > 0 && port <= 65535;
}

export function validateAddress(address: string): boolean {
  if (!address || address.length > 253) return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostname = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
  return ipv4.test(address) || hostname.test(address) || address.includes(":");
}

export function encodeUriComponentStrict(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export interface ConfigGenerator<TParams> {
  readonly protocol: ConfigProtocol;
  validate(params: TParams): ValidationResult;
  generateUri(params: TParams): string;
}
