# Handoff for the next session

Written 2026-10-13 by the orchestrating session after the user accepted the hardening, asked for the sweep, and moved this campaign folder from the scaffold checkout into the agent package. Read this file, then `plan.md`, `progress.md`, `ledger.md`, and `direction.md`, in that order.

## Where everything is

- **This folder** (`.orkestrel/agent/` in `C:/Users/mikes/WebstormProjects/agent`) came whole from `C:/Users/mikes/WebstormProjects/scaffold/.orkestrel/agent/` (scaffold commit `5cc537971` on branch `claude/confident-maxwell-6nd0f3` removed it there). It holds the campaign records (`plan.md`, `progress.md`, `ledger.md`, `direction.md`), the c1 harness (`instruments/harness/`), the endurance workload and private oracle (`instruments/units/aggregates/endurance/`), and the results custody (`instruments/results/`, about 425 MB tracked, most of it the earlier aggregate campaign's archives).
- **The package** is `main` at `901c786` (hardening accepted as it stands, no version bump). Its own `tmp/probes/` keeps the two golden probes and their recordings; copies live under `instruments/harness/golden/`.
- **The scaffold law** is read from `../scaffold` (its `AGENTS.md`, `.agents/orchestration.md`, `.claude/rules/`, skills). The scaffold's remaining dirt (`enterprise-veneer` skill files, `host.json`, `tests/distribution.test.ts`) is the user's own work, not this campaign's.
- **The dedicated Ollama daemon** still runs from the scaffold checkout: port 11435, PID 24556 (receipt `../scaffold/tmp/units/c1-daemon-start.json`, launcher `../scaffold/tmp/units/c1-daemon-launch.ts`, journal `../scaffold/tmp/claude/c1-daemon.jsonl`). The user's own Ollama on 11434 must never be stopped.
- **Memory** for this project is under `C:/Users/mikes/.claude/projects/C--Users-mikes-WebstormProjects-agent/memory/`: the c1 comparison, the src audit, and the model-limits guidance (Codex family first; Opus to GPT-6 Astra, Sonnet to GPT-6.1 Sol, Haiku to GPT-6 Luna; probe the bench with `bench.ts --codex`).

## What is running right now

The thinking-enabled c1 pass: both models, the three arms, `think` on, reserve 1024, window 3584, `predict` 512, `continue` policy. Manifests `instruments/results/c1/q4-think/freeze/manifest.json` and `q2-think/freeze/manifest.json` (frozen from this location, so their file bindings point here). Launched detached at about 14:30 local on 2026-10-13 through the installed launcher: launcher PID 33332, series PID 67368, journal `tmp/claude/c1-think-series.jsonl` with `.err` and `.pid` beside it, cap 57600 s, raw runs under `instruments/harness/tmp/c1-think/<key>/<arm>/`. With thinking, q4 records served about one goal per minute during its first eight goals before the move forced a restart, so expect roughly ten to twelve hours for the whole series. Read liveness from the journal and the run directories, never from a shell; the launcher writes `exit=` into the `.err` file at the end.

If the series dies or is capped: the `series` phase skips every run directory whose `run.json` carries a terminal status and refuses a directory without one, so delete the unfinished arm's directory under `tmp/c1-think/<key>/` and relaunch the same command (the exact command is the `Start-Process` line recorded in the ledger's last entry).

## What is next, in order

1. When the series closes, build the blind packets per key from this directory: `node instruments/harness/.build/bench5/continuous.js blind --manifest instruments/results/c1/<key>-think/freeze/manifest.json --run instruments/harness/tmp/c1-think/<key>/records --run .../compaction --run .../full --oracle instruments/units/aggregates/endurance/private/evaluation.json --out instruments/results/c1/<key>-think/audit/packet.json --keys instruments/results/c1/<key>-think/private/keys.json`, then split with `node instruments/harness/tools/c1/c1-split.ts <packet> <audit>/items`.
2. Label on GPT-6.1 Sol. `instruments/harness/tools/c1/c1-label-q2c-driver-2.ts` is the driver that worked (three `codex exec` at a time, journaled under `tmp/codex/`), but it embeds the q2 continue packet's ids and hashes: generalize it to read `items/index.json` and take the packet and key hashes as arguments before running it. The adjudication brief is `instruments/harness/tools/c1/c1-label-brief.md`; its checker command is relative to this repository's root. Expect about 190 items per key.
3. Merge with `c1-merge-labels.ts`, check with `continuous.js labels`, report with `continuous.js report`, render with `c1-render.ts`, and add a thinking section to the scaffold's root `RESULTS.md` beside the c1 section, stating that the thinking pass ran at the 1024 reserve while the thinking-off pass ran at 512.
4. Decide the preservation move in `direction.md` § 5 (a durable `bench/` home, and the complete-capture golden probe promoted into the package's ledger tests); the harness runs where it is until then.
5. The version bump, when the user asks: six breaking changes for 0.0.30 consumers (`scopes.add`, the narrower `createRelayProvider`, the stricter run guard, `keep`, `isJudgment`, and the `handleAgentRunnerJob(registry, partial, spawned, controller)` signature). Run the falsify skill's bump check before publishing.

## Things to know before touching the harness

- Build it from `instruments/harness/` with `node tools/build.ts --compiler <this repo>/node_modules/typescript/bin/tsc --types <this repo>/node_modules/@types`; `readBuild()` refuses a stale `.build`, which is gitignored. Prove it with `node --test .build/bench5/tests/continuous/Trial.test.js .build/bench5/tests/continuous/Audit.test.js` (10 tests). Never rebuild while labelers are running the checker: a rebuild mid-labeling broke four adjudicators' checks once.
- Frozen manifests and `run.json` files bind absolute paths. The completed thinking-off runs under `instruments/harness/tmp/c1/` and `tmp/c1-continue/` bind the old scaffold location, so `readContinuousRun` refuses them here; their packets, labels, and reports are retained under `instruments/results/c1/{q4,q2,q2-continue}/audit/`. To re-read a retained run, create a junction at the old path (`cmd /c mklink /J C:\Users\mikes\WebstormProjects\scaffold\.orkestrel\agent C:\Users\mikes\WebstormProjects\agent\.orkestrel\agent`) for the duration and remove it after; making the bindings relative is a harness change worth its own unit.
- The harness tree sits outside the root formatter and lint scope (both skip dot-directories), and its files were never formatted; keep it that way or reflow it in one dedicated commit.
- `instruments/bench4/Driver.mjs` carries a pre-existing uncommitted modification from the aggregate era; it was moved as it stood and committed here. Leave it.
- The report counts a leak an adjudicator records in a product's own text per arm and a missed ambiguous control per adjudicator; a foreign leak or a missed stale or fabricated control still voids the batch.

## Open questions the user owns

Whether to bump and publish; whether to move the harness to a durable home now or after the thinking pass; whether a downstream call-site inventory should settle the external-exposure unknown (`scopes.create`, `createRelayProvider` returning `RelayProvider`).
