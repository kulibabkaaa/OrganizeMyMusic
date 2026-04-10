export {};

declare global {
  interface Window {
    MusicKit?: {
      configure(config: {
        developerToken: string;
        app: {
          name: string;
          build: string;
        };
      }): MusicKitInstance;
      getInstance(): MusicKitInstance;
    };
  }

  interface MusicKitInstance {
    authorize(): Promise<string>;
    musicUserToken?: string;
    storefrontId?: string;
  }
}

