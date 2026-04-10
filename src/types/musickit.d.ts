export {};

declare global {
  interface MusicKitGlobal {
    configure(config: {
      developerToken: string;
      app: {
        name: string;
        build: string;
      };
    }): MusicKitInstance;
    getInstance(): MusicKitInstance;
  }

  interface Window {
    MusicKit?: MusicKitGlobal;
  }

  interface MusicKitInstance {
    authorize(): Promise<string>;
    musicUserToken?: string;
    storefrontId?: string;
  }
}
