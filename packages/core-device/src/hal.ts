/**
 * core-device HAL — 小型パネルデバイスを1つの抽象で扱う（設計 §4.5）。
 *
 * app はハードを知らず、この Device インターフェースだけ見る。
 * 対応予定: M5Stack Basic/Core2 / M5Cardputer / M5StickC Plus / Ajazz AKP153。
 * Steam Deck は Linux PC 扱いで HAL の外（core-tui 系 app がそのまま動く）。
 * 新デバイスは devices/ にドライバを1つ足し、select.ts に1行足すだけ（既存 app 無改修）。
 */

export interface PanelSize {
  width: number;
  height: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type DrawCommand =
  | { op: "clear" }
  | { op: "text"; x: number; y: number; text: string }
  | { op: "rect"; x: number; y: number; w: number; h: number; color?: RGB };

export interface Device {
  readonly id: string;
  /** パネル解像度。app はこれを使い、解像度を直書きしない。 */
  panelSize(): PanelSize;
  /** 描画バッファへ積む（座標はパネル左上原点）。 */
  draw(cmd: DrawCommand): void;
  /** ボタン入力を購読。戻り値を呼ぶと解除。 */
  onButton(handler: (button: number) => void): () => void;
  /** LED / バックライト色（非対応デバイスは no-op）。 */
  led(color: RGB): void;
  /** 描画バッファをパネルへ反映。 */
  flush(): void;
}
