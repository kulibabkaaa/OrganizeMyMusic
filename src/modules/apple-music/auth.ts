import { decrypt, decryptWithKey, encrypt, encryptWithKey } from "@/lib/crypto";

export const APPLE_MUSIC_TOKEN_ENCRYPTION_VERSION = 1;

interface QueryError {
  message?: string;
}

interface AppleMusicConnectionRow {
  id: string;
  user_id: string;
  storefront: string;
  status: "connected" | "expired" | "revoked" | "error";
  last_validated_at: string | null;
  updated_at: string;
}

export interface SupabaseAppleMusicConnectionWriter {
  from(table: "apple_music_connections"): {
    upsert(
      row: {
        user_id: string;
        storefront: string;
        encrypted_user_token: string;
        token_encryption_version: number;
        status: "connected";
        last_validated_at: string;
        updated_at: string;
      },
      options: { onConflict: "user_id" }
    ): {
      select(columns: "id,user_id,storefront,status,last_validated_at,updated_at"): {
        single(): PromiseLike<{
          data: AppleMusicConnectionRow | null;
          error: QueryError | null;
        }>;
      };
    };
  };
}

export type AppleMusicConnectionPersistenceResult =
  | {
      status: "connected";
      connectionId: string;
      userId: string;
      storefront: string;
      encryptedUserToken: string;
      tokenEncryptionVersion: number;
      lastValidatedAt: string | null;
      updatedAt: string;
    }
  | {
      status: "error";
      message: string;
    };

export async function persistAppleMusicUserToken(input: {
  supabase: SupabaseAppleMusicConnectionWriter;
  userId: string;
  storefront: string;
  musicUserToken: string;
  encryptionKey?: string;
}): Promise<AppleMusicConnectionPersistenceResult> {
  const encryptedUserToken = input.encryptionKey
    ? encryptWithKey(input.musicUserToken, input.encryptionKey)
    : encrypt(input.musicUserToken);
  const now = new Date().toISOString();
  const { data, error } = await input.supabase
    .from("apple_music_connections")
    .upsert(
      {
        user_id: input.userId,
        storefront: input.storefront,
        encrypted_user_token: encryptedUserToken,
        token_encryption_version: APPLE_MUSIC_TOKEN_ENCRYPTION_VERSION,
        status: "connected",
        last_validated_at: now,
        updated_at: now
      },
      { onConflict: "user_id" }
    )
    .select("id,user_id,storefront,status,last_validated_at,updated_at")
    .single();

  if (error || !data) {
    return {
      status: "error",
      message: error?.message ?? "Unable to persist Apple Music connection."
    };
  }

  return {
    status: "connected",
    connectionId: data.id,
    userId: data.user_id,
    storefront: data.storefront,
    encryptedUserToken,
    tokenEncryptionVersion: APPLE_MUSIC_TOKEN_ENCRYPTION_VERSION,
    lastValidatedAt: data.last_validated_at,
    updatedAt: data.updated_at
  };
}

export function decryptAppleMusicUserToken(
  encryptedUserToken: string,
  options?: { encryptionKey?: string }
) {
  return options?.encryptionKey
    ? decryptWithKey(encryptedUserToken, options.encryptionKey)
    : decrypt(encryptedUserToken);
}
