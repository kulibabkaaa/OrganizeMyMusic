import { encrypt } from "@/lib/crypto";

export function persistAppleConnection(input: {
  userId: string;
  storefront: string;
  userToken: string;
}) {
  return {
    userId: input.userId,
    storefront: input.storefront,
    encryptedUserToken: encrypt(input.userToken),
    status: "connected" as const
  };
}

