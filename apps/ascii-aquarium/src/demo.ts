/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * `npm run gifs` が拾って demo/gifs/ascii-aquarium.gif を再生成する。
 */
import { seeded, type DemoSpec } from "@umeplay/core-termgif";
import { initAquarium, step, feed, render } from "./index.ts";
import { colorize } from "./color.ts";

const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

export function demo(): DemoSpec {
  // 水槽ロジックは Math.random を使うので、デモ生成中だけ seeded に差し替える
  const orig = Math.random;
  Math.random = seeded(1207);
  try {
    let tank = initAquarium();
    const frames: string[] = [];
    for (let i = 0; i < 36; i++) {
      tank = step(tank);
      if (i % 9 === 4) tank = feed(tank, { kind: "task.done", project: "投稿" });
      const header = `  ${CYAN}~ umeplay aquarium ~${RESET}  ${DIM}task.done adds a fish${RESET}`;
      frames.push(header + "\n" + colorize(render(tank), tank.night));
    }
    return {
      name: "ascii-aquarium",
      fps: 7,
      frames,
      uses: ["contracts"],
      tagline: "An ASCII fish tank that gains a fish on every task.done. A moon rises at night.",
    };
  } finally {
    Math.random = orig;
  }
}
