# @toygarden/core-sysmon

Measures the host machine's workload (CPU, memory, load average) using `node:os` and normalizes
it into a 0..1 busyness score. Dependency: `@toygarden/contracts` only.

`[ core-sysmon ] :: feel the pulse of your machine`

## Provided API

The full public surface exported by `src/index.ts` (implementation lives in `src/sysmon.ts`).

| API | Kind | Signature |
|---|---|---|
| `SysmonSample` | type | `{ cpuRatio; memRatio; loadRatio; busyness }`（すべて 0..1） |
| `SysmonContext` | type | `{ totalMem; freeMem; loadavg; cpuTimes: { idle; total }; logicalCores }` |
| `createSysmonCalculator` | function | `(): (ctx: SysmonContext) => SysmonSample`（前回 CPU 時間を保持するクロージャ） |
| `getSysmonContext` | function | `(): SysmonContext`（副作用境界。`node:os` から1回集計して返す） |
| `startSysmonFeed` | function | `(callback: (s: SysmonSample) => void, intervalMs = 2000): () => void`（stop 関数を返す） |

## Usage

```ts
import { startSysmonFeed } from "@toygarden/core-sysmon";

const stop = startSysmonFeed((sample) => {
  console.log(`busyness: ${(sample.busyness * 100).toFixed(0)}%`);
}, 2000);

// later
stop();
```

## Used by

`cpu-diner`（`apps/*/src/*.ts` を grep して実測）。

## Design principles

- **Side effect boundary**: `getSysmonContext()` is the only place that touches `node:os`. Everything
  else (`createSysmonCalculator`) is a pure function of its input and is fully unit-tested.
- **CPU ratio needs history**: CPU busyness is a delta over time, not a point-in-time reading, so
  `createSysmonCalculator()` returns a stateful closure instead of a stateless function. The first
  sample after creation has no baseline yet and reports `cpuRatio: 0`.
- **OS-shape independence**: `cpus()`'s per-core `times` shape drifts slightly across operating
  systems, so `getSysmonContext()` aggregates it down to raw `{ idle, total }` numbers immediately —
  no OS-specific structure leaks past the side-effect boundary.
- **Weighted busyness**: `busyness = cpuRatio*0.5 + memRatio*0.3 + loadRatio*0.2`, clamped to 0..1.
