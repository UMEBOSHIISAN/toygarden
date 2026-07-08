import { startSysmonFeed, type SysmonSample } from "@umeplay/core-sysmon";

/**
 * cpu-diner — an ASCII diner whose crowd swells and thins with your machine's CPU busyness.
 * sysmon の busyness に合わせてドット絵レストランの込み具合が変化するおもちゃ。
 * dinerLogic / renderDiner は純関数（GIF・テストの決定論を守るため乱数は state.seed からのみ導く）。
 */

export type CpuDinerOptions = {
  /** 決定論モード。GIF録画用に sysmon から離れ、固定の busyness (0..1) を注入できるようにする */
  mockBusyness?: number;
  /** 描画フレームレート（既定 8 FPS） */
  frameRate?: number;
};

export type CpuDinerState = {
  customers: number; // 0..20
  staffAwake: boolean; // busyness <= 0.2 だと false (居眠り)
  seed: number; // おもちゃの進行用乱数シード (決定論用)
};

const MAX_CUSTOMERS = 20;
const MAX_STEP_PER_TICK = 3;
const AWAKE_THRESHOLD = 0.2;

// 店内レイアウト（renderDiner 専用の描画定数）。テーブル満席分を超えた客は行列になる。
const TABLE_COUNT = 4;
const SEATS_PER_TABLE = 4;
const SEATED_CAPACITY = TABLE_COUNT * SEATS_PER_TABLE; // 16 (残り 4 人ぶんは行列)

/** 初期状態。cli / demo の両方から使う共通の起点。 */
export function initDinerState(seed = 1): CpuDinerState {
  return { customers: 0, staffAwake: true, seed };
}

/** state.seed だけから進める決定論的な次シード（mulberry32 のステップ）。 */
function nextSeed(seed: number): number {
  return (seed + 0x6d2b79f5) | 0;
}

/** state.seed から 0..1 の決定論的な擬似乱数を1つ取り出す（依存ゼロ・外部乱数源に頼らない）。 */
function randomFromSeed(seed: number): number {
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * 純ロジック（テスト対象）: busyness を1ティック分適用して次の状態を返す。
 * 客数は busyness に比例した目標値へ、乱数込みの有限ステップで近づく（急変しない）。
 * seed 進行だけが乱数源なので、同一 seed + 同一 busyness 列は常に同一の遷移を描く。
 */
export function dinerLogic(state: CpuDinerState, busyness: number): CpuDinerState {
  const b = clamp01(busyness);
  const seed = nextSeed(state.seed);
  const rnd = randomFromSeed(seed);

  const staffAwake = b > AWAKE_THRESHOLD;

  const target = b * MAX_CUSTOMERS;
  const diff = target - state.customers;
  const step = Math.min(MAX_STEP_PER_TICK, Math.abs(diff)) * (0.5 + rnd * 0.5);
  const moved = state.customers + Math.sign(diff) * step;
  const customers = Math.max(0, Math.min(MAX_CUSTOMERS, Math.round(moved)));

  return { customers, staffAwake, seed };
}

/** customers を「席についた人数(テーブル毎)」と「行列の人数」へ純粋に振り分ける。 */
function seatingFor(customers: number): { tables: number[]; queue: number } {
  const seated = Math.min(customers, SEATED_CAPACITY);
  const queue = customers - seated;
  const tables: number[] = [];
  let remaining = seated;
  for (let i = 0; i < TABLE_COUNT; i++) {
    const fill = Math.min(SEATS_PER_TABLE, remaining);
    tables.push(fill);
    remaining -= fill;
  }
  return { tables, queue };
}

/** 1テーブルぶんの座席を "o" (着席) / "." (空席) で描く。 */
function tableRow(label: string, fill: number): string {
  const seats = Array.from({ length: SEATS_PER_TABLE }, (_, i) => (i < fill ? "o" : ".")).join(" ");
  return `  ${label} [${seats}]`;
}

/**
 * TUI 描画ロジック（純関数）: 状態から文字列配列を返す。画面制御(clear等)はここに書かない。
 * customers/staffAwake だけでなく state.seed（毎ティック進む）も使い、湯気やコンロの火を
 * 揺らす — dinerLogic を通るたびに絵が動いて見えるが、renderDiner 自体はあくまで純関数のまま。
 */
export function renderDiner(state: CpuDinerState): string[] {
  const { tables, queue } = seatingFor(state.customers);
  const flicker = (((state.seed % 2) + 2) % 2) === 0; // 32bit seed は負にもなるので正規化してから判定

  const stove = state.staffAwake ? "[==stove==]" : "[..stove..]";
  const steam = state.staffAwake ? (flicker ? "  ~ ~ ~" : "   ~ ~") : "";
  const chef = state.staffAwake
    ? flicker
      ? "chef: ( ^_^)  sizzle sizzle!"
      : "chef: ( ^o^)  sizzle sizzle!"
    : "chef: (-_-)  zzz  zzz  zzz";

  const queueLine =
    queue > 0
      ? `  queue outside: ${"o ".repeat(queue).trimEnd()}  (${queue} waiting for a table)`
      : "  queue outside: (nobody waiting)";

  const gaugeFilled = "o".repeat(state.customers);
  const gaugeEmpty = ".".repeat(MAX_CUSTOMERS - state.customers);
  const status = queue > 0 ? "FULL HOUSE - LINE OUT THE DOOR" : state.staffAwake ? "BUSY" : "QUIET";

  return [
    "~ cpu diner ~  hungry for your CPU cycles",
    "",
    "  == kitchen ==",
    `  ${stove}${steam}`,
    `  ${chef}`,
    "",
    "  == dining room ==",
    tableRow("table1", tables[0]),
    tableRow("table2", tables[1]),
    tableRow("table3", tables[2]),
    tableRow("table4", tables[3]),
    "",
    queueLine,
    "",
    `  customers [${gaugeFilled}${gaugeEmpty}] ${state.customers}/${MAX_CUSTOMERS}`,
    `  status: ${status}`,
  ];
}

const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\x1b[2J\x1b[H";

/**
 * おもちゃのエントリーポイント（副作用境界）。
 * mockBusyness 指定時は決定論モード（GIF録画・キャプチャ用）、未指定時は実 sysmon で動く。
 * 戻り値の stop 関数を呼ぶとフィードを止めてカーソルを復帰する。
 */
export function playCpuDiner(options: CpuDinerOptions = {}): () => void {
  const frameRate = options.frameRate ?? 8;
  const intervalMs = Math.max(1, Math.round(1000 / frameRate));
  let state = initDinerState();

  process.stdout.write(HIDE);

  const draw = (busyness: number): void => {
    state = dinerLogic(state, busyness);
    process.stdout.write(CLEAR + renderDiner(state).join("\n") + "\n");
  };

  const stopFeed =
    options.mockBusyness !== undefined
      ? (() => {
          const mocked = options.mockBusyness as number;
          const timer = setInterval(() => draw(mocked), intervalMs);
          return (): void => clearInterval(timer);
        })()
      : startSysmonFeed((sample: SysmonSample) => draw(sample.busyness), intervalMs);

  return (): void => {
    stopFeed();
    process.stdout.write(SHOW);
  };
}
