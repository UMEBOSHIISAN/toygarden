import { describe, it, expect, vi, afterEach } from "vitest";
import {
  encodeDrawLine,
  encodeLedLine,
  encodeFlushLine,
  splitLines,
  parseButtonLine,
} from "../src/devices/m5stickc-serial.js";
import { M5StickCSerialDevice, selectDevice } from "@toygarden/core-device";

describe("m5stickc-serial — wire encoding (純ロジック)", () => {
  it("encodes clear/text/rect DrawCommand as one JSON line (op is 1:1 with the wire protocol)", () => {
    expect(encodeDrawLine({ op: "clear" })).toBe('{"op":"clear"}\n');
    expect(encodeDrawLine({ op: "text", x: 1, y: 2, text: "hi" })).toBe(
      '{"op":"text","x":1,"y":2,"text":"hi"}\n',
    );
    expect(encodeDrawLine({ op: "rect", x: 0, y: 0, w: 10, h: 5, color: { r: 1, g: 2, b: 3 } })).toBe(
      '{"op":"rect","x":0,"y":0,"w":10,"h":5,"color":{"r":1,"g":2,"b":3}}\n',
    );
  });

  it("encodes led and flush lines", () => {
    expect(encodeLedLine({ r: 255, g: 0, b: 0 })).toBe('{"op":"led","r":255,"g":0,"b":0}\n');
    expect(encodeFlushLine()).toBe('{"op":"flush"}\n');
  });

  it("splitLines carries a partial trailing line over to the next chunk", () => {
    const first = splitLines("", '{"btn":0}\n{"btn":1}\n{"btn":2');
    expect(first.lines).toEqual(['{"btn":0}', '{"btn":1}']);
    expect(first.carry).toBe('{"btn":2');

    const second = splitLines(first.carry, '}\n');
    expect(second.lines).toEqual(['{"btn":2}']);
    expect(second.carry).toBe("");
  });

  it("parseButtonLine extracts btn from well-formed lines and ignores everything else", () => {
    expect(parseButtonLine('{"btn":1}')).toBe(1);
    expect(parseButtonLine('{"btn":0}')).toBe(0);
    expect(parseButtonLine('{"hello":"toygarden","w":240,"h":135}')).toBeNull();
    expect(parseButtonLine("not json at all")).toBeNull();
    expect(parseButtonLine("")).toBeNull();
  });

  it("parseButtonLine ignores the firmware's ack/err lines (2026-07-08 real-hardware ack instrumentation)", () => {
    expect(parseButtonLine('{"ack":"clear"}')).toBeNull();
    expect(parseButtonLine('{"ack":"flush"}')).toBeNull();
    expect(parseButtonLine('{"err":"parse"}')).toBeNull();
  });
});

describe("m5stickc-serial — fail-soft when the port is absent (実機なし/CI環境)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw on construction and stays a silent no-op device", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => new M5StickCSerialDevice("/dev/cu.does-not-exist-toygarden-test")).not.toThrow();
    warn.mockRestore();
  });

  it("draw/flush/led/onButton are all safe no-ops when the underlying port never opened", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dev = new M5StickCSerialDevice("/dev/cu.does-not-exist-toygarden-test");
    expect(dev.panelSize()).toEqual({ width: 240, height: 135 });
    expect(() => dev.draw({ op: "clear" })).not.toThrow();
    expect(() => dev.led({ r: 0, g: 0, b: 0 })).not.toThrow();
    expect(() => dev.flush()).not.toThrow();
    const off = dev.onButton(() => {});
    expect(() => off()).not.toThrow();
    warn.mockRestore();
  });

  it("selectDevice('m5') and selectDevice('m5stickc') both resolve to the serial driver", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = process.env.TOYGARDEN_SERIAL_PORT;
    process.env.TOYGARDEN_SERIAL_PORT = "/dev/cu.does-not-exist-toygarden-test";
    expect(selectDevice("m5").id).toBe("m5stickc-serial");
    expect(selectDevice("m5stickc").id).toBe("m5stickc-serial");
    process.env.TOYGARDEN_SERIAL_PORT = original;
    warn.mockRestore();
  });
});
