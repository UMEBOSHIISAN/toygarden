import { cpus, freemem, loadavg, totalmem } from "node:os";

/**
 * sysmon.ts — マシンの忙しさ(busyness)を 0..1 に正規化する。
 * 副作用（node:os 呼び出し）と純ロジックを分離する（設計 §1）。
 */

/** 正規化済みサンプル（純ロジックの出力）。 */
export type SysmonSample = {
  cpuRatio: number; // 0..1（前回との差分から計算）
  memRatio: number; // 0..1
  loadRatio: number; // 0..1（loadavg / logicalCores）
  busyness: number; // 0..1（上記3つの重み付き平均）
};

/**
 * node:os から集めた生データ。cpus() のプロパティ構造は OS によって微妙に揺らぐため、
 * ここでは idle/total の集計値だけを詰める（構造そのものは持ち込まない）。
 */
export type SysmonContext = {
  totalMem: number;
  freeMem: number;
  loadavg: number[];
  cpuTimes: { idle: number; total: number };
  logicalCores: number;
};

const WEIGHT_CPU = 0.5;
const WEIGHT_MEM = 0.3;
const WEIGHT_LOAD = 0.2;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * CPU の前回アイドル/合計時間を内部状態として持つクロージャを返す（差分計算のためステートフル）。
 * 初回呼び出しはベースライン確立のみで cpuRatio: 0 を返す。
 */
export function createSysmonCalculator(): (ctx: SysmonContext) => SysmonSample {
  let prevIdle: number | null = null;
  let prevTotal: number | null = null;

  return (ctx: SysmonContext): SysmonSample => {
    let cpuRatio = 0;
    if (prevIdle !== null && prevTotal !== null) {
      const idleDelta = ctx.cpuTimes.idle - prevIdle;
      const totalDelta = ctx.cpuTimes.total - prevTotal;
      cpuRatio = totalDelta > 0 ? clamp01(1 - idleDelta / totalDelta) : 0;
    }
    prevIdle = ctx.cpuTimes.idle;
    prevTotal = ctx.cpuTimes.total;

    const memRatio = ctx.totalMem > 0 ? clamp01(1 - ctx.freeMem / ctx.totalMem) : 0;
    const loadRatio = ctx.logicalCores > 0 ? clamp01((ctx.loadavg[0] ?? 0) / ctx.logicalCores) : 0;
    const busyness = clamp01(cpuRatio * WEIGHT_CPU + memRatio * WEIGHT_MEM + loadRatio * WEIGHT_LOAD);

    return { cpuRatio, memRatio, loadRatio, busyness };
  };
}

/** 副作用境界: node:os から現在のスナップショットを取る（テスト対象外）。 */
export function getSysmonContext(): SysmonContext {
  const cpuList = cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpuList) {
    idle += cpu.times.idle;
    for (const t of Object.values(cpu.times)) total += t;
  }
  return {
    totalMem: totalmem(),
    freeMem: freemem(),
    loadavg: loadavg(),
    cpuTimes: { idle, total },
    logicalCores: cpuList.length,
  };
}

/**
 * ポーリングヘルパー（任意のイベントバスに依存しないコールバック形式）。
 * 戻り値の関数を呼ぶとタイマーを止める。
 */
export function startSysmonFeed(
  callback: (sample: SysmonSample) => void,
  intervalMs = 2000,
): () => void {
  const calculate = createSysmonCalculator();
  const timer = setInterval(() => {
    callback(calculate(getSysmonContext()));
  }, intervalMs);
  return () => clearInterval(timer);
}
