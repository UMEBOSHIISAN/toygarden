# toygarden firmware — M5StickC Plus

Turns an M5StickC Plus into a toygarden panel: it receives newline-delimited
JSON draw commands over USB serial (115200 baud) and renders them on the LCD.
Buttons A/B are reported back as `{"btn":0}` / `{"btn":1}`.

## Flash it (arduino-cli)

```sh
arduino-cli core install esp32:esp32
arduino-cli lib install "M5StickCPlus" "ArduinoJson"
arduino-cli compile --fqbn esp32:esp32:m5stack_stickc_plus firmware/m5stickc-plus
arduino-cli upload  --fqbn esp32:esp32:m5stack_stickc_plus \
  --port /dev/cu.usbserial-XXXX firmware/m5stickc-plus
```

## Run a toy on the device

```sh
TOYGARDEN_DEVICE=m5 npm run play ume-tamagotchi
# custom port: TOYGARDEN_SERIAL_PORT=/dev/cu.usbserial-XXXX
```

## Protocol

- `{"op":"clear"}` / `{"op":"text","x":N,"y":N,"text":"ascii"}` /
  `{"op":"rect","x":N,"y":N,"w":N,"h":N,"color":[r,g,b]}` /
  `{"op":"led","r":N,"g":N,"b":N}` / `{"op":"flush"}`
- Every accepted command is acked: `{"ack":"<op>"}`; parse failures: `{"err":"parse"}`
- Text is ASCII-only (non-ASCII becomes `?`) — the stock font crashes on
  multi-byte glyphs (measured: TG1WDT watchdog reset), so both this firmware
  and the Node driver sanitize.
