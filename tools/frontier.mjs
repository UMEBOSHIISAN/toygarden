/**
 * frontier.mjs — 「組み合わせの開拓地図」を demo/frontier.gif に焼く。
 *
 *   npm run frontier
 *
 * コンセプト: packages/core-* は 8 個ある（contracts は別枠なので除外）。
 * 8 個から 2 個を選ぶ組み合わせは 8x8 の下三角 = 28 通り。そのうち「両方を同時に
 * uses する既存アプリが demo/gifs/manifest.json に実在する組」は埋まったマス、
 * 存在しない組は誰も作っていないフロンティア（暗いマスに "?" が明滅する）。
 * N（探索済み）/ M（未探索）は manifest.json から実計算する（ハードコード禁止）。
 *
 * banner.mjs / diagram.mjs と同じ流儀: core-termgif の低レベル API
 * （encodeGif / glyph / hasGlyph / isWide / seeded）を直接使い、rect合成と
 * pixel座標の自前レイアウトで焼く。乱数は seeded() のみ（同じコード→同じバイト列）。
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync, statSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(new URL("..", import.meta.url).pathname);
const outFile = join(root, "demo", "frontier.gif");
const tmpDir = join(root, "dist", "demos");
mkdirSync(join(root, "demo"), { recursive: true });
mkdirSync(tmpDir, { recursive: true });

async function bundle(entry, name) {
  const outfile = join(tmpDir, `${name}.mjs`);
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    tsconfig: join(root, "tsconfig.json"),
    outfile,
    logLevel: "silent",
  });
  return outfile;
}

const { encodeGif, glyph, hasGlyph, isWide, seeded } = await import(
  pathToFileURL(await bundle(join(root, "packages", "core-termgif", "src", "index.ts"), "core-termgif")).href
);

// --- データ層: core 一覧 + manifest から実際の共起ペアを算出 --------------
// ラベル/アイコン/色は表示メタ情報のみ。どの2つが「探索済み」かは一切ここに書かず、
// 下の集計ロジックが manifest.json を読んで決める。
// label は4文字以下に固定する: HEADER_SCALE=1(8px/字)・CELL=48pxの列見出しで
// 6文字ラベル(旧 "events"/"device")がちょうど列幅いっぱいになり、中央寄せの余白が
// ゼロになって隣接列と密着する事故があったため（"deviceevents" に見えた）。
// 4文字以下(<=32px)なら (CELL-32)/2=8px の余白が両側に必ず残る。
const CORE_META = {
  "core-events": { label: "evt", icon: "@", rgb: [63, 185, 80] },
  "core-device": { label: "dev", icon: "#", rgb: [88, 166, 255] },
  "core-git-observe": { label: "git", icon: "+", rgb: [219, 109, 40] },
  "core-chiptune": { label: "tune", icon: "♪", rgb: [188, 140, 242] },
  "core-tui": { label: "tui", icon: "=", rgb: [57, 197, 207] },
  "core-worker-data": { label: "work", icon: "$", rgb: [210, 153, 34] },
  "core-focus-log": { label: "foc", icon: "^", rgb: [219, 80, 120] },
  "core-termgif": { label: "gif", icon: "*", rgb: [140, 148, 158] },
};

const CORES = readdirSync(join(root, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("core-"))
  .map((d) => d.name)
  .sort();

if (CORES.length !== 8) {
  throw new Error(
    `frontier.mjs: packages/core-* が8個ではない（実測${CORES.length}件）。8x8マトリクス前提のレイアウトが崩れている。`,
  );
}
for (const name of CORES) {
  if (!CORE_META[name]) {
    throw new Error(`frontier.mjs: 未知の core パッケージ "${name}" の表示メタ情報（label/icon/color）が未定義`);
  }
}

const manifest = JSON.parse(readFileSync(join(root, "demo", "gifs", "manifest.json"), "utf8"));
const coreIndex = new Map(CORES.map((name, i) => [name, i]));

/** "loIdx-hiIdx" -> 最初にその組を実現した app 名（contracts は除外済み）。 */
const pairOwner = new Map();
for (const app of manifest) {
  const usedCores = (app.uses ?? []).filter((u) => coreIndex.has(u));
  for (let a = 0; a < usedCores.length; a++) {
    for (let b = a + 1; b < usedCores.length; b++) {
      const i = coreIndex.get(usedCores[a]);
      const j = coreIndex.get(usedCores[b]);
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const key = `${lo}-${hi}`;
      if (!pairOwner.has(key)) pairOwner.set(key, app.name);
    }
  }
}

const TOTAL_PAIRS = (CORES.length * (CORES.length - 1)) / 2;
if (TOTAL_PAIRS !== 28) {
  throw new Error(`frontier.mjs: 総組み合わせ数が28にならない（実測${TOTAL_PAIRS}）。CORES.length=${CORES.length}`);
}
const EXPLORED = pairOwner.size;
const UNEXPLORED = TOTAL_PAIRS - EXPLORED;

// グリッドのセル一覧を先に確定する。row(視覚行 0..6) は CORES[row+1]、col(視覚列 0..row) は
// CORES[col]。row+1 > col が常に成り立つので下三角 1+2+...+7=28 マスちょうどになる。
const cells = [];
for (let row = 0; row < 7; row++) {
  for (let col = 0; col <= row; col++) {
    const colCoreIdx = col;
    const rowCoreIdx = row + 1;
    const key = `${colCoreIdx}-${rowCoreIdx}`;
    cells.push({ row, col, colCoreIdx, rowCoreIdx, key, owner: pairOwner.get(key) });
  }
}
if (cells.length !== TOTAL_PAIRS) {
  throw new Error(`frontier.mjs: セル生成数 ${cells.length} が TOTAL_PAIRS=${TOTAL_PAIRS} と食い違う`);
}
if (cells.filter((c) => c.owner).length !== EXPLORED) {
  throw new Error("frontier.mjs: セル一覧の explored 数が pairOwner.size と食い違う");
}

// --- キャンバス定数 -------------------------------------------------------
const WIDTH = 960;
const CELL = 48;
const ROWS = 7;
const COLS = 7;
const ROW_LABEL_W = 64;
const TITLE_SCALE = 2;
const HEADER_SCALE = 1;
const CAPTION_SCALE = 1;
const ICON_SCALE = 2;

const FPS = 6;
const FRAMES = 24;
const DELAY_CS = Math.max(2, Math.round(100 / FPS));

const TITLE = "FRONTIER MAP";
const CAPTION = `${TOTAL_PAIRS} combinations possible - ${EXPLORED} explored, ${UNEXPLORED} unexplored. The empty cells are yours.`;

// --- パレット -------------------------------------------------------------
const BG = [13, 17, 23];
const VOID = [24, 28, 36]; // 未探索マスの下地（BGよりわずかに明るい「空きスロット」）
const BORDER = [58, 64, 74]; // グリッド罫線
const FG = [201, 209, 217];
const DIM = [90, 97, 107]; // ラベル・未点灯の "?"
const SPOTLIGHT = [255, 214, 92]; // 点灯中の "?" だけが持つ専用色（core色と衝突させない）

function scaleColor(c, f) {
  return c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
}

const palette = [];
const colorCache = new Map();
function reg(rgb) {
  const key = rgb.join(",");
  const hit = colorCache.get(key);
  if (hit !== undefined) return hit;
  const idx = palette.length;
  if (idx >= 256) throw new Error("frontier.mjs: パレットが256色を超過した");
  palette.push(rgb);
  colorCache.set(key, idx);
  return idx;
}

const BG_IDX = reg(BG); // index 0 = 背景（gif.ts の規約どおり）
const VOID_IDX = reg(VOID);
const BORDER_IDX = reg(BORDER);
const FG_IDX = reg(FG);
const DIM_IDX = reg(DIM);
const SPOTLIGHT_IDX = reg(SPOTLIGHT);

const coreBaseIdx = new Map();
const coreBoldIdx = new Map();
for (const name of CORES) {
  const { rgb } = CORE_META[name];
  coreBaseIdx.set(name, reg(rgb));
  coreBoldIdx.set(name, reg(scaleColor(rgb, 1.3)));
}

// 探索済みペアごとの見た目（下地の淡色 + 縁の実色）を先に確定する。
const exploredStyle = new Map();
for (const cell of cells) {
  if (!cell.owner) continue;
  const rgbA = CORE_META[CORES[cell.colCoreIdx]].rgb;
  const rgbB = CORE_META[CORES[cell.rowCoreIdx]].rgb;
  const blend = [0, 1, 2].map((k) => Math.round((rgbA[k] + rgbB[k]) / 2));
  exploredStyle.set(cell.key, {
    fillIdx: reg(scaleColor(blend, 0.32)),
    borderIdx: reg(scaleColor(blend, 1.15)),
  });
}

const C = (rgb) => reg(rgb);

// --- 低レベル描画（banner.mjs / diagram.mjs と同じ流儀） ------------------
let HEIGHT = 0; // レイアウト計算後に確定する（fillRect の境界チェックで使う）

function assertGlyph(ch) {
  if (ch === " ") return;
  const cp = ch.codePointAt(0);
  if (!hasGlyph(cp)) {
    throw new Error(
      `frontier.mjs: グリフ未定義の文字 "${ch}" (U+${cp.toString(16).padStart(4, "0")}) はフォントに無い` +
        `（塗りつぶしブロックで代替されて表示が壊れる）。絵文字は使えない。`,
    );
  }
}

function drawGlyph(buf, x0, y0, cp, colorIdx, scale) {
  const bits = glyph(cp);
  for (let gy = 0; gy < 8; gy++) {
    const row = bits[gy];
    if (row === 0) continue;
    for (let gx = 0; gx < 8; gx++) {
      if (!(row & (1 << gx))) continue;
      const px0 = x0 + gx * scale;
      const py0 = y0 + gy * scale;
      for (let dy = 0; dy < scale; dy++) {
        const rowOff = (py0 + dy) * WIDTH;
        for (let dx = 0; dx < scale; dx++) buf[rowOff + px0 + dx] = colorIdx;
      }
    }
  }
}

function charAdvance(ch, scale) {
  return (ch !== " " && isWide(ch.codePointAt(0)) ? 16 : 8) * scale;
}

function textWidth(text, scale) {
  let w = 0;
  for (const ch of text) w += charAdvance(ch, scale);
  return w;
}

function drawText(buf, x0, y0, text, colorIdx, scale) {
  let x = x0;
  for (const ch of text) {
    assertGlyph(ch);
    if (ch !== " ") drawGlyph(buf, x, y0, ch.codePointAt(0), colorIdx, scale);
    x += charAdvance(ch, scale);
  }
  return x;
}

function centerX(text, scale) {
  return Math.max(0, Math.floor((WIDTH - textWidth(text, scale)) / 2));
}

function fillRect(buf, x0, y0, w, h, colorIdx) {
  for (let yy = Math.max(0, y0); yy < Math.min(HEIGHT, y0 + h); yy++) {
    const rowOff = yy * WIDTH;
    for (let xx = Math.max(0, x0); xx < Math.min(WIDTH, x0 + w); xx++) buf[rowOff + xx] = colorIdx;
  }
}

function drawCellBorder(buf, x0, y0, w, h, colorIdx) {
  fillRect(buf, x0, y0, w, 1, colorIdx);
  fillRect(buf, x0, y0 + h - 1, w, 1, colorIdx);
  fillRect(buf, x0, y0, 1, h, colorIdx);
  fillRect(buf, x0 + w - 1, y0, 1, h, colorIdx);
}

// --- 文字検証（起動時に一度だけ。グリフ未定義があればここで即 throw） ------
for (const text of [TITLE, CAPTION, "?", ...Object.values(CORE_META).flatMap((m) => [m.label, m.icon])]) {
  for (const ch of text) assertGlyph(ch);
}

// 列見出しラベルが密着する事故（"deviceevents" のように隣接列と1語に見える）の再発防止。
// 列幅 CELL に対して最低8px（1文字分の空白グリフ相当）の余白を両側に残せる幅か検証する。
const MIN_HEADER_GAP_PX = 8;
for (const name of CORES) {
  const label = CORE_META[name].label;
  const w = textWidth(label, HEADER_SCALE);
  if (w > CELL - MIN_HEADER_GAP_PX * 2) {
    throw new Error(
      `frontier.mjs: core "${name}" のラベル "${label}" (幅${w}px) が列幅 ${CELL}px に対して狭すぎる` +
        `（両側最低${MIN_HEADER_GAP_PX}pxの余白を確保できず隣接列と密着する）。ラベルを短縮すること。`,
    );
  }
}

// --- レイアウト（pixel 座標を直接固定。逆算して HEIGHT を確定する） --------
const TITLE_H = 8 * TITLE_SCALE;
const GAP_TITLE = 14;
const COLHEAD_H = 8 * HEADER_SCALE;
const GAP_HEAD = 6;
const MATRIX_H = ROWS * CELL;
const GAP_MATRIX_CAPTION = 22;
const CAPTION_H = 8 * CAPTION_SCALE;
const BOTTOM_MARGIN = 24;
const MARGIN = 24;

let y = MARGIN;
const TITLE_Y = y;
y += TITLE_H + GAP_TITLE;
const COLHEAD_Y = y;
y += COLHEAD_H + GAP_HEAD;
const MATRIX_Y0 = y;
y += MATRIX_H + GAP_MATRIX_CAPTION;
const CAPTION_Y = y;
y += CAPTION_H + BOTTOM_MARGIN;
HEIGHT = y;

if (HEIGHT < 400 || HEIGHT > 560) {
  throw new Error(`frontier.mjs: レイアウト計算後の高さ ${HEIGHT}px が許容範囲 400〜560px を外れている`);
}

const MATRIX_BLOCK_W = ROW_LABEL_W + COLS * CELL;
const BLOCK_X0 = Math.floor((WIDTH - MATRIX_BLOCK_W) / 2);
const MATRIX_X0 = BLOCK_X0 + ROW_LABEL_W;
if (MATRIX_X0 + COLS * CELL + BLOCK_X0 !== WIDTH) {
  throw new Error("frontier.mjs: マトリクスが左右中央からずれている");
}

// --- 静的レイヤー（毎フレーム同一の部分は1回だけ描く） ---------------------
const staticBuf = new Uint8Array(WIDTH * HEIGHT);
drawText(staticBuf, centerX(TITLE, TITLE_SCALE), TITLE_Y, TITLE, FG_IDX, TITLE_SCALE);

for (let col = 0; col < COLS; col++) {
  const label = CORE_META[CORES[col]].label;
  const x = MATRIX_X0 + col * CELL + Math.floor((CELL - textWidth(label, HEADER_SCALE)) / 2);
  drawText(staticBuf, x, COLHEAD_Y, label, coreBaseIdx.get(CORES[col]), HEADER_SCALE);
}
for (let row = 0; row < ROWS; row++) {
  const coreName = CORES[row + 1];
  const label = CORE_META[coreName].label;
  const x = MATRIX_X0 - 8 - textWidth(label, HEADER_SCALE);
  const yy = MATRIX_Y0 + row * CELL + Math.floor((CELL - 8 * HEADER_SCALE) / 2);
  drawText(staticBuf, x, yy, label, coreBaseIdx.get(coreName), HEADER_SCALE);
}

for (const cell of cells) {
  const x0 = MATRIX_X0 + cell.col * CELL;
  const y0 = MATRIX_Y0 + cell.row * CELL;
  if (cell.owner) {
    const { fillIdx, borderIdx } = exploredStyle.get(cell.key);
    fillRect(staticBuf, x0, y0, CELL, CELL, fillIdx);
    drawCellBorder(staticBuf, x0, y0, CELL, CELL, borderIdx);
  } else {
    fillRect(staticBuf, x0, y0, CELL, CELL, VOID_IDX);
    drawCellBorder(staticBuf, x0, y0, CELL, CELL, BORDER_IDX);
  }
}

drawText(staticBuf, centerX(CAPTION, CAPTION_SCALE), CAPTION_Y, CAPTION, DIM_IDX, CAPTION_SCALE);

// --- 未探索マスの点灯順（seeded シャッフル。フレームごとに違うマスが光る宝探し演出） ---
const unexploredKeys = cells.filter((c) => !c.owner).map((c) => c.key);
const shuffleRnd = seeded(20260709);
const spotlightOrder = unexploredKeys.slice();
for (let i = spotlightOrder.length - 1; i > 0; i--) {
  const j = Math.floor(shuffleRnd() * (i + 1));
  [spotlightOrder[i], spotlightOrder[j]] = [spotlightOrder[j], spotlightOrder[i]];
}

// --- フレーム構築 -----------------------------------------------------------
function buildFrame(f) {
  const buf = staticBuf.slice();

  const spotlightKey = spotlightOrder.length > 0 ? spotlightOrder[f % spotlightOrder.length] : null;

  for (const cell of cells) {
    const x0 = MATRIX_X0 + cell.col * CELL;
    const y0 = MATRIX_Y0 + cell.row * CELL;
    if (cell.owner) {
      // 生きて見せる: 組を成す2つの core 自身の色を、非同期な位相でゆっくり入れ替える。
      const phase = (cell.row * 3 + cell.col * 5) % 6;
      const useA = (f + phase) % 6 < 3;
      const coreName = useA ? CORES[cell.colCoreIdx] : CORES[cell.rowCoreIdx];
      const icon = CORE_META[coreName].icon;
      const iconColor = coreBoldIdx.get(coreName);
      const ix = x0 + Math.floor((CELL - charAdvance(icon, ICON_SCALE)) / 2);
      const iy = y0 + Math.floor((CELL - 8 * ICON_SCALE) / 2);
      drawText(buf, ix, iy, icon, iconColor, ICON_SCALE);
    } else {
      const lit = cell.key === spotlightKey;
      const scale = lit ? 3 : 2;
      const colorIdx = lit ? SPOTLIGHT_IDX : DIM_IDX;
      const qx = x0 + Math.floor((CELL - 8 * scale) / 2);
      const qy = y0 + Math.floor((CELL - 8 * scale) / 2);
      drawGlyph(buf, qx, qy, "?".codePointAt(0), colorIdx, scale);
    }
  }

  return { indices: buf, delayCs: DELAY_CS };
}

const frames = Array.from({ length: FRAMES }, (_, f) => buildFrame(f));
const gif = encodeGif(WIDTH, HEIGHT, palette, frames);
writeFileSync(outFile, gif);

const kb = Math.round(statSync(outFile).size / 1024);
console.log(
  `OK demo/frontier.gif  ${WIDTH}x${HEIGHT}  ${FRAMES}f @${FPS}fps  ${kb}KB  ` +
    `cores=${CORES.length} pairs=${TOTAL_PAIRS} explored=${EXPLORED} unexplored=${UNEXPLORED}`,
);
