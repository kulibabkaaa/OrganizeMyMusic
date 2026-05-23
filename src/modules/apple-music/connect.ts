import { z } from "zod";

export const appleMusicConnectSchema = z.object({
  musicUserToken: z.string().trim().min(1),
  storefront: z.string().trim().min(2).max(16)
});

export type AppleMusicConnectPayload = z.infer<typeof appleMusicConnectSchema>;

export function parseAppleMusicConnectPayload(payload: unknown) {
  return appleMusicConnectSchema.safeParse(payload);
}

export function acceptAppleMusicConnection(input: AppleMusicConnectPayload & { userId: string }) {
  void input.userId;
  void input.musicUserToken;

  return {
    status: "connected" as const,
    storefront: input.storefront
  };
}
