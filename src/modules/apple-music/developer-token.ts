import { SignJWT, importPKCS8 } from "jose";

import { env, requireServerEnv } from "@/lib/env";

export async function createAppleDeveloperToken() {
  if (!env.APPLE_PRIVATE_KEY || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID) {
    return {
      token: "dev_token_placeholder",
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString()
    };
  }

  const privateKey = await importPKCS8(
    requireServerEnv("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    "ES256"
  );

  const token = await new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: requireServerEnv("APPLE_KEY_ID")
    })
    .setIssuer(requireServerEnv("APPLE_TEAM_ID"))
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(privateKey);

  return {
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString()
  };
}

