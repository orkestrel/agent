# Capacity successor harness

This isolated successor implements the c1 capacity repair. The sibling `harness/` directory preserves the original source, emitted build, and baseline results. Keep those bytes unchanged; do not pool successor measurements with baseline measurements. No live qualification or completed successor comparison is claimed.

From the repository root, build and execute the successor canonical CLI with explicit paths.

```text
node .orkestrel/agent/instruments/harness-capacity/tools/build.ts --compiler node_modules/typescript/bin/tsc --types node_modules/@types
node .orkestrel/agent/instruments/harness-capacity/.build/bench5/continuous.js freeze --key q4 --out FREEZE_DIR --live --url DAEMON_URL --think true --failure continue --window 12288 --reserve 4096 --safety 512 --recap 2048 --timeout 180000 --metadata 30000 --goal 900000 --requests 128 --wall 14400000 --calls 4096 --tokens 8000000 --series 43200000 --workload WORKLOAD_FILE --runtime RUNTIME_FILE --oracle ORACLE_FILE
node .orkestrel/agent/instruments/harness-capacity/.build/bench5/continuous.js series --manifest MANIFEST_FILE --base OUTPUT_DIR --live --url DAEMON_URL
```

Replace uppercase placeholders with explicit paths and the daemon URL. Freeze binds the complete supplied workload and requires custody for its runtime and oracle. `capacity: 1` manifests require aligned `predict = reserve`, `ceiling = window`, positive integer bounds, and `reserve + safety < window`; old manifests are refused. The ledger receives logical capacity `window - safety`; Ollama receives physical `num_ctx = window` and decision `num_predict = reserve`. Compaction uses calibrated scale and overhead with a drift allowance. Summaries cap generation at 2048 tokens with thinking off. Retries are zero. The sole planned manual escalation is `--window 16384 --reserve 8192 --timeout 360000`; this harness performs no automatic escalation.

The freeze flags in the example state the defaults. Durations are milliseconds; `--requests` counts every actual wire attempt within a goal, beginning before advance and flush. `--calls` includes model inventory and unload attempts within the trajectory. Chat/generate calls reserve a physical context charge before sending, then charge validated actual usage. `run.json` retains totals and a sticky `terminal` object with `status`, `reason`, `role`, `sequence`, and `expected`; `requests.jsonl` retains model wire evidence, and `metadata.jsonl` retains inventory/unload evidence. Freeze inventory requests precede the trajectory and are accounted separately by qualification tooling.

Caller, role request, goal, trajectory, and series cancellation cover response-body consumption. Operational failures stop subsequent HTTP sends even if an upstream fallback catches the error. Missing usage, protocol/transport/allocation faults, output exhaustion, insufficient output headroom, and configured limits invalidate the trajectory and stop the series. Only a verified full-history context boundary is expected overflow and permits the next arm. Completed semantic failures under `failure: continue` remain benchmark outcomes. Limited or failed attempts are never silently resumed; only exact bound complete runs or expected full overflow can be skipped. Run outputs are create-only, and the series journal appends across invocations.

Run the offline protocol proofs with the emitted successor tests.

```text
node --test .orkestrel/agent/instruments/harness-capacity/.build/bench5/tests/continuous/Capacity.test.js .orkestrel/agent/instruments/harness-capacity/.build/bench5/tests/continuous/Trial.test.js .orkestrel/agent/instruments/harness-capacity/.build/bench5/tests/continuous/Audit.test.js
```

Use the successor canonical reader and CLI for successor runs. The inherited `tools/c1/c1-integrity.ts` script still names the original `.build`, and `c1-summary.ts` defaults to the original `tmp/c1`; do not use their defaults for successor evidence. Keep the shared pinned dependency junction unchanged. The inherited material that follows documents older benchmark tools and does not define the successor c1 contract.

## Inherited Larkspur harness

The inherited tree holds the records arm, full view, scenario files, scorer, series tools, and blind-audit kit. A relative path passed as `--plan`, `--base`, or `--out` resolves against the working directory.

`MIGRATION.md` maps every file to its source under the untracked tree this harness was copied from, with both checksums and the exact lines that changed.

## Layout

The following table names each directory and what it holds.

| Path      | Holds                                                                                                                                                                                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bench/`  | The full view and compaction harness (`bench.mjs`), the scorer (`rescore.mjs`), `scenario.json`, `scenario-long.json`, the reworded variants in `variants/` and `variants/ledger/`, the date renderer in `dated/`, the scoring-rule tooling in `u2/`, and the per-requirement scorer in `goals/`, which reads the recorded runs under `../results/`. |
| `bench3/` | The records harness (`bench.mjs`, `records.mjs`), its offline check (`records-check.mjs`), `records-fixtures.json`, and its `scenario.json`.                                                                                                                                                                                                         |
| `tools/`  | The series tools: `plan.ts`, `series.ts`, `run-one.ts`, `cold-start.mjs`, the wire recorder `record-fetch.mjs`, and the offline judge-import probe `probe-judge.mjs`.                                                                                                                                                                                |
| `models/` | The candidate-model pilot: `plan.mjs`, `pilot.mjs`, `sweep.sh`.                                                                                                                                                                                                                                                                                      |
| `audit/`  | The blind-audit kit for the v10 series (`audit.js`, `items.ts`, `tally.ts`, `inspect.ts`, `adjudicated.ts`, `extract.ts`) and for the g06 series (`g06-audit.js`, `items.mjs`, `probe-items.mjs`, `collect.mjs`, `replay.mjs`, `trace.mjs`, `variants.mjs`).                                                                                         |
| `bench5/` | The aggregate arm's files. `tools/artifacts/seams.ts` probes an agent build for the seams the arm relies on, and `tests/seams.test.ts` proves the probe.                                                                                                                                                                                             |
| `data/`   | The inputs the harness reads by default: `cal-categories.jsonl` and the `ledger-deny-first/` record.                                                                                                                                                                                                                                                 |
| `vendor/` | The library builds the runs import: the builds every measured run imported, the aggregate arm baseline, and its verified trimmed 0.0.30 build.                                                                                                                                                                                                       |
| `tmp/`    | The default output root for raw series output. Git ignores it, so it does not exist after a checkout; you create it when you start a series.                                                                                                                                                                                                         |

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

| File                                   | Source                                                                                                                                          | File time            | SHA-256                                                                                                                                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vendor/agent/index.js`                | `/home/user/agent/dist/src/core/index.js`                                                                                                       | 2026-10-08 19:31 UTC | `4db78c23046e9a1b081682d55779a5fd8f88dc904a2caf50e761a28cf36e5f51`                                                                                                                                                                    |
| `vendor/ollama/index.js`               | `/home/user/ollama/dist/src/core/index.js`                                                                                                      | 2026-10-07 14:44 UTC | `e09277478a425e6227f37730a29b2df5d9f80cfc595740cd0335fa05da22b4a7`                                                                                                                                                                    |
| `vendor/agent-0.0.30/index.js`         | `/home/user/agent-release/dist/src/core/index.js` at commit `c04eea4` (`@orkestrel/agent` 0.0.30)                                               | 2026-10-10 03:10 UTC | `066f7368af737eb34bc839abf3f69397f21efe95edb2a81f1637492a8ed2e911` (declarations in `index.d.ts`: `a7fc35c60f048b517ee004bda3e353bd45289295045815488b6e12419393188e (LF-normalized from the dist file, which has CRLF line endings)`) |
| `vendor/agent-0.0.30-trimmed/index.js` | `C:/Users/mikes/WebstormProjects/agent/dist/src/core/index.js` at commit `ee734c30151c7d431e480aff7a0d54306d387f13` (`@orkestrel/agent` 0.0.30) | 2026-10-10 20:03 UTC | `8f040acf72b6426246b79e5c2f31d3644291e4c08f49434ad1224e16f176311d` (byte-copied declarations in `index.d.ts`: `f6f28cab8a2d417510e68f308563f1f53eb86b600e0a57208799adc8d783d171`)                                                     |

The `vendor/agent-0.0.30/index.js` build carries the ledger of the aggregate arm. Its `src` is identical to the measured port at `8f5098b`, and it is the build the units of the aggregate arm start from. Its bare imports are `@orkestrel/abort`, `budget`, `contract`, `database`, `emitter`, `queue`, `timeout`, `tool`, `workflow`, and `workspace`, each at the version `package.json` pins. Bench5 and its refit instrument import `vendor/agent-0.0.30-trimmed/index.js`, whose entry and declarations are byte copies from the verified commit in the preceding table. The source and harness installed dependency versions match for every declared agent dependency. Run `.build/bench5/tools/artifacts/seams.js` and every offline proof against the trimmed build before Stage 0. `vendor/agent/index.js` stays untouched.

The bare imports in the vendor builds and in the harness resolve from `node_modules`. `package.json` pins each package to the version that the source checkouts held on 2026-10-10, the date of the migration, including `@orkestrel/agent` 0.0.29 for the ollama build.

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
node .build/bench5/tools/artifacts/seams.js --build vendor/agent-0.0.30-trimmed/index.js
node --test .build/bench5/tests/seams.test.js
```

`tools/probe-judge.mjs` blocks `fetch`, imports `vendor/ollama/index.js`, and constructs a judge without calling it; it exits 0 and prints `fetch calls 0`, and it exits non-zero when the vendored judge build or its `@orkestrel/agent` resolution is missing or broken.

`.build/bench5/tools/artifacts/seams.js --build PATH [--json]` blocks `fetch`, imports the build at `PATH`, constructs a ledger from an inert provider and an inert judge, and prints one line per seam, the build's SHA-256, and `fetch calls N`. It exits 0 when every seam holds, 1 when a seam fails or the build does not import, and 64 on a usage error. A seam line that starts with `FAIL` names the export or member that is missing or changed. Run it against any agent build before you vendor that build, and compare the printed digest with the table row.

No other check loads the judge build. `bench/variants/check.mjs` exits 2 and the `CLI` case of `bench/dated/check.mjs` fails; both fail the same way in the original tree, so a failure there is not a sign of a broken copy. `node --test bench/dated/check.mjs` also rewrites files under `bench/dated/`; run it in a scratch copy when you need those files unchanged.

## Read the older documents

`bench/README.md`, `bench3/README.md`, and the two `BRIEFING.md` files are byte copies of the originals. They name the original absolute paths (`/home/user/agent/tmp/...`) in their commands and history; read each path as the matching location in this directory, and use `MIGRATION.md` to map them.

## Canonical aggregate and sustained execution

Build the consumed TypeScript graph before running bench5 or the series tools. Invoke `node tools/build.ts --compiler TYPESCRIPT_BIN_TSC --types NODE_TYPES_ROOT` from the harness directory, or use absolute paths from the checkout root. Node 24, the pinned installed harness dependencies, the canonical TypeScript compiler and Node declarations are prerequisites. Local ESM imports use `.js`; run emitted `.build/bench5/*.js` and `.build/tools/*.js`. The build emits declarations and refuses semantic errors. It never overwrites tracked JavaScript.

The generated manifest binds source membership, emitted files, compiler implementation, external declarations, configuration, vendored bytes and the immutable endurance workload manifest. A measured command refuses an absent or stale build. Rebuild only before a fresh implementation freeze; retained runs keep their original identity. Historical `.mjs` recordings and archive readers remain separate. The matching published `@orkestrel/ollama` 0.0.22 declaration was added without changing its existing JavaScript bytes; declaration SHA-256 is `fb50dc61aef2d07cf2c82aed15f570ddd38cf213c76d0e6983e7350545564342`.

A copy1 matrix execution with phase `development` binds a separate development policy through its `development` file reference. The policy fixes AGREE0.67 and CHANGE0.56, retained refusal and resource provenance, a fresh freeze, and continuation only after the recorded decision XML function/parameter parser-error class. Run each arm through `bench.js --run --live --copy 1 --manifest FILE --cache DIR --out DIR` with its own fresh seeded cache. The failed goal, blocked local follower, actual history, unknown usage, and measured costs remain evidence; later scheduled goals continue without a retry. Completion is recorded as `development-complete` or `development-failed-goals`, never qualified success. Development evidence cannot enter qualified attempts, evaluation plans, or adoption; unchanged source semantics and model identities are required to transfer the seed-candidate policy.

The `sustained.js` phases are `filing`, `development`, `candidate`, `select`, and `evaluate`. They reuse the shared Driver and refit implementation. Each distinct runtime gets an immutable runtime-only classification cache, and generation and each arm receive separate fresh writable caches. The development fit transfers explicitly to the held-out runtime. The safe runtime and private oracle are separate; execution never opens oracle or label contents.

Try q4, g4, q2 and g2 with thinking disabled, selecting the first configuration with actual matrix and sustained development feasibility. Select before reading answer-quality scores. Selection freezes finite calls/tokens/wall limits at twice the maximum complete development expenditure scaled by goal count, while preserving the matrix reserve/window, roles and retry count. Seed parity fixes serial arm order. Every arm keeps one continuous conversation and ledger. A failure retains its suffix and the last complete common checkpoint. No candidate replacement, cap increase or evidence overwrite follows held-out observations.

`sustained-audit.js blind` builds the private-truth-bound opaque packet and a separate private key. `report` requires complete independent root-adjudicated atomic labels bound to exact packet/key bytes. A missed prefrozen control invalidates its batch. With all four candidates genuinely infeasible, `report --selection FILE --out FILE` emits explicit inconclusive evidence without invented trajectories or labels. Reports separate preparation from evaluation, known from missing usage, whole elapsed from overlapping timers, and exposure from answer quality. Judge wire requests lack an operation/attempt join; head cache statistics and support events do not manufacture one. Refit records whether each summary or judge operation reached the fresh request boundary. Only sent fresh requests supply generation costs; pre-aborted operations, offline misses, and cache hits add no request or missing-usage charge. Historical attempts without this fact remain explicitly unmeasured. Refused completed fits emit custody-bound `diagnosis.json`, which is recomputed before candidate selection; no usable `fit.json` is emitted. HTTP/transport failures, malformed evidence, local harness faults, and incomplete generation remain operational errors, not ranked infeasibility. Judge transport retries retain the frozen bound. Recovered trajectories with missing failed-request usage remain operationally invalid; their raw requests and measured costs remain evidence.

For the executable phase sequence and adjudication contracts, see [Matrix commands](../units/aggregates/matrix-commands.md) and [Endurance commands](../units/aggregates/endurance-commands.md). Offline protocol fixtures, including synthetic private truth and inert labels, establish instrument behavior only.

## Audit sustained work offline

The sustained audit reads the validated `e1` records and aggregate runs through the shared runtime readers. It creates blind work-product packets and compares complete root adjudication. It makes no model calls. Build the complete harness before freezing preparation and held-out execution; use the emitted entrypoint from that same build. From this harness directory:

```sh
node tools/build.ts --compiler TYPESCRIPT_BIN_TSC --types NODE_TYPE_ROOT
node .build/bench5/sustained-audit.js blind --selection SELECTION --records RECORDS_RUN_DIR --aggregate AGGREGATE_RUN_DIR --oracle PRIVATE_ORACLE --seed 741 --out PUBLIC_DIR/packet.json --keys PRIVATE_DIR/keys.json
node .build/bench5/sustained-audit.js report --selection SELECTION --records RECORDS_RUN_DIR --aggregate AGGREGATE_RUN_DIR --oracle PRIVATE_ORACLE --packet PUBLIC_DIR/packet.json --keys PRIVATE_DIR/keys.json --labels ROOT_LABELS --out REPORT
```

Paths resolve against the current directory. Output files are create-only. Public packets and private keys must have different real directories. Keep keys private: they contain run and arm identities, batch membership, and expected controls. The packet contains actual served work, required actual earlier work, available external evidence, actual tool receipts, temporally available facts and obligations, and atomic rubrics. It strips future endings and carries the current shift and message boundary. One audit batch covers the public packet, with membership recorded only in the private keys. Each available prefrozen control appears once. Reporting intervals remain independent of that batch. Opaque packet IDs and order are deterministic for the seed and exact inputs. Controls come from the frozen oracle.

The frozen build binds the workload manifest before held-out execution. That manifest must pin the exact runtime and private oracle bytes. A declared fixture manifest can be included with `tools/build.ts --resource FIXTURE_MANIFEST` before freezing. Runtime execution does not read private oracle content. Audit requires the bound manifest and refuses a changed oracle even when its runtime ID is unchanged.

The exact public and private schemas are in `bench5/sustained/audit/types.ts`. `SustainedLabels` requires `authority: "root-adjudicated"`, `packet` and `keys` as the exact SHA-256 hashes of those files, and one label for every packet item. Every label contains every rubric atom, every critical rule, every rubric obligation, and explicit `ambiguous` and `leaks` arrays. Atom verdicts are `pass`, `fail`, or `ambiguous`; obligation dispositions are `carried`, `completed`, `repaired`, `missed`, or `ambiguous`. Critical outcomes contain the exact rule, a `violated` boolean, and evidence.

Evidence entries use `REFERENCE|VERBATIM QUOTE`. Supported references are `product`, `request`, an external evidence ID (`source:ID` or `lookup:ID@FROM`), `product:EARLIER_GOAL`, `receipt:CALL`, `fact:ID@VERSION`, `obligation:ID@VERSION`, `atom:ID`, and `critical:EXACT_RULE`. Quotes must be nonempty substrings of the referenced material. Every atom, critical, and obligation ruling must cite the current product. Passing factual atoms need an external source or fact joined to that atom; earlier work cannot establish truth. Completed obligations require an arrived closure of that exact obligation and a citation to its own closure source or an actual successful receipt for the rubric's required lookup. Receipt custody binds the tool, lookup identity and version, exact returned content, and arrival after closure but no later than the product boundary. Repaired obligations require an external source or actual receipt, plus earlier-work evidence; the obligation need not be externally completed. Ambiguous outcomes require ambiguity evidence. Root adjudication supplies these rulings; the audit has no passing-label generator.

Missing, duplicate, or unknown labels and outcomes, unsupported citations, unrelated obligations, changed custody, and same-directory packet/key paths are refused. A missed or unavailable control or evidenced identity leak invalidates its batch. Invalid runs and batches remain separate from ordinary quality failures. Reports preserve ambiguity bounds, common fourth-shift checkpoints, disjoint intervals and the final interval, invalid suffixes, original-source and actual-prior-product ages, summary exposure and maintenance, downstream outcomes, and exact costs.

Selection and evaluation preparation is included automatically. Add `--preparation PREPARATION_FILE` repeatedly for additional shared preparation artifacts; aliases of one measured run or generation are deduplicated. Raw request-role totals, cache statistics, support journal events, failed requests, and incomplete usage remain available. No stable wire join allocates tokens separately to classification, AGREE/CHANGE, or retries, and overlapping wall measurements are not summed.

An infeasible selection supports an explicit inconclusive report without run or audit arguments:

```sh
node .build/bench5/sustained-audit.js report --selection INFEASIBLE_SELECTION --out REPORT --preparation PREPARATION_FILE
```

The conditional recommendation requires a valid continuous pair, majority exposure in every interval, no aggregate-only critical regression, and conservative acceptable-product gain with downstream completion or repair both overall and in the final interval. A valid positive gain without completed or repaired downstream work remains inconclusive. Fixture results establish protocol behavior only; they are no measurement of model quality or independent-trial significance.
