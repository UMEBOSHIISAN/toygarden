import type { Device, DrawCommand, PanelSize, RGB } from "../hal.js";

/**
 * 実機なしで動く既定デバイス（設計 §4.5）。
 * 描画 / LED / 入力を記録して検証に使う。これがあるので全 app / core は
 * 実機ゼロで開発・CI できる（品質担保の前提 §4.8）。
 */
export class MockDevice implements Device {
  readonly id = "mock";
  readonly drawn: DrawCommand[] = [];
  readonly flushes: DrawCommand[][] = [];
  lastLed: RGB | null = null;

  private buttonHandlers = new Set<(b: number) => void>();
  private buffer: DrawCommand[] = [];

  constructor(private size: PanelSize = { width: 320, height: 240 }) {}

  panelSize(): PanelSize {
    return this.size;
  }

  draw(cmd: DrawCommand): void {
    this.buffer.push(cmd);
    this.drawn.push(cmd);
  }

  onButton(handler: (button: number) => void): () => void {
    this.buttonHandlers.add(handler);
    return () => {
      this.buttonHandlers.delete(handler);
    };
  }

  led(color: RGB): void {
    this.lastLed = color;
  }

  flush(): void {
    this.flushes.push([...this.buffer]);
    this.buffer = [];
  }

  /** テスト用: ボタン押下をシミュレート。 */
  pressButton(button: number): void {
    for (const h of this.buttonHandlers) h(button);
  }
}
