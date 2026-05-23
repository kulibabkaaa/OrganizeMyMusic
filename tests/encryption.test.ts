import { describe, expect, it } from "vitest";

import { decryptWithKey, encryptWithKey } from "@/lib/crypto";

describe("token encryption", () => {
  it("round-trips encrypted Apple Music user tokens", () => {
    const encrypted = encryptWithKey("music-user-token", "test-encryption-key");

    expect(encrypted).not.toBe("music-user-token");
    expect(decryptWithKey(encrypted, "test-encryption-key")).toBe("music-user-token");
  });

  it("fails decryption with the wrong key", () => {
    const encrypted = encryptWithKey("music-user-token", "correct-key");

    expect(() => decryptWithKey(encrypted, "wrong-key")).toThrow();
  });
});
