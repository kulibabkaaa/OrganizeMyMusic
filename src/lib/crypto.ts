import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import { requireServerEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function getKey(encryptionKey: string) {
  return createHash("sha256").update(encryptionKey).digest();
}

export function encryptWithKey(value: string, encryptionKey: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(encryptionKey), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptWithKey(value: string, encryptionKey: string) {
  const raw = Buffer.from(value, "base64");
  const iv = raw.subarray(0, 16);
  const authTag = raw.subarray(16, 32);
  const payload = raw.subarray(32);
  const decipher = createDecipheriv(ALGORITHM, getKey(encryptionKey), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(payload), decipher.final()]).toString("utf8");
}

export function encrypt(value: string) {
  return encryptWithKey(value, requireServerEnv("ENCRYPTION_KEY"));
}

export function decrypt(value: string) {
  return decryptWithKey(value, requireServerEnv("ENCRYPTION_KEY"));
}
