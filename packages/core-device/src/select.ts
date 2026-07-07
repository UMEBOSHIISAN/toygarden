import type { Device } from "./hal.js";
import { MockDevice } from "./devices/mock.js";

/**
 * env UMEPLAY_DEVICE でドライバ選択（設計 §4.5）。
 * 新デバイスはここに case を1行足すだけ。実機ドライバ（m5-*, ajazz-akp153）は
 * 後続フェーズで追加する。既定は mock（実機なしで動く）。
 */
export function selectDevice(
  name: string = process.env.UMEPLAY_DEVICE ?? "mock",
): Device {
  switch (name) {
    case "mock":
      return new MockDevice();
    // case "m5-basic":     return new M5BasicDevice();      // TODO(P1+): M5Stack Basic/Core2
    // case "m5-cardputer": return new M5CardputerDevice();  // TODO(P1+): M5Cardputer
    // case "m5-stickc":    return new M5StickCDevice();     // TODO(P1+): M5StickC Plus
    // case "ajazz-akp153": return new AjazzAkp153Device();  // TODO(P1+): Ajazz AKP153 (Stream Deck系)
    default:
      throw new Error(`unknown UMEPLAY_DEVICE: ${name} (available: mock)`);
  }
}
