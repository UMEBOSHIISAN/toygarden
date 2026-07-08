/**
 * showcase.mjs — demo/gifs/manifest.json から demo/index.html（ショーケース）を生成する。
 *
 *   npm run showcase   （npm run gifs の後に実行）
 *
 * GIF と同じく「コードから再現できるデモ画面」。手で HTML を直さない。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const manifest = JSON.parse(readFileSync(join(root, "demo", "gifs", "manifest.json"), "utf8"));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const totalFrames = manifest.reduce((sum, m) => sum + m.frames, 0);
const totalKb = manifest.reduce((sum, m) => sum + m.kb, 0);

const useCounts = new Map();
for (const m of manifest) {
  for (const u of m.uses) useCounts.set(u, (useCounts.get(u) ?? 0) + 1);
}
const allUses = [...useCounts.keys()].sort(
  (a, b) => useCounts.get(b) - useCounts.get(a) || a.localeCompare(b),
);

const filterChips = [
  `<button class="chip active" data-filter="all">all <span class="n">${manifest.length}</span></button>`,
  ...allUses.map(
    (u) =>
      `<button class="chip" data-filter="${esc(u)}">${esc(u)} <span class="n">${useCounts.get(u)}</span></button>`,
  ),
].join("\n      ");

const cards = manifest
  .map(
    (m) => `    <figure class="card" data-uses="${esc(m.uses.join(" "))}">
      <img src="gifs/${m.file}" alt="${esc(m.name)}" loading="lazy">
      <figcaption>
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.tagline)}</p>
        <div class="meta">
          ${m.uses.map((u) => `<span class="badge">${esc(u)}</span>`).join("\n          ")}
          <span class="dim">${m.frames}f @${m.fps}fps · ${m.kb}KB</span>
        </div>
      </figcaption>
    </figure>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>umeplay — 端末で遊びが生える組み立てキット</title>
<style>
  :root { --bg:#0d1117; --bg2:#010409; --fg:#e6edf3; --dim:#8b949e; --line:#30363d;
          --cyan:#39c5cf; --green:#3fb950; --yellow:#d29922; --magenta:#bc8cf2; --red:#f85149; }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f6f8fa; --bg2:#ffffff; --fg:#1f2328; --dim:#57606a; --line:#d0d7de;
            --cyan:#0969da; --green:#1a7f37; --yellow:#9a6700; --magenta:#8250df; --red:#cf222e; }
  }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--fg);
         font-family:"SF Mono",Menlo,Consolas,monospace; line-height:1.6; }
  main { max-width:1080px; margin:0 auto; padding:48px 20px; }
  .hero { text-align:center; padding:24px 0 40px; }
  .banner { display:block; max-width:100%; width:min(720px, 100%); margin:0 auto 28px;
            border:1px solid var(--line); border-radius:10px; image-rendering:pixelated;
            background:var(--bg2); }
  .hero h1 { font-size:2.4rem; letter-spacing:.06em; }
  .hero h1 .c { color:var(--cyan); }
  .hero p.tag { color:var(--dim); margin-top:12px; font-size:1.05rem; }
  .hero p.big { margin-top:20px; font-size:1.15rem; }
  .hero p.stats { margin-top:14px; color:var(--dim); font-size:.85rem; }
  .hero .quick { display:inline-flex; align-items:center; gap:8px; margin-top:24px; padding:10px 18px;
                 border:1px solid var(--line); border-radius:8px; color:var(--green); }
  .hero .quick::before { content:"$"; color:var(--dim); }
  .arch { color:var(--dim); text-align:center; white-space:pre; overflow-x:auto;
          padding:24px 0; font-size:.85rem; }
  h2 { margin:48px 0 20px; font-size:1.3rem; color:var(--cyan); }
  h2::before { content:"» "; color:var(--magenta); }
  .filters { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:24px; }
  .chip { font:inherit; font-size:.78rem; padding:6px 12px; border:1px solid var(--line);
          border-radius:999px; background:transparent; color:var(--dim); cursor:pointer; }
  .chip .n { opacity:.65; margin-left:4px; }
  .chip:hover { border-color:var(--cyan); color:var(--fg); }
  .chip.active { color:var(--bg); background:var(--cyan); border-color:var(--cyan); }
  .chip.active .n { color:var(--bg); opacity:.8; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:20px; }
  .card { border:1px solid var(--line); border-radius:10px; overflow:hidden; background:var(--bg2); }
  .card img { width:100%; display:block; image-rendering:pixelated; background:var(--bg); }
  .card figcaption { padding:14px 16px; }
  .card h3 { font-size:1rem; color:var(--yellow); }
  .card p { font-size:.85rem; color:var(--fg); margin:6px 0 10px; }
  .meta { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
  .badge { font-size:.7rem; padding:2px 8px; border:1px solid var(--line);
           border-radius:999px; color:var(--cyan); }
  .dim { color:var(--dim); font-size:.7rem; margin-left:auto; }
  footer { margin-top:56px; padding-top:24px; border-top:1px solid var(--line);
           color:var(--dim); text-align:center; font-size:.85rem; }
  footer p { margin:4px 0; }
  a { color:var(--cyan); }
  code { color:var(--green); }
</style>
</head>
<body>
<main>
  <div class="hero">
    <img class="banner" src="banner.gif" alt="umeplay banner" onerror="this.remove()">
    <h1>ume<span class="c">play</span> 🎛️</h1>
    <p class="tag">端末で遊びが生える組み立てキット<br>A construction kit where terminal toys grow</p>
    <p class="big">7つの部品を組むだけで、水槽が泳ぎ、git履歴が歌い、机に天気が降る。</p>
    <p class="stats">${manifest.length} apps · ${totalFrames} frames · ${totalKb}KB of pixels — all rendered from code</p>
    <div class="quick">npm install &amp;&amp; npm run play</div>
  </div>

  <div class="arch">apps/*          遊び（薄い・core を組み合わせるだけ）
   │ import only ↓
packages/core-* 部品（再利用単位・依存ゼロ）
   │ import only ↓
contracts/      型・スキーマ（PlayEvent という共通語彙）</div>

  <h2>遊びカタログ — 全${manifest.length}本、すべてコードから焼いた GIF</h2>
  <div class="filters">
      ${filterChips}
  </div>
  <div class="grid">
${cards}
  </div>

  <footer>
    <p>デモGIFはスクリーン録画ではありません。<code>npm run gifs</code> がコードから決定論的に再生成します。</p>
    <p>Every pixel on this page is rendered from code — <code>npm run gifs</code></p>
    <p>MIT License · <a href="https://github.com/UMEBOSHIISAN/umeplay">github.com/UMEBOSHIISAN/umeplay</a></p>
  </footer>
</main>
<script>
(function () {
  var chips = document.querySelectorAll(".chip");
  var cards = document.querySelectorAll(".card");
  function apply(filter) {
    chips.forEach(function (c) {
      c.classList.toggle("active", c.dataset.filter === filter);
    });
    cards.forEach(function (card) {
      var uses = (card.dataset.uses || "").split(" ");
      card.style.display = filter === "all" || uses.indexOf(filter) !== -1 ? "" : "none";
    });
  }
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var next = c.classList.contains("active") && c.dataset.filter !== "all" ? "all" : c.dataset.filter;
      apply(next);
    });
  });
})();
</script>
</body>
</html>
`;

writeFileSync(join(root, "demo", "index.html"), html);
console.log(`demo/index.html: ${manifest.length} cards`);
