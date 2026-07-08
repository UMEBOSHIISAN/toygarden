# umeplay 🎛️

> **A construction kit where terminal toys grow.**
> 日本語版 → **[README.ja.md](README.ja.md)**

[![CI](https://github.com/UMEBOSHIISAN/umeplay/actions/workflows/ci.yml/badge.svg)](https://github.com/UMEBOSHIISAN/umeplay/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](package.json)
[![dependencies: zero](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](package.json)
[![demos: rendered from code](https://img.shields.io/badge/demos-rendered%20from%20code-ff69b4.svg)](#demos-that-dont-rot)

![umeplay](demo/banner.gif)

> **This repository contains not a single screenshot.** Even the banner above is
> a GIF89a burned from code by our own encoder — run `npm run banner` and you get
> the same bytes back.

umeplay is a **zero-dependency TypeScript monorepo** where **20 terminal toys**
(an aquarium, a chiptune symphony, a tamagotchi, desk weather…) are assembled
from **8 reusable `core-*` packages** wired together by a **single event contract**.
You don't build apps — you cross parts, and play *grows*. It's all in your
terminal: no build target, no browser, no hardware. `npm install && npm run play aquarium`.

## Quick start

```sh
npm install              # devDeps only: typescript + vitest + esbuild
npm run play             # list every toy, with taglines
npm run play aquarium    # names match by substring — Ctrl+C to quit
npm run play random      # feeling lucky? launch a random one
npm run check            # typecheck + tests (22 files / 88 tests)
npm run gifs             # re-render every demo GIF from code → demo/gifs/
npm run banner           # re-render the hero banner → demo/banner.gif
```

Everything runs without hardware (`core-device` defaults to a mock driver).

## Three-layer architecture

```
apps/*          toys        (thin — just compose cores)
   │ import only ↓
packages/core-* cores       (the reusable units)
   │ import only ↓
contracts/      types/schema (the dependency-free leaf)
```

**One-way dependencies only** (`app → core → contracts`). Apps never import each
other. They collaborate loosely through the `PlayEvent` type in
[`contracts/events.ts`](contracts/events.ts): a producer never knows who's
listening, a consumer never knows who spoke. That shared vocabulary is the spine
of the whole kit.

![event-loom](demo/gifs/event-loom.gif)

> `npm run play event-loom` — one `EventBus`, a realistic stream of events, and
> **two decoupled subscribers** (a colored ticker and a kind-counter) reacting at
> the same time.

## Parts catalog (`packages/`)

Eight `core-*` packages. Seven of them compose the toys; the eighth,
`core-termgif`, is the meta-core that renders every demo GIF (see
[Demos that don't rot](#demos-that-dont-rot)).

| package | responsibility |
|---|---|
| [`core-events`](packages/core-events/) | event bus — decouples producers from consumers |
| [`core-device`](packages/core-device/) | device HAL (M5 / Ajazz AKP153 / mock) |
| [`core-git-observe`](packages/core-git-observe/) | git activity observation (numstat + Co-Authored-By) |
| [`core-chiptune`](packages/core-chiptune/) | 8-bit sound (square-wave PCM / WAV / motifs) |
| [`core-tui`](packages/core-tui/) | terminal UI primitives (lanes / badges / ANSI) |
| [`core-worker-data`](packages/core-worker-data/) | worker dispatch / collapse data supply (read-only) |
| [`core-focus-log`](packages/core-focus-log/) | focus-cam log (sqlite) supplied read-only |
| [`core-termgif`](packages/core-termgif/) | ANSI output → GIF. The part that keeps demos from rotting (GIF89a + LZW + a built-in 8×8 font) |

## Toy catalog (`apps/` — all 20, all with GIFs)

**Full gallery → [demo/index.html](demo/index.html)** — self-contained, filter by
core, dark/light aware, zero external references. Regenerate with `npm run showcase`.

| toy | cores crossed | what it does |
|---|---|---|
| [ascii-aquarium](demo/gifs/ascii-aquarium.gif) | contracts | An ASCII fish tank that gains a fish on every `task.done`. A moon rises at night. |
| [event-loom](demo/gifs/event-loom.gif) | events × tui | Weaves every event on one bus into a live universal viewer. |
| [commit-symphony](demo/gifs/commit-symphony.gif) | git-observe × chiptune | Your git history becomes an 8-bit tune; AI co-authored commits ring an octave up. |
| [git-replay](demo/gifs/git-replay.gif) | git-observe × tui | Time-lapse playback of a repo's history, human and AI color-coded. |
| [secretary-today](demo/gifs/secretary-today.gif) | tui | Today's priorities as lanes; blocked items sink in red. |
| [agent-constellation](demo/gifs/agent-constellation.gif) | device × events | Agents become a constellation; a dispatch draws a line between stars. |
| [collapse-arcade](demo/gifs/collapse-arcade.gif) | worker-data | High collapse-rate agents become enemies. Shooting one = a review. |
| [collapse-siren](demo/gifs/collapse-siren.gif) | worker-data × chiptune × events | When collapse rate crosses a threshold, the terminal blares a dissonant siren. |
| [desk-weather](demo/gifs/desk-weather.gif) | device | Your repo's health becomes desk weather; a dirty tree clouds over. |
| [git-weather](demo/gifs/git-weather.gif) | git-observe × device | High-churn days storm, quiet days stay clear. |
| [pomodoro-forge](demo/gifs/pomodoro-forge.gif) | chiptune × device | Mine ore by focusing, smelt it on commit — a blacksmith's pomodoro. |
| [focus-forge](demo/gifs/focus-forge.gif) | focus-log × chiptune × device | A pomodoro that isn't self-reported. Only measured focus swings the hammer. |
| [focus-aquarium](demo/gifs/focus-aquarium.gif) | focus-log | A day's focus log swims out as a school of fish at night. |
| [focus-tally](demo/gifs/focus-tally.gif) | focus-log × tui | What you did today stacks up as a terminal bar chart. |
| [ume-tamagotchi](demo/gifs/ume-tamagotchi.gif) | contracts | Raise Umeko: she's happy when you post, sulks when things stall. |
| [routing-slot](demo/gifs/routing-slot.gif) | worker-data | Worker dispatch as a slot machine; the right fit hits the jackpot. |
| [routing-radar](demo/gifs/routing-radar.gif) | worker-data × tui | A radar surveying dispatch hit-rate with confidence bars. |
| [chiptune-clock](demo/gifs/chiptune-clock.gif) | chiptune × device | A desk clock that tells the hour with an 8-bit bell. |
| [chiptune-themes](demo/gifs/chiptune-themes.gif) | chiptune × events | Each event kind gets a theme; a successful deploy plays a fanfare. |
| [commit-constellation](demo/gifs/commit-constellation.gif) | git-observe × device | Commit authors become stars; the bigger the contribution, the brighter. |

Every toy is just a few files under `apps/<name>/src/`. You can add one without
touching anything else — that additivity *is* the kit.

## Demos that don't rot

A screen-recorded GIF turns into a lie the moment the code changes. Every GIF in
umeplay is made like this instead:

```
app's demo()  ──ANSI frames──▶  core-termgif  ──▶  demo/gifs/<name>.gif
(seeded RNG, deterministic)     (GIF89a + LZW + 8×8 font, zero deps)
```

- Each app exports `demo(): DemoSpec` from `src/demo.ts` (the convention lives in
  [`packages/core-termgif/README.md`](packages/core-termgif/README.md)).
- `npm run gifs` re-renders every app's GIF plus `manifest.json`; `npm run showcase`
  rebuilds the gallery HTML; `npm run banner` rebuilds the hero.
- Same code → same GIF. **Demo freshness = repository honesty.**

The font is a public-domain IBM-VGA-era bitmap ([dhepper/font8x8](https://github.com/dhepper/font8x8))
plus hand-drawn glyphs. Even hiragana swim across the tank.

## Grow your own toy

A new toy takes about 60 seconds to scaffold:

```sh
npm run new -- my-toy    # generates apps/my-toy/ (6 files: package.json,
                         # tsconfig, src/index.ts, src/cli.ts, src/demo.ts, test)
npm run check            # typecheck + tests — green out of the box
npm run play my-toy      # watch it run (Ctrl+C to quit)
npm run gifs -- my-toy   # render demo/gifs/my-toy.gif
```

The generated toy already passes `check`, runs under `play`, and renders a GIF —
so you start from something alive and reshape it. From there, add a `@umeplay/*`
core to its `package.json` and cross parts to taste. Full guide (and how to add a
new core, device, or event): **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Testing

```sh
npm run check   # tsc --noEmit + vitest (cores tested seriously, apps are smoke tests)
```

`demo/wiring.test.ts` proves one event reaches four apps through loose coupling;
`demo/showcase.test.ts` renders every app for real; `core-termgif`'s LZW is
round-tripped against an independent decoder. **22 test files, 88 tests.**

## Contributing

Read **[CONTRIBUTING.md](CONTRIBUTING.md)**. The only rules that matter: keep the
dependency direction (`apps → cores → contracts`), never import one app from
another, and keep demos deterministic. `npm run new` gets you a valid toy in one
command.

## License

MIT — see [LICENSE](LICENSE). The bitmap font's provenance is public domain
(see [`core-termgif/README.md`](packages/core-termgif/README.md)).
