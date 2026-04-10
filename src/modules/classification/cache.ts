import type { TrackClassification } from "@/types/domain";

export class ClassificationCache {
  private store = new Map<string, TrackClassification>();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, classification: TrackClassification) {
    this.store.set(key, classification);
  }
}

export const classificationCache = new ClassificationCache();

