/**
 * demo.ts — GIF 用デモ（DemoSpec 規約・決定論的）。
 * demoStream() を EventBus に流し、cli.ts と同じミッションコントロール画面を再現する。
 */
import type { DemoSpec } from "@umeplay/core-termgif";
import { EventBus } from "@umeplay/core-events";
import { label, tally, renderDashboard, demoStream, type Counts } from "./index.ts";

const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

export function demo(): DemoSpec {
  const bus = new EventBus();
  let recent: string[] = [];
  let counts: Counts = {};
  bus.subscribe((e) => {
    recent = [...recent, "  " + label(e)].slice(-8);
  });
  bus.subscribe((e) => {
    counts = tally(counts, e);
  });

  const stream = demoStream();
  const frames: string[] = [];
  const TOTAL = stream.length * 2; // 1本のバスを2周させる
  for (let i = 0; i < TOTAL; i++) {
    bus.emit(stream[i % stream.length]);
    const header = `  ${CYAN}~ event-loom ~${RESET}  ${DIM}1 bus -> 2 subscribers${RESET}`;
    frames.push(header + "\n" + renderDashboard(recent, counts));
  }
  return {
    name: "event-loom",
    fps: 6,
    frames,
    uses: ["core-events", "core-tui", "contracts"],
    tagline: "1本のイベントバスに疎結合な複数の購読者がそのまま繋がる",
  };
}
