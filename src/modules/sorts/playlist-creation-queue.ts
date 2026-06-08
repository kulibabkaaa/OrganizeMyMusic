export const PLAYLIST_CREATION_JOB_NAME = "playlist-create";

export interface PlaylistCreationJobData {
  sortRunId: string;
  userId: string;
}

export interface PlaylistCreationQueue {
  createQueue?(name: typeof PLAYLIST_CREATION_JOB_NAME): Promise<void>;
  send(
    name: typeof PLAYLIST_CREATION_JOB_NAME,
    data: PlaylistCreationJobData,
    options: {
      retryLimit: number;
      retryDelay: number;
      retryBackoff: boolean;
      singletonKey: string;
    }
  ): Promise<string | null>;
}
