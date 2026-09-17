// THE BENCHMARK ENTRY POINT. `pnpm bench` runs this file through `vite-node`, and CodSpeed runs
// the same command in CI.
//
// WHY ONE SUITE ACROSS ALL THE FILES rather than one process per file: `withCodSpeed` instruments
// the `Bench` instance it wraps, so every task registered on it is measured by the runner in a
// single pass, and the benchmark names are what CodSpeed reports. Each `*.bench.ts` file therefore
// exports a `register…Benchmarks(bench)` function and owns its own fixtures.
//
// OUTSIDE CodSpeed this is plain tinybench: `withCodSpeed` falls back to the default
// implementation when no instrumentation is present, so the table below is a normal local
// measurement — useful for a quick check, but only the CI numbers are comparable between commits.
//
// ⚠️ VITE-NODE IS THE RUNNER, NOT ts-node OR esbuild-register. The benchmarks import the app's own
// modules through the `@/*` alias, which comes from `tsconfig.json` and is wired up by
// `resolve.tsconfigPaths` in `vitest.config.mts`. Running them through the repo's own Vite
// resolution is what keeps the benchmarked import graph identical to the one the app builds.

import { withCodSpeed } from "@codspeed/tinybench-plugin";
import { Bench } from "tinybench";

import { registerExplosionBenchmarks } from "./blueprints-explosion.bench";
import { registerChartScaleBenchmarks } from "./charts-scale.bench";
import { registerFeedBoundaryBenchmarks } from "./feed-boundary.bench";
import { registerFeedViewModelBenchmarks } from "./feed-view-models.bench";
import { registerHistoryGroupingBenchmarks } from "./history-grouping.bench";

const bench = withCodSpeed(new Bench({ name: "qatoto-frontend" }));

registerFeedBoundaryBenchmarks(bench);
registerFeedViewModelBenchmarks(bench);
registerHistoryGroupingBenchmarks(bench);
registerExplosionBenchmarks(bench);
registerChartScaleBenchmarks(bench);

await bench.run();

// `process.stdout.write` rather than `console.table`: `no-console` is an error in this repo
// (.oxlintrc.json), and `scripts/` already prints this way. Under CodSpeed the statistics are
// empty — the runner reports the measurements, not tinybench — so a missing latency prints as
// `instrumented` rather than as a hole in the table.
for (const task of bench.tasks) {
  const latency = task.result?.latency.mean;
  const formattedLatency =
    latency === undefined ? "instrumented" : `${(latency * 1_000_000).toFixed(0)} ns`;
  process.stdout.write(`${task.name.padEnd(76)} ${formattedLatency}\n`);
}
