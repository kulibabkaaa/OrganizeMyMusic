import { describe, expect, it } from "vitest";

import { decryptWithKey, encryptWithKey, getEncryptionKeyValidationError } from "@/lib/crypto";

const validTestKey = "test-encryption-key-with-at-least-32-bytes";

describe("token encryption", () => {
  it("round-trips encrypted Apple Music user tokens", () => {
    const encrypted = encryptWithKey("music-user-token", validTestKey);

    expect(encrypted).not.toBe("music-user-token");
    expect(decryptWithKey(encrypted, validTestKey)).toBe("music-user-token");
  });

  it("fails decryption with the wrong key", () => {
    const encrypted = encryptWithKey("music-user-token", validTestKey);

    expect(() =>
      decryptWithKey(encrypted, "wrong-encryption-key-with-at-least-32-bytes")
    ).toThrow();
  });

  it("rejects weak encryption keys before encrypting tokens", () => {
    expect(() => encryptWithKey("music-user-token", "short-key")).toThrow(
      "ENCRYPTION_KEY must be at least 32 bytes."
    );
    expect(getEncryptionKeyValidationError("short-key")).toBe(
      "ENCRYPTION_KEY must be at least 32 bytes."
    );
    expect(getEncryptionKeyValidationError(validTestKey)).toBeNull();
  });
});
