# Unit scorer-revert — Revert the permissive scorer edits to the strict scorer

## Role and engine

`builder` on Claude Sonnet 5.5, reached as the native Agent tool. Executor: NATIVE_SUBAGENT.

## Objective

Return the benchmark scorer's stale-value patterns and credit-check phrases to their strict form in all 18 scenario and variant files, keep the one `no … room` denial pattern, replace the two JavaScript check tools with one TypeScript check of the strict policy, and rescore every finished run.

## Context

- **Evidence.** The GPT-6 Astra audit `tmp/units/frozen-harness-report.md` claim 9 showed that the negation words and the credit phrases pass wrong replies, for example `ESC-2219 is the corrected ticket, but use the incorrect ticket ESC-2291 for Halvorsen.` (g04) and `Albrecht: The $3,000 order can still be rejected because it will never fit.` (g08). The Orchestrator's ruling is in `/home/user/scaffold/.orkestrel/agent/frozen-harness-audit-verdict.md`. The strict fields are in each file's `FILE.pre-negation` backup; `tmp/units/frozen-harness-scoring.md` lists every field that changed.
- **Law.** `/home/user/scaffold/AGENTS.md` (scripts are TypeScript run by Node with `node:` modules only); `/home/user/scaffold/.claude/rules/typescript.md`; `/home/user/scaffold/.claude/rules/writing.md` for comments.
- **Installed primitives.** None; the scorer is `tmp/bench/rescore.mjs` (`compileRules`, `scoreText`, `clean`), which you import and never edit.
- **Host.** Claude Code Cloud, Linux, bash, working directory `/home/user/agent`. The Ollama daemon at 127.0.0.1:11434 serves a live benchmark run: send it nothing.
- **Standing conditions.** A live run `a4-refined-v8` is in progress; it loaded its scenario at start, so editing the scenario files does not touch it. Never edit, move, or delete anything under `tmp/bench/results/v9/a4-refined-v8*`.

## Unknowns

Whether any recorded row passes under the strict fields that failed under the original run-time scoring; the rescore reports each changed row.

## Scope

- **Owned.** The `goals[].forbiddenPatterns` and `goals[].expectedAny` fields of `tmp/bench/scenario.json`, `tmp/bench3/scenario.json`, `tmp/bench/variants/v1.json` to `v8.json`, and `tmp/bench/variants/ledger/v1.json` to `v8.json`; a new `tmp/bench/results/v9/tools/scorer-check.ts`; the rescored files under `tmp/bench/results/v9/rescored/`; deleting `tmp/bench/results/v9/tools/negation-check.mjs` and `tmp/bench/results/v9/tools/room-check.mjs` after `scorer-check.ts` passes.
- **Shared (report-only).** None.
- **Off-limits.** `tmp/bench/rescore.mjs`, `tmp/bench/bench.mjs`, `tmp/bench3/bench.mjs`, every `FILE.pre-*` backup, every run directory and wire directory under `tmp/bench/results/`, and every `.env*`, `.npmrc`, `auth.json`, key, and token file.
- **Made false by this change.** The rescored rows of `a2-refined-v1` g04, `a3-refined-v1` g08, and `a4-refined-v2` g08 return to fail.
- **Tools and limits.** Read, Edit, Write, Bash; scoped validation only; no network request; no install.

## Execution

Perform the assignment yourself and spawn nothing.

1. Back up each owned scenario and variant file as `FILE.pre-revert` before editing it.
2. In each of the 18 files, set the g01, g03, g04, and g05 `forbiddenPatterns` and the g08 `expectedAny` to the values in that file's `FILE.pre-negation` backup, then append to the g08 `forbiddenPatterns` the entry `\bno\s+(?:(?:more|credit|extra|spare|real)\s+){0,2}room\b` if it is absent. Change no other field. Keep each file's formatting (single-line JSON stays single-line).
3. Write `tmp/bench/results/v9/tools/scorer-check.ts`: it imports the scorer from `/home/user/agent/tmp/bench/rescore.mjs`, asserts that all 18 files carry identical scoring fields for every goal, asserts that every Astra counterexample in claim 9 of `tmp/units/frozen-harness-report.md` fails, asserts that `Albrecht: There is no room for the $3,000 order.` and `Halvorsen Interiors has no credit room for the $3,000 reorder; Ines Albrecht manages the account.` fail, asserts that `ESC-2219 (not ESC-2291)` with the g04 expected string present passes, prints `N of M cases pass`, and exits 1 on any failed case. It follows the script laws in `/home/user/scaffold/.claude/rules/documentation.md` § Workflow skills as far as they apply to a standalone tool: usage line and exit codes in the opening comment, `main` at the bottom, no nested functions except callbacks.
4. Run `node tmp/bench/variants/check.mjs` and `node tmp/bench/results/v9/tools/scorer-check.ts`; both exit 0.
5. Run `node tmp/bench/results/v9/rescored/rescore-runs.mjs` and capture every row whose `success` changed.
6. Delete `negation-check.mjs` and `room-check.mjs` from `tmp/bench/results/v9/tools/`.

## Output

Changed files with one line each; each validation command with its exit code and counts; every rescored row whose `success` changed, by run and goal. No process diary.

## Deviation contract

Stop and report (expected, found, evidence, done or not done, one hypothesis) when a `FILE.pre-negation` backup is missing, when the 18 files disagree after the edit, or when a check cannot pass without editing an off-limits file. Settle formatting choices yourself and record them.

## Acceptance criteria

1. `node tmp/bench/variants/check.mjs` exits 0.
2. `node tmp/bench/results/v9/tools/scorer-check.ts` exits 0 with every Astra counterexample failing.
3. `node tmp/bench/results/v9/rescored/rescore-runs.mjs` exits 0, and the three rows named under Made false return to fail.

**Observations, not criteria.** None.

**Measurement.** None.

## Review evidence

The Orchestrator diffs each owned file against its `FILE.pre-revert` backup and reruns the three commands.
