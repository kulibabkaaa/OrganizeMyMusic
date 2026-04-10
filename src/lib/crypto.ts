import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { requireServerEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function getKey() {
  return createHash("sha256").update(requireServerEnv("ENCRYPTION_KEY")).digest();
}

export function encrypt(value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(value: string) {
  const raw = Buffer.from(value, "base64");
  const iv = raw.subarray(0, 16);
  const authTag = raw.subarray(16, 32);
  const payload = raw.subarray(32);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}

