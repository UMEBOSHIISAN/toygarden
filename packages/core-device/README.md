# @toygarden/core-device

小型パネルデバイス（M5Stack / Ajazz AKP153 等）を1つの抽象 `Device` で扱う HAL
（Hardware Abstraction Layer）。依存は `@toygarden/contracts` のみ。

app はハードを知らず、`Device` インターフェースだけを見る。実機ドライバがなくても
既定の `MockDevice` で全 app / core が実機ゼロで開発・CI できる。Steam Deck は Linux PC 扱いで
HAL の外（`core-tui` 系 app がそのまま動く）。

## 提供 API

`src/index.ts` が export する全体。

| API | 種別 | シグネチャ / 内容 |
|---|---|---|
| `Device` | interface | 下記参照 |
| `DrawCommand` | type | `{ op: "clear" } \| { op: "text"; x; y; text } \| { op: "rect"; x; y; w; h; color? }` |
| `PanelSize` | interface | `{ width: number; height: number }` |
| `RGB` | interface | `{ r: number; g: number; b: number }` |
| `MockDevice` | class（`Device` 実装） | `new MockDevice(size?: PanelSize)` — 実機なしで動く既定デバイス |
| `selectDevice` | 関数 | `selectDevice(name?: string): Device` — env `TOYGARDEN_DEVICE` でドライバ選択 |

`Device` インターフェース:

```ts
export interface Device {
  readonly id: string;
  panelSize(): PanelSize;
  draw(cmd: DrawCommand): void;
  onButton(handler: (button: number) => void): () => void;
  led(color: RGB): void;
  flush(): void;
}
```

`MockDevice` は `drawn` / `flushes` / `lastLed` を公開し、テストで描画内容を検証できる。
`pressButton(button: number)` でボタン入力もシミュレートできる。

## 使用例

```ts
import { selectDevice, type Device } from "@toygarden/core-device";

const device: Device = selectDevice(); // 既定は mock（TOYGARDEN_DEVICE 未設定時）

device.draw({ op: "clear" });
device.draw({ op: "text", x: 20, y: 20, text: "(・ω・)" });
device.led({ r: 255, g: 200, b: 0 });
device.flush();

const off = device.onButton((btn) => console.log("pressed", btn));
```

## 使っている app

`agent-constellation` / `chiptune-clock` / `commit-constellation` / `desk-weather` /
`focus-forge` / `git-weather` / `pomodoro-forge` / `ume-tamagotchi` が `@toygarden/core-device`
を直接 import する（`apps/*/src/*.ts` を grep して実測）。

## 設計原則

- **HAL 境界**: app は座標・解像度・色を直書きせず、必ず `panelSize()` 経由で取得する。
- **実機ゼロで開発できる**: 既定ドライバが `MockDevice` であることが、全 core / app の CI 可能性の前提。
- **新デバイスは既存 app 無改修で足せる**: `devices/<name>.ts` に実装を1つ書き、`select.ts` の
  switch に `case` を1行足すだけ。app 側は `Device` インターフェースしか見ていないため変更不要。
