<!--
  部品を1個足すと、遊びは掛け算で増える。ありがとう、見せてくれて。
  Add one part, and the play multiplies. Thanks for showing it to us.
  下のチェックは「緑を保つ軽さ」のためのもの。ガチガチにはしません。
-->

## これは何? / What is this?

<!-- 1〜2行で。新しいおもちゃ / 部品 / ドライバ / イベント / 修正 のどれか。 -->
<!-- One or two lines. A new toy / core / driver / event / fix. -->



## チェック / Checklist

- [ ] `npm run check` が全部 PASS（tsc + vitest / 24 files・119 tests を割らない）
- [ ] **新しいおもちゃなら**: `src/demo.ts` があり `npm run gifs -- <name>` が通る（決定論的・`seeded()` 使用）
- [ ] **GIF に文字を描くなら**: グリフが内蔵フォントに収まる（`npm run gifs` が壊れず通る）
- [ ] **新しい部品/おもちゃ/ドライバ/イベントなら**: 依存方向を守った（`apps → cores → contracts`・横流し無し）
- [ ] `README.md` / `README.ja.md` の該当カタログ表に1行追加した（おもちゃ→遊びカタログ / 部品→部品カタログ）

<!--
  迷ったら CONTRIBUTING.md を見てください。守るのは依存方向と配置だけ。
  See CONTRIBUTING.md if unsure — the only hard rules are dependency direction and placement.
-->
