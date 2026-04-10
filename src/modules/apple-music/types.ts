export interface AppleMusicConnection {
  userId: string;
  storefront: string;
  encryptedUserToken: string;
  status: "connected" | "expired";
}

export interface AppleApiCredentials {
  developerToken: string;
  musicUserToken: string;
  storefront?: string;
}

export interface ApplePlaylistWriteResult {
  playlistId: string;
  title: string;
  success: boolean;
  message: string;
}
