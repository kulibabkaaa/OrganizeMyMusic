import { SignJWT, importPKCS8 } from "jose";

import { env } from "@/lib/env";

const DEFAULT_TTL_SECONDS = 60 * 30;
const MAX_APPLE_TTL_SECONDS = 15_777_000;

export interface AppleDeveloperTokenConfig {
  teamId?: string;
  keyId?: string;
  privateKey?: string;
  issuedAt?: Date;
  ttlSeconds?: number;
}

export interface AppleDeveloperTokenResult {
  developerToken: string;
  expiresAt: string;
}

export class AppleDeveloperTokenConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing Apple Music developer token configuration: ${missing.join(", ")}`);
    this.name = "AppleDeveloperTokenConfigError";
    this.missing = missing;
  }
}

export class AppleDeveloperTokenInvalidConfigError extends Error {
  constructor(message = "Apple Music developer token configuration is invalid.") {
    super(message);
    this.name = "AppleDeveloperTokenInvalidConfigError";
  }
}

export function normalizeApplePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n").trim();
}

function validateAppleDeveloperTokenConfig(config: AppleDeveloperTokenConfig) {
  const missing: string[] = [];

  if (!config.teamId?.trim()) {
    missing.push("APPLE_TEAM_ID");
  }

  if (!config.keyId?.trim()) {
    missing.push("APPLE_KEY_ID");
  }

  if (!config.privateKey?.trim()) {
    missing.push("APPLE_PRIVATE_KEY");
  }

  if (missing.length > 0) {
    throw new AppleDeveloperTokenConfigError(missing);
  }
}

export async function createAppleDeveloperTokenFromConfig(
  config: AppleDeveloperTokenConfig
): Promise<AppleDeveloperTokenResult> {
  validateAppleDeveloperTokenConfig(config);

  const issuedAt = config.issuedAt ?? new Date();
  const ttlSeconds = Math.min(config.ttlSeconds ?? DEFAULT_TTL_SECONDS, MAX_APPLE_TTL_SECONDS);
  const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000);
  let privateKey: Awaited<ReturnType<typeof importPKCS8>>;

  try {
    privateKey = await importPKCS8(normalizeApplePrivateKey(config.privateKey ?? ""), "ES256");
  } catch {
    throw new AppleDeveloperTokenInvalidConfigError(
      "Apple Music private key is invalid. Use the full .p8 private key value."
    );
  }

  const developerToken = await new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: config.keyId?.trim()
    })
    .setIssuer(config.teamId?.trim() ?? "")
    .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(privateKey);

  return {
    developerToken,
    expiresAt: expiresAt.toISOString()
  };
}

export async function createAppleDeveloperToken() {
  return createAppleDeveloperTokenFromConfig({
    teamId: env.APPLE_TEAM_ID,
    keyId: env.APPLE_KEY_ID,
    privateKey: env.APPLE_PRIVATE_KEY
  });
}
