import { describe, it, expect } from "vitest";
import type { PlayEvent } from "../contracts/index.js";
import { EventBus } from "../packages/core-events/src/index.js";
import { initState, applyEvent as applyStar } from "../apps/agent-constellation/src/index.js";
import { initPet, applyEvent as applyPet } from "../apps/ume-tamagotchi/src/index.js";
import { initAquarium, feed } from "../apps/ascii-aquarium/src/index.js";
import { themeFor } from "../apps/chiptune-themes/src/index.js";

/**
 * 接続規約(§4.4)の実証: 1本の PlayEvent ストリームを、互いを知らない4アプリが
 * 同時に consume する。app 同士は import し合わない — 全て EventBus + PlayEvent 経由。
 */
describe("wiring: one event stream fans out to independent apps", () => {
  it("constellation / tamagotchi / aquarium / chiptune all react, decoupled", () => {
    const bus = new EventBus();

    let constellation = initState();
    let pet = initPet();
    let tank = initAquarium(20, 2);
    const soundsPlayed: string[] = [];

    // それぞれ独立に購読（互いの存在を知らない）
    bus.subscribe((e) => (constellation = applyStar(constellation, e)));
    bus.subscribe((e) => (pet = applyPet(pet, e)));
    bus.subscribe((e) => (tank = feed(tank, e)));
    bus.subscribe((e) => {
      if (themeFor(e)) soundsPlayed.push(e.kind);
    });

    const stream: PlayEvent[] = [
      { kind: "agent.dispatch", from: "cc", to: "codex", task: "impl" },
      { kind: "task.done", project: "投稿" },
      { kind: "agent.collapse", agent: "codex", rate: 0.2 },
      { kind: "gate.pending", label: "承認待ち" },
      { kind: "deploy.success" },
    ];
    for (const e of stream) bus.emit(e);

    // constellation: dispatch で星座線・collapse で赤星
    expect(constellation.edges).toHaveLength(1);
    expect(constellation.stars.find((s) => s.agent === "codex")?.collapsed).toBe(true);

    // tamagotchi: 投稿で mood↑・gate.pending で energy↓・deploy で両↑
    expect(pet.mood).toBeGreaterThan(50);

    // aquarium: task.done で魚が1匹増える（2→3）
    expect(tank.fish).toHaveLength(3);

    // chiptune: 音の出るイベントだけ拾う（collapse / gate.pending / deploy.success）
    expect(soundsPlayed).toEqual(["agent.collapse", "gate.pending", "deploy.success"]);
  });
});
