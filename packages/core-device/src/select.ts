import type { Device } from "./hal.js";
import { MockDevice } from "./devices/mock.js";
import { M5StickCSerialDevice } from "./devices/m5stickc-serial.js";

/**
 * env TOYGARDEN_DEVICE でドライバ選択（設計 §4.5）。
 * 新デバイスはここに case を1行足すだけ。既定は mock（実機なしで動く）。
 */
export function selectDevice(
  name: string = process.env.TOYGARDEN_DEVICE ?? "mock",
): Device {
  switch (name) {
    case "mock":
      return new MockDevice();
    case "m5":
    case "m5stickc":
      // M5StickC Plus（実機シリアル）。ポート: TOYGARDEN_SERIAL_PORT env（既定はドライバ内で解決）。
      return new M5StickCSerialDevice();
    // case "m5-basic":     return new M5BasicDevice();      // TODO(P1+): M5Stack Basic/Core2
    // case "m5-cardputer": return new M5CardputerDevice();  // TODO(P1+): M5Cardputer
    // case "ajazz-akp153": return new AjazzAkp153Device();  // TODO(P1+): Ajazz AKP153 (Stream Deck系)
    default:
      throw new Error(`unknown TOYGARDEN_DEVICE: ${name} (available: mock, m5, m5stickc)`);
  }
}
