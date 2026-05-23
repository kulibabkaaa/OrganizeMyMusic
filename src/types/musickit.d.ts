export {};

declare global {
  interface MusicKitGlobal {
    configure(config: {
      developerToken: string;
      app: {
        name: string;
        build: string;
      };
    }): MusicKitInstance | void;
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
