# Bring your gadget

> A driver-writing guide for `@toygarden/core-device` — the HAL that lets any
> panel gadget (M5Stack, a Stream Deck–style macropad, your own homebrew
> keyboard with a screen bolted on) run all 20 toygarden toys without a single
> line of app code changing.

If you've got a small screen and a button, you can plug it into toygarden. This
doc is the tour: what the interface looks like, how the only driver that
exists today is built, and what's still open for someone to claim.

## 1. Why a HAL — apps never know the hardware

Every toy in `apps/` (desk-weather, ume-tamagotchi, chiptune-clock, …) draws
to a `Device`, never to a screen, a serial port, or an HTTP endpoint. The
abstraction is the whole point: swap what's behind `Device` and every app
that already exists keeps working, unmodified.

```
 apps/desk-weather        apps/ume-tamagotchi        … 6 more apps
        │                        │
        └──────────────┬─────────┘
                        ▼
              Device interface (hal.ts)
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   MockDevice      your-driver.ts   your-driver.ts
   (shipped)        (M5Stack)      (Ajazz AKP153)
```

`selectDevice()` picks which box on the bottom row gets built, based on
`TOYGARDEN_DEVICE`. Nothing above that line — no app, no core package other
than `core-device` itself — needs to know which box it is.

Eight apps import `@toygarden/core-device` directly today: `agent-constellation`,
`chiptune-clock`, `commit-constellation`, `desk-weather`, `focus-forge`,
`git-weather`, `pomodoro-forge`, `ume-tamagotchi` (grepped from
`apps/*/src/*.ts`, matches the package README). Every one of them runs right
now with zero hardware attached.

## 2. The `Device` interface tour

The whole contract is `packages/core-device/src/hal.ts` — 38 lines,
6 methods. This is the entire surface a driver has to implement:

```ts
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
```

- **`id`** — a string identifying the driver (`"mock"`, and eventually
  `"m5-basic"`, `"ajazz-akp153"`, whatever you name yours).
- **`panelSize()`** — returns `{ width, height }`. Apps call this instead of
  hardcoding a resolution, so the same app runs unmodified on a 320×240 M5Stack
  Basic and a 240×135 M5Cardputer.
- **`draw(cmd)`** — queues one `DrawCommand`. There are three:
  `{ op: "clear" }`, `{ op: "text"; x; y; text }`,
  `{ op: "rect"; x; y; w; h; color? }`. Origin is the panel's top-left corner.
- **`onButton(handler)`** — subscribe to button presses; call the returned
  function to unsubscribe. This is the only input path in the interface.
- **`led(color)`** — sets an `RGB` backlight/LED color. Devices without one
  just no-op.
- **`flush()`** — commits whatever was queued by `draw()` to the actual
  panel.

That's it. No lifecycle hooks, no async, no config object. A driver is a
class with six methods.

## 3. Write a driver in ~50 lines

`packages/core-device/src/devices/mock.ts` is the only driver that exists,
and it's short enough to read end to end. Walking through it shows the shape
every real driver will have — the only thing that changes for hardware is
*where the bytes go*.

```ts
import type { Device, DrawCommand, PanelSize, RGB } from "../hal.js";

export class MockDevice implements Device {
  readonly id = "mock";
  readonly drawn: DrawCommand[] = [];      // ← recorded for tests; a real
  readonly flushes: DrawCommand[][] = [];  //   driver wouldn't need these
  lastLed: RGB | null = null;

  private buttonHandlers = new Set<(b: number) => void>();
  private buffer: DrawCommand[] = [];

  constructor(private size: PanelSize = { width: 320, height: 240 }) {}

  panelSize(): PanelSize {
    return this.size;
  }

  draw(cmd: DrawCommand): void {
    this.buffer.push(cmd);   // ← a real driver would translate `cmd` into
    this.drawn.push(cmd);    //   whatever your panel's drawing primitive is
  }

  onButton(handler: (button: number) => void): () => void {
    this.buttonHandlers.add(handler);
    return () => {
      this.buttonHandlers.delete(handler);
    };
  }

  led(color: RGB): void {
    this.lastLed = color;   // ← a real driver would write this to the LED
  }

  flush(): void {
    this.flushes.push([...this.buffer]);   // ← a real driver would send
    this.buffer = [];                      //   `this.buffer` over the wire here
  }

  /** テスト用: ボタン押下をシミュレート。 */
  pressButton(button: number): void {
    for (const h of this.buttonHandlers) h(button);
  }
}
```

`MockDevice` keeps everything in memory (`drawn`, `flushes`, `lastLed`) so
tests can assert on what was drawn, and exposes `pressButton()` so tests can
simulate input without a physical button. That's the mock-only part.

A real driver drops the recording arrays and replaces the three commented
lines with actual I/O. Here's the **sketch** — not working code, just the
shape a serial-based M5Stack driver would take:

```ts
// sketch — illustrates the shape, not a working driver
export class M5BasicDevice implements Device {
  readonly id = "m5-basic";
  private port: SerialPort;      // your serial/USB library of choice
  private buffer: DrawCommand[] = [];

  constructor(portPath: string) {
    this.port = openSerialPort(portPath, { baudRate: 115200 });
  }

  panelSize(): PanelSize {
    return { width: 320, height: 240 }; // M5Stack Basic's actual resolution
  }

  draw(cmd: DrawCommand): void {
    this.buffer.push(cmd);
  }

  onButton(handler: (button: number) => void): () => void {
    const listener = (byte: number) => handler(byte);
    this.port.on("data", listener);
    return () => this.port.off("data", listener);
  }

  led(color: RGB): void {
    this.port.write(encodeLedCommand(color));
  }

  flush(): void {
    this.port.write(encodeFrame(this.buffer));
    this.buffer = [];
  }
}
```

Swap `SerialPort` for a HID library and you've got the shape of an Ajazz
AKP153 driver instead. Swap it for `fetch()` and you've got an HTTP-attached
panel. The `Device` interface doesn't care — that's the whole HAL bargain.

Wire it in by adding one line to `packages/core-device/src/select.ts`:

```ts
switch (name) {
  case "mock":
    return new MockDevice();
  case "m5-basic":
    return new M5BasicDevice(process.env.M5_PORT ?? "/dev/ttyUSB0");
  // ...
}
```

No app changes required — that's the design principle the package README
states directly: *"新デバイスは既存 app 無改修で足せる"* (a new device can be
added without modifying any existing app).

## 4. Wanted: real drivers

Be clear-eyed about where things stand today:

| driver | status |
|---|---|
| `mock` (`MockDevice`) | ✅ shipped — the default, what CI and every app run against |
| M5StickC Plus (serial) | ✅ shipped (first real driver!) — `M5StickCSerialDevice`, zero-dependency, `TOYGARDEN_DEVICE=m5` or `m5stickc` |
| M5Stack (Basic/Core2, Cardputer) | 🔌 wanted — commented-out `case`s in `select.ts` are placeholders, no implementation exists |
| Ajazz AKP153 (Stream Deck–class macropad) | 🔌 wanted — same, placeholder only |
| your gadget | 🔌 open — anything with a screen and/or a button qualifies |

The M5StickC Plus driver is the first line item above the mock. If a README
or a GIF anywhere implies more than that, the code in
`packages/core-device/src/select.ts` is the source of truth: the `switch` has
exactly two live `case`s (`mock`, `m5`/`m5stickc`).

### Using the M5StickC Plus driver

```sh
TOYGARDEN_DEVICE=m5 npm run play ume-tamagotchi
# or, if the port differs from the default:
TOYGARDEN_DEVICE=m5 TOYGARDEN_SERIAL_PORT=/dev/cu.usbserial-XXXXXXXX npm run play ume-tamagotchi
```

`M5StickCSerialDevice` (`packages/core-device/src/devices/m5stickc-serial.ts`)
talks to the board over its USB-serial port with **zero external
dependencies** — no `serialport` package. It shells out to `stty -f <port>
115200 raw -echo` to configure the tty, then opens the port as a plain
character device with `fs.createWriteStream` / `fs.createReadStream` — the
same classic macOS trick sketched in §3, made real. Wire format is
newline-delimited JSON at 115200 baud; `DrawCommand`'s `op` values
(`clear`/`text`/`rect`) map straight onto the wire protocol, and `led`/`flush`
are separate one-line messages. Incoming lines are parsed for `{"btn":0|1}`
button presses (a startup `{"hello":...}` line is ignored).

If the port doesn't exist or `stty` fails (no board plugged in, wrong path,
permission issue), the driver logs a warning and silently becomes a no-op —
it never throws, so a missing gadget doesn't take the toy down with it.

That's not a gap to apologize for — it's the design working as intended. The
mock existing as the *default* is precisely what lets every app and every CI
run be developed with zero hardware in hand. Real drivers are additive, not
required.

**PR checklist for a new driver:**

- [ ] Implements `Device` from `hal.ts` — all six methods, correct types
      (`panelSize(): PanelSize`, `draw(cmd: DrawCommand): void`, etc.)
- [ ] Lives at `packages/core-device/src/devices/<name>.ts`
- [ ] Adds one `case` to the `switch` in `select.ts` — no other file needs
      to change
- [ ] Has tests at the same level of coverage as
      `packages/core-device/test/mock.test.ts` (panel size, draw/flush
      recording or an equivalent real-I/O check, button subscribe/unsubscribe)
- [ ] Adds one row to the driver table in this doc and to
      `packages/core-device/README.md`'s API table if it changes the public
      surface

## 4b. Raspberry Pi already runs the terminal half — today, no driver

"Hardware" means two different things here, and it's worth keeping them apart:

- **A computer with a terminal** — a Raspberry Pi (or any SBC that boots to a
  shell) runs toygarden *today, unmodified*. Every `core-tui` toy —
  ascii-aquarium, secretary-today, git-replay, focus-tally, the whole terminal
  half of the catalog — is just Node drawing to a screen. `git clone`,
  `npm install`, `npm run play`, done. No driver, no HAL, nothing to write. If
  you then want the Pi's GPIO pins or an attached LED/HAT to light up as well,
  *that* part is a `Device` driver — the ~50-line job from section 3.
- **A panel gadget** — an ESP32 board, an M5Stack, a Stream Deck–class macropad:
  something with a small screen and/or a button but no general-purpose shell.
  These need a `Device` driver to translate `DrawCommand`s into the panel's own
  wire protocol. That's the wanted work.

| target | how it runs |
|---|---|
| Raspberry Pi / any SBC with a terminal | ✅ today — `core-tui` toys run as-is; GPIO/LED is an *optional* `Device` driver |
| ESP32 / ESP32-S3 dev boards | 🔌 wanted — needs a `Device` driver (serial or BLE transport) |
| M5Stack (Basic/Core2, Cardputer, StickC Plus) | 🔌 wanted — placeholder `case` only, see the table in §4 |
| Stream Deck–class macropad (Ajazz AKP153) | 🔌 wanted — HID transport, same six-method shape |

### This genre is real — you'd be in good company

The "one hardware-abstraction layer + a thin display layer on top" pattern isn't
toygarden's invention. A cluster of popular projects have converged on the same
shape, which is the best evidence the `Device` seam is worth filling. None of
these are toygarden dependencies or integrations — they're **neighbors** that show
the target hardware is real, active, and waiting for exactly this kind of driver:

- **[AWTRIX 3](https://github.com/Blueforcer/awtrix3)** (~2.3k★ at the time of
  writing) — ESP32 firmware that turns a 32×8 LED matrix into a clock/dashboard
  driven by small draw commands over the network. Almost exactly toygarden's
  `draw()` / `flush()` seam, expressed in firmware.
- **[M5Stack StackChan](https://github.com/m5stack/StackChan)** (994★) — an
  M5Stack desktop robot whose faces and animations are a thin display layer over
  the same M5 panel that `device-mirror` already emulates in your terminal.
- **[badge.team](https://github.com/badgeteam)** (132 public repos) — an
  event-badge firmware community built around swappable apps on shared badge
  hardware: the same "many small display apps, one HAL" split toygarden uses.

## 5. Try it without hardware

You don't need a gadget to see the HAL work. Everything in toygarden already
runs on `MockDevice` by default — `TOYGARDEN_DEVICE` unset means mock:

```sh
npm install
TOYGARDEN_DEVICE=mock npm run play desk-weather   # mock is also the default; explicit here for clarity
```

To watch the actual `draw()` / `led()` / `flush()` calls happening in real
time without owning any hardware, the fastest path is the virtual gadget
toy — a terminal-rendered stand-in for a physical panel:

```sh
npm run play device-mirror
```

That toy draws the same `DrawCommand`s a real M5Stack or AKP153 driver would
receive, just rendered as ASCII instead of pixels — it's the shortest loop
for seeing what a driver you write would actually be asked to do.

Once you have real hardware, point `TOYGARDEN_DEVICE` at your driver's `id` and
every existing toy runs against it unmodified:

```sh
TOYGARDEN_DEVICE=m5-basic npm run play desk-weather   # once such a driver exists
```

---

## 日本語サマリ

`@toygarden/core-device` は小型パネルデバイスを1つの `Device` インターフェース
（6メソッド・38行）で抽象化する HAL。app はこのインターフェースしか見ないため、
ドライバを1つ書けば全20 toy がそのまま動く。

**現状、実装されているドライバは `MockDevice` のみ。** M5Stack や Ajazz AKP153
は `select.ts` にコメントアウトされた `case` があるだけで、実装は存在しない
（誇張しない）。むしろこれが設計の強み — 既定が mock であることによって、
全 app・全 core が実機ゼロで開発・CI できる。

ドライバを書くのに必要なのは `devices/mock.ts`（48行）と同じ形の class を書き、
`select.ts` に `case` を1行足すだけ。既存 app は無改修。ハードウェアが手元に
なくても、`npm run play device-mirror`（並行開発中の仮想ガジェット toy）で
`Device` に何が起きるかを端末上で確認できる。

貢献したい人向けの PR チェックリストは本文の「4. Wanted: real drivers」を参照。
