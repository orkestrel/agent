# Handoff for the next session

## Resume checkpoint: 2026-10-13 23:26 EDT

The T3/Codex session continued from `ef83b30` without stopping the series, daemon, or existing Claude workers. The user confirmed that allowance is sufficient and requested parallel work with appropriate models and no quality reduction. No version bump or publication is authorized by this checkpoint.

- q4 records remains the retained overflow run. q4 compaction completed with 92 successful rows out of 96; q4 full overflowed with 2 successful rows out of 5. The canonical integrity reader reports zero failures for every q4 arm. The current series has no connection-refused error; that error belongs to the archived attempt.
- q2 records is running; the journal reached `ev-09-4` at this checkpoint. The series and daemon PIDs and caps in the earlier launch section remain valid.
- q4 thinking blind custody exists under `instruments/results/c1/q4-think/audit/packet.json` and `private/keys.json`. The packet contains 145 items. Packet hash: `8f09d315f81fab4e8d2e824cb202c96ef9011b52957398c695486b4a55e0c175`. Keys hash: `4342561e1136ef6411f90b5bd6a841de1fd78b7dc6d7ad14adc45f1a1f2c8480`.
- A standalone labeling driver lives under `.orkestrel/agent/tools/c1/`, outside the frozen harness because its build hashes every existing tool and the tools membership. Its usage is in that directory's `README.md`. The old embedded q2 driver is unchanged. Labeling uses GPT-6.1 Sol high, with the prior batch size of 2. Independent Astra review confirmed custody, resume, locking, scheduling bounds, and blinding; Luna observed the isolated typecheck, driver proof, and 10 continuous proofs pass. The corrected parallel pilot passed with every child session recorded, a nonempty final message, canonical checker acceptance, and an uncapped exit 0; measured child durations were 138561, 232186, and 273187 ms. Resume planning reports 69 pending batches after the retained pilot output. The driver is accepted.
- Adjudicators use neutral public files under `tmp/units/c1-blind/<packet-hash>/audit/`; do not point them at the model-named canonical directory. This directory contains only the public packet, split items, label outputs, and the driver lock. Successful label outputs must be copied into the canonical audit directory before final merge/report.
- The first pilot's parallel processes hit an unrelated required `tactica-probe` MCP startup timeout. Its surviving batch finished and passed the canonical checker. After every first-pilot worker exited, the driver gained an invocation-local `-c mcp_servers.tactica-probe.enabled=false` override, prescribed by the reviewer and proved by a READY probe. Global configuration is unchanged. The corrected pilot journal is `tmp/codex/c1-think-pilot-2.jsonl`; each batch has its own unique `tmp/codex/c1-blind-batch-*` directory. No launched brief or journal was overwritten.
- `tmp/units/c1-label-status.ts` prints active batch session IDs, total token usage, and liveness metadata; `--all` includes completed attempts. `tmp/units/c1-think-finish.ts` composes the existing neutral staging, labeling, canonical merge/check/report/render, and repeats tools. Independent Astra review caught an operational run error that can coexist with an empty faults array; the prescribed error-field rejection passed its failing-before/passing-after process proof while preserving ordinary retained model failures. Luna verified the repaired isolated typecheck and 3 process tests. The q2 invocation waits on the series terminal event and refuses fault-bearing or error-bearing runs.
- Completion chains launched detached at 23:25 EDT, each under the dispatch launcher's 57600-second cap, each with at most 6 simultaneous Sol labelers and a 900-second per-labeler cap. q4 launcher PID 81640, chain PID 78752, journal `tmp/codex/c1-think-q4-finish.jsonl` with `.err`; it is labeling. q2 launcher PID 51676, chain PID 28964, journal `tmp/codex/c1-think-q2-finish.jsonl` with `.err`; it is waiting for the series terminal event. They stop on any failed command and never retry or substitute a model automatically. Their final outputs are each key's canonical `audit/labels.json`, `audit/report.json`, `audit/report.md`, and `audit/repeats.jsonl`. After both finish, read the reports, run `c1-summary.ts` over the thinking raw base, update the scaffold's `RESULTS.md` and `direction.md`, and preserve the reserve difference disclosure.

Retain the neutral labels and attempt journals while work is live. Do not rebuild the harness or sweep `tmp/`. Inspect current artifacts rather than treating this timestamp as live status.

Written 2026-10-13 by the orchestrating session. The hardening is accepted at `901c786` with no version bump; the c1 comparison with thinking off is graded (verdict `records` at q4 and q2, in the scaffold's root `RESULTS.md` § c1); the thinking-enabled pass is running. Read this file, then `direction.md`. Nothing else in this folder is prose.

## What this folder keeps

The folder was swept down to what the thinking pass and the next steps need. Everything removed is tracked at agent commit `e85f5ee` (`git show e85f5ee:.orkestrel/agent/<path>`): the campaign records (`plan.md`, `progress.md`, `ledger.md`, the verdicts, `ideas.md`, `issues.md`, `refine.md`, `rejected.md`, `small-models.md`, `context.md`, `handoff/`, `harvest/`), the aggregate-era instruments (`bench`, `bench3`, `bench4`, `codex`, `probes`), the other units (`agent`, `agent-0030`, `desk`, `port`, the aggregate diagnostics and reports), and every results tree except `c1`.

- `handoff.md` (this file) and `direction.md` (the package direction the results point at, and the harness-preservation proposal in § 5).
- `instruments/harness/`: the whole harness, kept intact because `bench5` imports across its tree. The c1 entry is `bench5/continuous.ts` (`freeze`, `run`, `series`, `blind`, `labels`, `report`); the c1 tools are under `tools/c1/`; the golden probes and their recordings are under `golden/`; the vendored 0.0.30 build and Ollama provider are under `vendor/`. Ignored: `.build/`, `node_modules/`, and `tmp/` (raw runs).
- `instruments/harness/tmp/`: `c1/` and `c1-continue/` (the graded thinking-off raw runs), `c1-think/` (the live pass), `c1-think-void/` (the voided first attempt at q4 compaction, kept as evidence only).
- `instruments/units/aggregates/endurance/`: the 96-goal workload, its runtime evaluation, and the private oracle. The private oracle and the keys never enter an adjudicator's brief.
- `instruments/results/c1/`: `q4`, `q2`, `q2-continue` (frozen manifests, blind packets, per-item files, labels, reports, private keys of the graded thinking-off pass) and `q4-think`, `q2-think` (the thinking manifests).

The package's own `tmp/probes/` keeps the two golden probes and recordings beside the copies under `golden/`.

## The thinking pass: state on 2026-10-13 at 21:10 local

Manifests `instruments/results/c1/q4-think/freeze/manifest.json` and `q2-think/freeze/manifest.json`: think on, reserve 1024, window 3584, `predict` 512, `continue` policy, bound to this folder's absolute paths.

The first attempt (14:30 to 16:14) lost its daemon: the dedicated daemon had been launched with an 18-hour cap, the cap ran out at 16:14, and every request after that failed with `ECONNREFUSED 127.0.0.1:11435`. Its outcome:

- **q4 records: kept, terminal.** Status `overflow` at goal 48 of 96 (`ev-12-4`, a shift-handoff product, prompt 3444 tokens; 138 turns, 756349 tokens, 77 minutes). The thinking-off run at reserve 512 served all 96. This is a real result and feeds `direction.md` § 1.
- **q4 compaction: void.** It served 45 goals cleanly through `ev-13-1` (4 genuine unserved: `ev-03-4`, `ev-05-4`, `ev-10-4`, `ev-11-4`), then 47 goals failed on transport. Moved to `instruments/harness/tmp/c1-think-void/q4/compaction`.
- **q4 full and all three q2 arms:** never ran.
- The first attempt's journal is archived at `tmp/claude/c1-think-series-1/` in this repository, the old daemon's at `../scaffold/tmp/claude/c1-daemon-1/`.

The relaunch at 21:09 local:

- **Daemon:** launched from the scaffold root with a 48-hour cap (172800 s). Launcher PID 60924, Ollama PID 28572, receipt `../scaffold/tmp/units/c1-daemon-start.json`, journal `../scaffold/tmp/claude/c1-daemon.jsonl` with `.err`. It dies at about 21:09 on 2026-10-15; anything still running then fails the same way.
- **Series:** launched detached from this repository's root. Launcher PID 32508, series PID 65840, journal `tmp/claude/c1-think-series.jsonl` with `.err` and `.pid`, cap 57600 s. It skipped q4 records (terminal) and is serving q4 compaction from `ev-01-1`, then q4 full, then q2 records, compaction, full. With thinking, q4 served about one goal a minute, so expect five to seven hours in all.

Read liveness from the journal tail and the run directories (`instruments/harness/tmp/c1-think/<key>/<arm>/run.json`), never by holding a shell on the process. The launcher writes `exit=` into the `.err` file at the end. A line of `ECONNREFUSED` in the `.err` file means the daemon died: check `../scaffold/tmp/claude/c1-daemon.err` for `capped=true`.

### Relaunching after a death

The `series` phase skips every run directory whose `run.json` carries a terminal status and refuses a directory without one. A run that lost its daemon still writes a terminal status (compaction wrote `complete` with 51 unserved), so move every arm that saw a transport fault aside into `tmp/c1-think-void/<key>/` before relaunching; never grade one.

Daemon, from the scaffold root (move the old receipt aside first: the launcher writes it with the `wx` flag and refuses an existing file):

```powershell
$a = @('.agents/skills/orkestrel-dispatch/scripts/launch.ts', '--journal', 'tmp/claude/c1-daemon.jsonl', '--errors', 'tmp/claude/c1-daemon.err', '--cap', '172800', '--', 'node', 'tmp/units/c1-daemon-launch.ts')
Start-Process -FilePath node -ArgumentList $a -WorkingDirectory 'C:/Users/mikes/WebstormProjects/scaffold' -WindowStyle Hidden -PassThru
```

Series, from this repository's root (move the old journal, `.err`, and `.pid` aside first):

```powershell
$h = 'C:/Users/mikes/WebstormProjects/agent/.orkestrel/agent/instruments/harness'
$a = @('node_modules/@orkestrel/scaffold/dist/agents/skills/orkestrel-dispatch/scripts/launch.js', '--journal', 'tmp/claude/c1-think-series.jsonl', '--errors', 'tmp/claude/c1-think-series.err', '--cap', '57600', '--', 'node', "$h/.build/bench5/continuous.js", 'series', '--manifest', "$h/../results/c1/q4-think/freeze/manifest.json", '--manifest', "$h/../results/c1/q2-think/freeze/manifest.json", '--base', "$h/tmp/c1-think", '--live', '--url', 'http://127.0.0.1:11435')
Start-Process -FilePath node -ArgumentList $a -WorkingDirectory 'C:/Users/mikes/WebstormProjects/agent' -WindowStyle Hidden -PassThru
```

Launch both detached with `Start-Process`: a harness background task is killed at two hours. The user's own Ollama on port 11434 is never stopped.

## What is next, in order

1. When the series closes, confirm every arm's `run.json` is terminal and its `faults` hold no transport error. Build the blind packet per key from this repository's root: `node .orkestrel/agent/instruments/harness/.build/bench5/continuous.js blind --manifest .orkestrel/agent/instruments/results/c1/<key>-think/freeze/manifest.json --run .orkestrel/agent/instruments/harness/tmp/c1-think/<key>/records --run .../compaction --run .../full --oracle .orkestrel/agent/instruments/units/aggregates/endurance/private/evaluation.json --out .orkestrel/agent/instruments/results/c1/<key>-think/audit/packet.json --keys .orkestrel/agent/instruments/results/c1/<key>-think/private/keys.json`, then split it with `node .orkestrel/agent/instruments/harness/tools/c1/c1-split.ts <packet> <audit>/items`.
2. Label on GPT-6.1 Sol through Codex (the Codex family first; Claude Sonnet only if the Codex bench is dark). `tools/c1/c1-label-q2c-driver-2.ts` is the driver that worked (three `codex exec` at a time, spawned without a shell, journaled under `tmp/codex/`), but it embeds the q2-continue packet's item ids, hashes, and results path: generalize it to read `items/index.json` and take the packet path and the packet and key hashes as arguments before running it. The adjudication brief is `tools/c1/c1-label-brief.md`; its checker command runs from this repository's root. Expect about 190 items per key.
3. Merge with `c1-merge-labels.ts`, check with `continuous.js labels`, report with `continuous.js report`, render with `c1-render.ts`, and read costs and cuts with `c1-summary.ts` and `c1-repeats.ts`. Add a thinking section to the scaffold's root `RESULTS.md` beside § c1, stating that the thinking pass ran at reserve 1024 (window 3584, `predict` 512) while the thinking-off pass ran at 512, and that q4 records overflowed at goal 48. Fold the findings into `direction.md`.
4. The user decides the preservation move in `direction.md` § 5 (a durable home for the harness, and the complete-capture golden probe promoted into the package's ledger tests). The harness runs where it is until then.
5. The version bump, when the user asks: six breaking changes for 0.0.30 consumers (`scopes.add`, the narrower `createRelayProvider`, the stricter run guard, `keep`, `isJudgment`, and the `handleAgentRunnerJob(registry, partial, spawned, controller)` signature). Run the falsify skill's bump check before publishing.

## Things to know before touching the harness

- **Never rebuild `.build` while the series or a labeler is running:** the series executes from it, and a rebuild mid-labeling once broke four adjudicators' checks. To compile or test during a live series, mirror the harness to a scratch directory and build there.
- Build from `instruments/harness/` with `node tools/build.ts --compiler <this repo>/node_modules/typescript/bin/tsc --types <this repo>/node_modules/@types`; `readBuild()` refuses a stale build. Prove it with `node --test .build/bench5/tests/continuous/Trial.test.js .build/bench5/tests/continuous/Audit.test.js` (10 tests, green after the sweep).
- The harness's aggregate-era tests (`bench5/tests/development.test.ts`, the sustained directed helpers) read results trees the sweep removed; they no longer run and are not part of the c1 proof.
- Frozen manifests and `run.json` files bind absolute paths. The thinking-off raw runs under `tmp/c1/` and `tmp/c1-continue/` bind the old scaffold location, so `readContinuousRun` refuses them here; their graded packets, labels, and reports are under `instruments/results/c1/{q4,q2,q2-continue}/`. To re-read one (for `c1-repeats.ts`, say), create a junction for the duration and remove it after: `cmd /c mklink /J C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent C:\Users\mikes\WebstormProjects\agent\.orkestrel\agent`.
- The harness tree sits outside the root formatter and lint scope (both skip dot-directories), and its files were never formatted; keep it that way or reflow it in one dedicated commit.
- The c1 report counts a leak an adjudicator records in a product's own text per arm and a missed ambiguous control per adjudicator; a foreign leak or a missed stale or fabricated control still voids the batch.
- The scaffold law is read from `../scaffold`. The scaffold's remaining dirt (`enterprise-veneer` skill files, `host.json`, `tests/distribution.test.ts`) is the user's own work. Roles never commit, push, or run destructive git.

## Open questions the user owns

Whether to bump and publish; whether to move the harness to a durable home now or after the thinking pass; whether a downstream call-site inventory settles the external-exposure unknown (`scopes.create`, `createRelayProvider` returning `RelayProvider`).
