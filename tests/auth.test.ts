import { describe, expect, it } from "vitest";

import { parseEmailPasswordForm } from "@/lib/auth/credentials";
import { ensureProfileForUser, isMissingProfilesTableError } from "@/lib/auth/profile";
import { getAuthenticatedSession, type SupabaseAuthReader } from "@/lib/auth/session";

function formData(values: Record<string, string>) {
  const data = new FormData();

  Object.entries(values).forEach(([key, value]) => data.set(key, value));

  return data;
}

describe("parseEmailPasswordForm", () => {
  it("accepts valid email credentials", () => {
    const parsed = parseEmailPasswordForm(
      formData({
        email: " listener@example.com ",
        password: "long-enough"
      })
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects short passwords", () => {
    const parsed = parseEmailPasswordForm(
      formData({
        email: "listener@example.com",
        password: "short"
      })
    );

    expect(parsed.success).toBe(false);
  });
});

describe("getAuthenticatedSession", () => {
  it("returns authenticated state when Supabase validates a user", async () => {
    const client: SupabaseAuthReader = {
      auth: {
        async getUser() {
          return {
            data: {
              user: {
                id: "user_1",
                email: "listener@example.com"
              }
            },
            error: null
          };
        }
      }
    };

    await expect(getAuthenticatedSession(client)).resolves.toMatchObject({
      status: "authenticated",
      user: {
        id: "user_1"
      }
    });
  });

  it("returns signed out state when user validation fails", async () => {
    const client: SupabaseAuthReader = {
      auth: {
        async getUser() {
          return {
            data: { user: null },
            error: { message: "Invalid token" }
          };
        }
      }
    };

    await expect(getAuthenticatedSession(client)).resolves.toMatchObject({
      status: "signed_out",
      user: null
    });
  });
});

describe("ensureProfileForUser", () => {
  it("reports missing service role configuration", async () => {
    await expect(
      ensureProfileForUser(null, {
        id: "user_1",
        email: "listener@example.com"
      })
    ).resolves.toEqual({
      status: "service_role_missing",
      profile: null
    });
  });

  it("upserts the authenticated user's profile row", async () => {
    const client = {
      from(table: "profiles") {
        expect(table).toBe("profiles");

        return {
          upsert(value: { id: string; email: string | null }, options: { onConflict: "id" }) {
            expect(value).toEqual({
              id: "user_1",
              email: "listener@example.com"
            });
            expect(options).toEqual({ onConflict: "id" });

            return {
              select(columns: "id,email,is_admin") {
                expect(columns).toBe("id,email,is_admin");

                return {
                  async single() {
                    return {
                      data: {
                        id: "user_1",
                        email: "listener@example.com",
                        is_admin: false
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
    };

    await expect(
      ensureProfileForUser(client, {
        id: "user_1",
        email: "listener@example.com"
      })
    ).resolves.toEqual({
      status: "ready",
      profile: {
        id: "user_1",
        email: "listener@example.com",
        isAdmin: false
      }
    });
  });

  it("reports missing profile schema without throwing", async () => {
    expect(
      isMissingProfilesTableError({
        code: "42P01",
        message: "relation \"profiles\" does not exist"
      })
    ).toBe(true);
  });
});
