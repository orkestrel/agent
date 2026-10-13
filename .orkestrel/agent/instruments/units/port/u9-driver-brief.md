# Unit u9-driver — Build the live driver that runs the ported ledger over the measured copies

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Build `tmp/bench4/driver.mjs`, which runs the built port's `createLedger` live over one reworded copy of the Larkspur shift with the measured `a5-records` settings, and writes a result row per goal that `/home/user/agent/tmp/bench/results/v9/tools/band.ts` reads. The Orchestrator runs it against the daemon later; this unit sends no request to it.

## Context

- **Port.** Built at `/home/user/agent-port/dist/src/core/index.js` from commit `7f346b5`: `createLedger`, the ledger constants, and `Message`. The ledger's options and behavior are in `src/core/ledgers/types.ts` and `guides/agent.md` § Serving a conversation through a ledger.
- **Provider and judge.** `/home/user/ollama/dist/src/core/index.js`: `createOllama` and `createOllamaJudge`. Each takes an injected `fetch`; use it to record every request and response.
- **Measured settings.** `/home/user/agent/tmp/bench/results/v9/a5-records-v1/ledger.md` line 3 lists them, and `/home/user/agent/tmp/bench3/bench.mjs` holds the values:
  - agent `qwen3.5:2b-q4_K_M`, thinking off, temperature 0, seed 7, presence penalty 1.5, top_k 20, top_p 0.95, context 3,072;
  - prompt share 0.7 and tail share 0.35;
  - judge `MICA_MODEL` and `MICA_SYSTEM` (`bench.mjs:40-41`) at context 4,096;
  - thresholds `LEDGER_FIT` (`bench.mjs` near line 831);
  - desk topics, questions, and the recall limit of 2 as the harness passes them;
  - lookups answered from the variant's tools table, `/home/user/agent/tmp/bench/variants/ledger/vN.json`.
- **Judgments.** Import the successful judgments of `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl` into the ledger's conversation judgments before the first request, as `bench.mjs` near line 3009 does. The port has no seam for a held failure (`tmp/units/records-port-plan.md` § Replay fidelity rulings, C7), so the held items are asked live; count them.
- **Gauge.** Let the ledger calibrate before its first pass, and record the scale and fixed cost it measured beside `seed.json`'s.
- **Scoring.** Score each reply with the strict scorer the harnesses share: `/home/user/agent/tmp/bench/rescore.mjs` exports `compileRules` and `plainText`; follow the scoring that file applies to a row, against the copy's scenario goals.
- **Reference rows.** `band.ts` reads `DIR/RUN/*.jsonl` rows with `goal` and `success`, 10 per run, and `DIR/rescored/RUN` first.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/writing.md` for comments.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Write nothing under `/home/user/agent`, `/home/user/agent-port-gauge`, or `/home/user/ollama`. Never run `npm run build` or `npm run clean`.

## Scope

- **Owned.** `tmp/bench4/` in this worktree, `/home/user/agent-port`.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **Run.** `node tmp/bench4/driver.mjs --copy N --out DIR` runs copy N and writes:
   - `DIR/p1-ledger-vN/ledger.jsonl`: one row per goal with `goal`, `success`, the reply text, the scorer's failure details, the passes, usage, and wall time;
   - `DIR/p1-ledger-vN-wire/`: every agent and judge request and response, numbered in order;
   - `DIR/p1-ledger-vN/run.json`: the settings, the calibrated gauge, the held items asked live with their outcomes, and the port commit.
2. **Dry check.** `node tmp/bench4/driver.mjs --copy N --dry` builds the ledger and every option, sends nothing, and prints each setting beside the measured value from `a5-records-vN/ledger.md` and `seed.json`; it exits 1 when one differs.
3. **References.** `node tmp/bench4/driver.mjs --references DIR` copies the `a4-refined-v1` to `v8` and `a5-records-v1` to `v8` rows into `DIR` so `band.ts` reads them, read-only copies.
4. **Fetch guard.** Without `--live`, the driver's fetch refuses any request, so no run reaches the daemon by accident.

## Output

Return the dry check's output for copies 1 and 8, each gate's exit code, and `git status --porcelain`.

## Acceptance criteria

1. `node --check tmp/bench4/driver.mjs` exits 0.
2. `node tmp/bench4/driver.mjs --copy 1 --dry` and `--copy 8 --dry` exit 0, with every setting equal to the measured value.
3. `node tmp/bench4/driver.mjs --copy 1 --out /tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/u9-guard` without `--live` exits non-zero on its first request, and writes no row.
4. `git diff --stat` is empty: every file sits under the gitignored `tmp/`.
