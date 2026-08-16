import { describe, it, expect } from "vitest";
import { VlessGenerator } from "../src/configs/generators/vless.generator";
import { VmessGenerator } from "../src/configs/generators/vmess.generator";
import { TrojanGenerator } from "../src/configs/generators/trojan.generator";
import { ShadowsocksGenerator } from "../src/configs/generators/shadowsocks.generator";
import { WireguardGenerator } from "../src/configs/generators/wireguard.generator";
import { nextAvailableConfigName } from "../src/configs";

describe("VlessGenerator", () => {
  const gen = new VlessGenerator();
  const valid = {
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    address: "example.com",
    port: 443,
    name: "DeJ config 1",
    security: "reality" as const,
    network: "tcp" as const,
    publicKey: "pk",
    shortId: "sid",
  };

  it("generates a valid vless:// URI", () => {
    const uri = gen.generateUri(valid);
    expect(uri.startsWith("vless://550e8400")).toBe(true);
    expect(uri).toContain("security=reality");
    expect(uri).toContain("pbk=pk");
  });

  it("rejects invalid UUID", () => {
    const result = gen.validate({ ...valid, uuid: "not-a-uuid" });
    expect(result.valid).toBe(false);
  });

  it("requires publicKey/shortId for reality", () => {
    const result = gen.validate({ ...valid, publicKey: undefined, shortId: undefined });
    expect(result.valid).toBe(false);
  });
});

describe("VmessGenerator", () => {
  it("generates a base64-encoded vmess:// URI", () => {
    const gen = new VmessGenerator();
    const uri = gen.generateUri({
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      address: "example.com",
      port: 443,
      name: "DeJ config 1",
      security: "auto",
      network: "ws",
      tls: true,
      path: "/ws",
    });
    expect(uri.startsWith("vmess://")).toBe(true);
    const decoded = JSON.parse(decodeURIComponent(escape(atob(uri.replace("vmess://", "")))));
    expect(decoded.add).toBe("example.com");
  });
});

describe("TrojanGenerator", () => {
  it("rejects short passwords", () => {
    const gen = new TrojanGenerator();
    const result = gen.validate({
      password: "123",
      address: "example.com",
      port: 443,
      name: "x",
      network: "tcp",
    });
    expect(result.valid).toBe(false);
  });

  it("url-encodes special characters in password", () => {
    const gen = new TrojanGenerator();
    const uri = gen.generateUri({
      password: "p@ss word!",
      address: "example.com",
      port: 443,
      name: "DeJ config 1",
      network: "tcp",
    });
    expect(uri).not.toContain(" ");
  });
});

describe("ShadowsocksGenerator", () => {
  it("generates a valid ss:// URI", () => {
    const gen = new ShadowsocksGenerator();
    const uri = gen.generateUri({
      password: "secret",
      address: "example.com",
      port: 8388,
      name: "DeJ config 1",
      method: "aes-256-gcm",
    });
    expect(uri.startsWith("ss://")).toBe(true);
  });
});

describe("WireguardGenerator", () => {
  const validKey = "A".repeat(43) + "=";

  it("generates a valid conf format", () => {
    const gen = new WireguardGenerator();
    const conf = gen.generateUri({
      privateKey: validKey,
      publicKey: validKey,
      address: "10.0.0.2/32",
      endpoint: "example.com",
      endpointPort: 51820,
      name: "DeJ config 1",
    });
    expect(conf).toContain("[Interface]");
    expect(conf).toContain("[Peer]");
  });

  it("rejects malformed keys", () => {
    const gen = new WireguardGenerator();
    const result = gen.validate({
      privateKey: "short",
      publicKey: validKey,
      address: "10.0.0.2/32",
      endpoint: "example.com",
      endpointPort: 51820,
      name: "x",
    });
    expect(result.valid).toBe(false);
  });
});

describe("nextAvailableConfigName", () => {
  it("increments from the highest existing number", () => {
    expect(nextAvailableConfigName(["DeJ config 1", "DeJ config 2"])).toBe("DeJ config 3");
  });

  it("fills gaps instead of always appending", () => {
    expect(nextAvailableConfigName(["DeJ config 1", "DeJ config 3"])).toBe("DeJ config 2");
  });

  it("starts at 1 when no configs exist", () => {
    expect(nextAvailableConfigName([])).toBe("DeJ config 1");
  });
});
