import { describe, expect, it } from "vitest";

import {
  decryptAppleMusicUserToken,
  getAppleMusicConnectionStatus,
  persistAppleMusicUserToken,
  type SupabaseAppleMusicConnectionReader,
  type SupabaseAppleMusicConnectionWriter
} from "@/modules/apple-music/auth";

type AppleMusicConnectionWriteRow = {
  user_id: string;
  storefront: string;
  encrypted_user_token: string;
  token_encryption_version: number;
  status: "connected";
  last_validated_at: string;
  updated_at: string;
};

function createMockConnectionWriter(onRow?: (row: AppleMusicConnectionWriteRow) => void) {
  return {
    from(table: "apple_music_connections") {
      expect(table).toBe("apple_music_connections");

      return {
        upsert(row: AppleMusicConnectionWriteRow, options: { onConflict: "user_id" }) {
          onRow?.(row);
          expect(options).toEqual({ onConflict: "user_id" });

          return {
            select(columns: "id,user_id,storefront,status,last_validated_at,updated_at") {
              expect(columns).toBe("id,user_id,storefront,status,last_validated_at,updated_at");

              return {
                async single() {
                  return {
                    data: {
                      id: "connection_1",
                      user_id: row.user_id,
                      storefront: row.storefront,
                      status: row.status,
                      last_validated_at: row.last_validated_at,
                      updated_at: row.updated_at
                    },
                    error: null
                  };
                }
              };
            }
          };
        }
      };
    }
  } satisfies SupabaseAppleMusicConnectionWriter;
}

function createMockConnectionReader(row: {
  id: string;
  user_id: string;
  storefront: string;
  status: "connected" | "expired" | "revoked" | "error";
  last_validated_at: string | null;
  updated_at: string;
} | null) {
  return {
    from(table: "apple_music_connections") {
      expect(table).toBe("apple_music_connections");

      return {
        select(columns: "id,user_id,storefront,status,last_validated_at,updated_at") {
          expect(columns).toBe("id,user_id,storefront,status,last_validated_at,updated_at");

          return {
            eq(column: "user_id", value: string) {
              expect(column).toBe("user_id");
              expect(value).toBe("user_1");

              return {
                async maybeSingle() {
                  return {
                    data: row,
                    error: null
                  };
                }
              };
            }
          };
        }
      };
    }
  } satisfies SupabaseAppleMusicConnectionReader;
}

describe("persistAppleMusicUserToken", () => {
  it("stores only encrypted Apple Music user tokens", async () => {
    const storedRows: AppleMusicConnectionWriteRow[] = [];
    const client = createMockConnectionWriter((row) => {
      storedRows.push(row);
    });

    await expect(
      persistAppleMusicUserToken({
        supabase: client,
        userId: "user_1",
        storefront: "us",
        musicUserToken: "raw-music-user-token",
        encryptionKey: "test-encryption-key"
      })
    ).resolves.toMatchObject({
      status: "connected",
      storefront: "us"
    });

    const storedRow = storedRows[0];

    expect(storedRow).toMatchObject({
      user_id: "user_1",
      storefront: "us",
      token_encryption_version: 1,
      status: "connected"
    });
    expect(storedRow.encrypted_user_token).not.toBe("raw-music-user-token");
    expect(JSON.stringify(storedRow)).not.toContain("raw-music-user-token");
  });
});

describe("decryptAppleMusicUserToken", () => {
  it("decrypts persisted tokens for server and worker use", async () => {
    const result = await persistAppleMusicUserToken({
      supabase: createMockConnectionWriter(),
      userId: "user_1",
      storefront: "gb",
      musicUserToken: "worker-token",
      encryptionKey: "test-encryption-key"
    });

    expect(result.status).toBe("connected");
    if (result.status !== "connected") {
      throw new Error(result.message);
    }

    expect(
      decryptAppleMusicUserToken(result.encryptedUserToken, {
        encryptionKey: "test-encryption-key"
      })
    ).toBe("worker-token");
  });
});

describe("getAppleMusicConnectionStatus", () => {
  it("returns connection status without encrypted token fields", async () => {
    const status = await getAppleMusicConnectionStatus({
      supabase: createMockConnectionReader({
        id: "connection_1",
        user_id: "user_1",
        storefront: "us",
        status: "connected",
        last_validated_at: "2026-06-08T10:00:00.000Z",
        updated_at: "2026-06-08T10:00:00.000Z"
      }),
      userId: "user_1"
    });

    expect(status).toEqual({
      status: "connected",
      connectionId: "connection_1",
      userId: "user_1",
      storefront: "us",
      lastValidatedAt: "2026-06-08T10:00:00.000Z",
      updatedAt: "2026-06-08T10:00:00.000Z"
    });
    expect(JSON.stringify(status)).not.toContain("encrypted");
  });

  it("returns disconnected when no Apple Music connection exists", async () => {
    await expect(
      getAppleMusicConnectionStatus({
        supabase: createMockConnectionReader(null),
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "disconnected",
      connectionId: null,
      userId: "user_1",
      storefront: null,
      lastValidatedAt: null,
      updatedAt: null
    });
  });
});
