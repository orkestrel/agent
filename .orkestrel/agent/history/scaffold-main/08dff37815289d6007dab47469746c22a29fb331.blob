# Larkspur benchmark harness

This directory holds the harness that measures the records arm against the full view on the Larkspur support shift: two agent builds, the scenario files, the scorer, the series tools, and the blind-audit kit. Everything in it finds its siblings from its own location, so you can run it from any working directory. A relative path that you pass (`--plan`, `--base`, `--out`) resolves against your working directory.

`MIGRATION.md` maps every file to its source under the untracked tree this harness was copied from, with both checksums and the exact lines that changed.

## Layout

The following table names each directory and what it holds.

| Path | Holds |
| --- | --- |
| `bench/` | The full view and compaction harness (`bench.mjs`), the scorer (`rescore.mjs`), `scenario.json`, `scenario-long.json`, the reworded variants in `variants/` and `variants/ledger/`, the date renderer in `dated/`, the scoring-rule tooling in `u2/`, and the per-requirement scorer in `goals/`, which reads the recorded runs under `../results/`. |
| `bench3/` | The records harness (`bench.mjs`, `records.mjs`), its offline check (`records-check.mjs`), `records-fixtures.json`, and its `scenario.json`. |
| `bench4/` | The typed archived ledger driver (`Driver.ts`), its unambiguous Node entry (`bench.ts`), and focused offline proofs. It imports the trimmed agent release and the historical judge and scorer. |
| `tools/` | The series tools: `plan.ts`, `series.ts`, `run-one.ts`, `cold-start.mjs`, the wire recorder `record-fetch.mjs`, and the offline judge-import probe `probe-judge.mjs`. |
| `models/` | The candidate-model pilot: `plan.mjs`, `pilot.mjs`, `sweep.sh`. |
| `audit/` | The blind-audit kit for the v10 series (`audit.js`, `items.ts`, `tally.ts`, `inspect.ts`, `adjudicated.ts`, `extract.ts`) and for the g06 series (`g06-audit.js`, `items.mjs`, `probe-items.mjs`, `collect.mjs`, `replay.mjs`, `trace.mjs`, `variants.mjs`). |
| `data/` | The inputs the harness reads by default: `cal-categories.jsonl` and the `ledger-deny-first/` record. |
| `vendor/` | The two library builds every measured run imported. |
| `tmp/` | The default output root for raw series output. Git ignores it, so it does not exist after a checkout; you create it when you start a series. |

## Set up

Install the pinned dependencies once. The `.ts` tools run without a flag on Node 22.22.0, the version the checks in `MIGRATION.md` ran on:

```sh
cd .orkestrel/agent/instruments/harness
npm install
```

The live runs need an Ollama daemon at `http://127.0.0.1:11434` that serves the models the plan names. The offline checks in the final section need no daemon.

## Plan and run a series

A series is a plan file that `tools/series.ts` works through one run at a time, resumable and inside a time budget. Follow these steps.

1. Create the output base. The tools create the run folders under it but not the base itself, so run `mkdir -p tmp/SERIES` first, where `SERIES` is the series name, for example `v12`. The documented default base is `tmp/SERIES` under this directory.
2. Write the plan. Use `tools/plan.ts` for the final-check arms (records, full view, compaction) under named conditions, or `models/plan.mjs` for one candidate model against the records arm and the full view:

```sh
node tools/plan.ts --copies 1-8 --conditions f4 --out tmp/SERIES/plan.json
node models/plan.mjs --model MODEL_TAG --prefix NAME --copies 1-8 --out tmp/SERIES/plan.json
```

3. Launch the series under the dispatch skill's `launch.ts`, from the scaffold checkout root, so the harness tracks the process and a cap ends it. `CAP` is the launcher cap in seconds, which must exceed `BUDGET`, the series time budget in seconds; `HARNESS` is the path `.orkestrel/agent/instruments/harness`:

```sh
node .agents/skills/orkestrel-dispatch/scripts/launch.ts --journal tmp/codex/SERIES.jsonl --errors tmp/codex/SERIES.err --cap CAP -- node HARNESS/tools/series.ts --plan HARNESS/tmp/SERIES/plan.json --base HARNESS/tmp/SERIES --budget BUDGET
```

`series.ts` calls `run-one.ts` for each planned run. `run-one.ts` unloads every model, appends a start line to `BASE/run.log`, runs `bench/bench.mjs` or `bench3/bench.mjs` with the `record-fetch.mjs` preload, and ends the line with the harness file's SHA-256. `run-one.ts` resolves `BASE` against your working directory before it passes `--out` to the harness, so a relative `--base` writes under that directory and not under `bench/` or `bench3/`. The vendored builds are not in that hash, so record their checksums from the vendored builds section in the series notes.

The `harness-sha256` value of a run in this directory differs from the value that the same harness logged in the source tree, because the migration edited how the files find each other. The v11 series logged `67c863…` (`bench3/bench.mjs`) and `b5c49e…` (`bench/bench.mjs`); the files in this directory hash to `19b1d8…` and `9bed44…`. These pairs denote the same behavior, so do not read the change as a harness change. `MIGRATION.md` lists the edited lines.

## Keep raw output and curated readings apart

Raw output stays in `tmp/SERIES/`, which git ignores and which stays on disk: each run's `.jsonl`, its `.log`, its `-wire/` recording, and `run.log`. Curated readings (grades, aggregates, audit verdicts, and keys) go in the sibling directory `../results/SERIES/`, which git tracks.

Four readers take their inputs from `../results/` and not from `tmp/`. Three of them are the `--probe-chain` and `--probe-score` flags of `bench/bench.mjs`, and `bench/u2/compare.mjs`; they read raw run folders that the tracked results do not hold, so place those folders under `../results/` before you run them. The fourth, `bench3/records-check.mjs`, reads the tracked plan `../results/v9/RECORDS-PLAN.md`, so the harness directory is not self-contained when you move it without `../results/`. Four audit tools locate a series directory themselves: `audit/extract.ts` and `audit/adjudicated.ts` read `../results/v10`, and `audit/collect.mjs` and `audit/replay.mjs` read `../results/g06`. Set the environment variable `V10_RESULTS` or `G06_RESULTS` to a directory to read a series from `tmp/` instead. The other audit tools take their directories as arguments. `models/sweep.sh` reads the recorded g06 requests from the directory in `G06_RESULTS` and refuses to start without it; `models/pilot.mjs` takes the request files as arguments.

## Vendored builds

The harness imports the agent build from `vendor/agent/index.js` and loads the judge from `vendor/ollama/index.js`. The judge loads from a separate build because the ollama package inherits its own copy of `@orkestrel/agent`, whose error classes differ from the vendored agent build's. The following table records the bytes.

| File | Source | File time | SHA-256 |
| --- | --- | --- | --- |
| `vendor/agent/index.js` | `/home/user/agent/dist/src/core/index.js` | 2026-10-08 19:31 UTC | `4db78c23046e9a1b081682d55779a5fd8f88dc904a2caf50e761a28cf36e5f51` |
| `vendor/ollama/index.js` | `/home/user/ollama/dist/src/core/index.js` | 2026-10-07 14:44 UTC | `e09277478a425e6227f37730a29b2df5d9f80cfc595740cd0335fa05da22b4a7` |

The bare imports in both builds and in the harness resolve from `node_modules`. `package.json` pins each package to the version that the source checkouts held on 2026-10-10, the date of the migration, including `@orkestrel/agent` 0.0.29 for the ollama build.

### Re-vendor an agent build

Replace a vendored build only on purpose, because a different build changes the requests a run sends. Follow these steps.

1. Build the agent checkout, then copy its `dist/src/core/index.js` over `vendor/agent/index.js`.
2. Read the versions of the `@orkestrel/*` packages that the build imports from the checkout's `node_modules`, edit the pins in `package.json` to match, and run `npm install`.
3. Run the offline checks in the following section and compare their output with the output from the previous build.
4. Record the new SHA-256 and build time in the table in this file and add a section to `MIGRATION.md` that names the source checkout and the reason.
5. Treat any series that follows as a different measurement from the series before it, and say so in that series' notes.

## Run the offline checks

These commands read no daemon. Run them from this directory.

```sh
node bench3/bench.mjs --check-ledger
node bench3/records-check.mjs
node bench/bench.mjs --probe-guard
node bench/bench.mjs --probe-exchanges
node bench/variants/check.mjs
node --test bench/dated/check.mjs
node tools/probe-judge.mjs
```

`tools/probe-judge.mjs` blocks `fetch`, imports `vendor/ollama/index.js`, and constructs a judge without calling it; it exits 0 and prints `fetch calls 0`, and it exits non-zero when the vendored judge build or its `@orkestrel/agent` resolution is missing or broken. The other checks never load that build. `bench/variants/check.mjs` exits 2 and the `CLI` case of `bench/dated/check.mjs` fails; both fail the same way in the original tree, so a failure there is not a sign of a broken copy. `node --test bench/dated/check.mjs` also rewrites files under `bench/dated/`; run it in a scratch copy when you need those files unchanged.

## Run the relocated ledger driver

From this harness directory, compare a preserved records copy and run the focused offline proofs:

```sh
node bench4/bench.ts --copy 1 --dry
node --test bench4/helpers.test.ts bench4/Driver.test.ts
```

The driver accepts copies 1 through 8. A dry check compares the recorded settings, questions, system, sampler, seed, and tools, maps the archived Linux scenario and corpus identities to unchanged local bytes, and sends no request. The seed's `measured.fixed` field remains historical data; the trimmed vendor's calibrated gauge uses `overhead`.

A run requires `--out DIR`; path checks restrict output to this harness's `tmp/bench4` directory and refuse symbolic links. These checks assume stable filesystem ancestors; they do not lock against concurrent directory replacement. Without `--live`, calibration reaches the fetch guard before creating the run output. The `--references DIR` operation retains its source validation and non-overwrite checks. The preserved archive lacks the `a4-refined-v1` reference JSONL input, so the real archive operation refuses before writing. Its success and containment proofs use owned inert rows with byte copies of the real driver.

The driver imports `vendor/agent-0.0.30-trimmed/index.js`, SHA-256 `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d`, from agent source commit `ee734c30151c7d431e480aff7a0d54306d387f13`. Its declaration SHA-256 is `f6f28cab8a2d417510e68f308563f1f53eb86b600e0a57208799adc8d783d171`. The driver imports the historical `vendor/ollama/index.js` encoder and `bench/rescore.mjs` scorer. This relocation carries no live performance measurement.

## Read the older documents

`bench/README.md`, `bench3/README.md`, and the two `BRIEFING.md` files are byte copies of the originals. They name the original absolute paths (`/home/user/agent/tmp/...`) in their commands and history; read each path as the matching location in this directory, and use `MIGRATION.md` to map them.
