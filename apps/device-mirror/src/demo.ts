/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/device-mirror.gif を再生成する。
 * PlayEvent 風シナリオ（投稿 → 承認待ち → deploy成功 → dispatch → route）を
 * 実際の mirror()/applyDraw 等を叩いて液晶へ描き、途中で seeded 乱数によりボタン押下も挟む。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import { seeded } from "@umeplay/core-termgif";
import { MockDevice } from "@umeplay/core-device";
import type { PlayEvent } from "@umeplay/contracts";
import { mirror, labelFor, ledFor } from "./index.ts";
import { renderGadget } from "./view.ts";

// event.project 等の文字列は labelFor() 経由でそのまま液晶(=GIFフレーム)へ描かれるため、
// demo 専用シナリオでは漢字を使わずひらがなで書く（cli.ts の SCRIPT は OS フォント表示なので
// 実際の project 名「投稿」のままでよい。demo と cli で文言が割れているのは意図的）。
const SCRIPT: { event: PlayEvent; caption: string }[] = [
  { event: { kind: "task.done", project: "とうこう" }, caption: "とうこう done" },
  { event: { kind: "task.done", project: "とうこう" }, caption: "とうこう done" },
  { event: { kind: "gate.pending", label: "review" }, caption: "しょうにん まち..." },
  { event: { kind: "agent.dispatch", from: "cc", to: "codex", task: "impl" }, caption: "dispatch" },
  { event: { kind: "worker.route", taxonomy: "impl", worker: "codex", confidence: 0.8 }, caption: "route ok" },
  { event: { kind: "deploy.success" }, caption: "でぷろい OK" },
];

export function demo(): DemoSpec {
  const rnd = seeded(11);
  const device = new MockDevice();
  const dev = mirror(device);
  const frames: string[] = [];

  for (const { event, caption } of SCRIPT) {
    dev.draw({ op: "clear" });
    dev.draw({ op: "text", x: 8, y: 8, text: labelFor(event) });
    dev.draw({ op: "text", x: 8, y: 8 + 16, text: caption });
    dev.led(ledFor(event));
    dev.flush();
    frames.push(renderGadget(dev.snapshot()));
    frames.push(renderGadget(dev.snapshot()));

    // ボタン押下シミュレート（seeded 乱数）。押した直後の1コマだけハイライトさせ、次で解除。
    if (rnd() > 0.5) {
      const button = Math.floor(rnd() * 3);
      device.pressButton(button);
      frames.push(renderGadget(dev.snapshot()));
      dev.release();
      frames.push(renderGadget(dev.snapshot()));
    }
  }

  return {
    name: "device-mirror",
    fps: 4,
    frames,
    uses: ["core-device"],
    tagline: "実機を買う前に、実機が見える。M5Stack風ガジェットにHALのDrawCommandをミラー",
  };
}
