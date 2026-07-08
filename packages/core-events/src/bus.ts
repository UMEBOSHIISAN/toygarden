import type { PlayEvent, Producer } from "@toygarden/contracts";

/**
 * 最小イベントバス。producer と consumer を疎結合につなぐ（設計 §4.4）。
 * app はこれを1つ持ち、各 core / consumer を subscribe させ、observer が emit する。
 */
export class EventBus implements Producer {
  private handlers = new Set<(e: PlayEvent) => void>();

  subscribe(handler: (e: PlayEvent) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  emit(e: PlayEvent): void {
    for (const h of this.handlers) h(e);
  }

  /** 現在の購読者数（デバッグ用）。 */
  get size(): number {
    return this.handlers.size;
  }
}
