import type { PlayEvent, Producer } from "@toygarden/contracts";

/** ローカル時刻の YYYYMMDD を整数で返す（例: 2026-07-16 → 20260716） */
export function dateSeed(date: Date): number {
  return date.getFullYear() * 10_000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export interface ClockOptions {
  intervalMs?: number;
  now?: () => number;
  timer?: {
    setInterval(fn: () => void, ms: number): ReturnType<typeof setInterval>;
    clearInterval(id: ReturnType<typeof setInterval>): void;
  };
}

/**
 * intervalMs ごとに clock.tick { at: now() } を発行する Producer。
 * tick 時に now() の「時」(new Date(at).getHours()) が前回 tick の「時」と異なれば
 * clock.chime { hour, at } も続けて発行する（初回 tick は chime しない）。
 * start はしない — subscribe が 1 件以上になった時点で timer 開始、0 件に戻るか stop() で停止。
 */
export function createClock(opts: ClockOptions = {}): Producer & { stop(): void } {
  const intervalMs = opts.intervalMs ?? 1_000;
  const now = opts.now ?? (() => Date.now());
  const timer = opts.timer ?? {
    setInterval: (fn: () => void, ms: number) => globalThis.setInterval(fn, ms),
    clearInterval: (id: ReturnType<typeof setInterval>) => globalThis.clearInterval(id),
  };
  const handlers = new Set<(event: PlayEvent) => void>();
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let previousHour: number | undefined;

  const tick = (): void => {
    const at = now();
    const hour = new Date(at).getHours();
    const tickEvent: PlayEvent = { kind: "clock.tick", at };

    for (const handler of handlers) handler(tickEvent);
    if (previousHour !== undefined && hour !== previousHour) {
      const chimeEvent: PlayEvent = { kind: "clock.chime", hour, at };
      for (const handler of handlers) handler(chimeEvent);
    }
    previousHour = hour;
  };

  const stop = (): void => {
    if (intervalId !== undefined) {
      timer.clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  return {
    subscribe(handler) {
      handlers.add(handler);
      if (intervalId === undefined) intervalId = timer.setInterval(tick, intervalMs);

      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) stop();
      };
    },
    stop,
  };
}
