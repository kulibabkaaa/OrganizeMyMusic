import { generateKeyPairSync } from "node:crypto";
import { decodeProtectedHeader, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";

import {
  AppleDeveloperTokenConfigError,
  AppleDeveloperTokenInvalidConfigError,
  createAppleDeveloperTokenFromConfig,
  normalizeApplePrivateKey
} from "@/modules/apple-music/developer-token";

function createTestKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256"
  });

  return {
    privateKeyPem: privateKey.export({
      format: "pem",
      type: "pkcs8"
    }) as string,
    publicKey
  };
}

describe("normalizeApplePrivateKey", () => {
  it("accepts private keys stored with escaped newlines", () => {
    const { privateKeyPem } = createTestKeyPair();

    expect(normalizeApplePrivateKey(privateKeyPem.replace(/\n/g, "\\n"))).toBe(privateKeyPem.trim());
  });
});

describe("createAppleDeveloperTokenFromConfig", () => {
  it("throws a clear error when required Apple env vars are missing", async () => {
    await expect(
      createAppleDeveloperTokenFromConfig({
        teamId: "",
        keyId: "KEY1234567",
        privateKey: "-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----"
      })
    ).rejects.toMatchObject({
      name: "AppleDeveloperTokenConfigError",
      missing: ["APPLE_TEAM_ID"]
    } satisfies Partial<AppleDeveloperTokenConfigError>);
  });

  it("throws a clear error when the Apple private key cannot be parsed", async () => {
    await expect(
      createAppleDeveloperTokenFromConfig({
        teamId: "TEAMID1234",
        keyId: "KEYID12345",
        privateKey: "not-a-private-key"
      })
    ).rejects.toMatchObject({
      name: "AppleDeveloperTokenInvalidConfigError",
      message: "Apple Music private key could not be parsed."
    } satisfies Partial<AppleDeveloperTokenInvalidConfigError>);
  });

  it("creates an ES256 Apple Music developer JWT without exposing the private key", async () => {
    const { privateKeyPem, publicKey } = createTestKeyPair();
    const issuedAt = new Date("2026-05-22T12:00:00.000Z");

    const result = await createAppleDeveloperTokenFromConfig({
      teamId: "TEAMID1234",
      keyId: "KEYID12345",
      privateKey: privateKeyPem.replace(/\n/g, "\\n"),
      issuedAt,
      ttlSeconds: 1800
    });

    const header = decodeProtectedHeader(result.developerToken);
    const verified = await jwtVerify(result.developerToken, publicKey, {
      issuer: "TEAMID1234",
      currentDate: issuedAt
    });

    expect(header).toMatchObject({
      alg: "ES256",
      kid: "KEYID12345"
    });
    expect(verified.payload).toMatchObject({
      iss: "TEAMID1234",
      iat: Math.floor(issuedAt.getTime() / 1000),
      exp: Math.floor(issuedAt.getTime() / 1000) + 1800
    });
    expect(result.expiresAt).toBe("2026-05-22T12:30:00.000Z");
    expect(result.developerToken).not.toContain("PRIVATE KEY");
  });
});
