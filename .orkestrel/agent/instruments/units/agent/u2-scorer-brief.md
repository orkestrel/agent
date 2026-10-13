# Unit u2-scorer — Stage the scorer corrections for g01, g03, g05, g06, and g08

## Role and engine

GPT-6 Astra on the `astra` lane, reached through `codex exec` in a workspace-write sandbox. Executor: BENCH_ENGINE. You are the engine: implement this unit yourself, and launch no `codex`, no bench probe, and no other agent.

## Objective

Stage, in `tmp/bench/u2/`, the scoring rules that make five goals score what their requests ask, with an apply script and a before-and-after comparison over every recorded v9 and v10 reply. A live series reads the scorer and every scenario file at each run start, so this unit changes no live file; the Orchestrator applies the staged rules after the series ends.

## Context

- **Scorer.** `tmp/bench/rescore.mjs` exports `compileRules`, `scoreText`, `clean`, and `plainText`; `tmp/bench/bench.mjs`, `tmp/bench3/bench.mjs`, and `/home/user/agent-port/tmp/bench4/Driver.mjs` import them. `rescore.mjs` refuses a row whose own scenario file has scoring fields (`expected`, `expectedAny`, `forbidden`, `forbiddenPatterns`) that differ from `scenario.json`'s, so every scenario file carries the same scoring.
- **Scenario files.** `tmp/bench/scenario.json`, `tmp/bench/variants/v1.json` to `v8.json`, and `tmp/bench/variants/ledger/v1.json` to `v8.json`: 17 files. The `.pre-*` files beside them are backups; leave them alone.
- **Recorded replies.** Every run under `tmp/bench/results/v9/` and `tmp/bench/results/v10/` holds `RUN/*.jsonl` rows with `goal`, `success`, and the scored text (`rescore.mjs` near line 119 picks `answer`, then `reply` or `content` by `answerVia`). Skip `aborted/`, `probes/`, `superseded/`, `*-wire/`, and calibration rows. The runs named `t4-*-v3` and `t4-*-v4` in `v10/` are being written; read only rows a run's `.log` already reports.
- **Audit verdicts.** Blind audits graded many of those replies. `tmp/bench/results/v10/audit/verdicts-*.json` with keys in `tmp/bench/results/v10/audit-keys/key-*.json`, and `tmp/bench/results/v9/audit/verdicts-*.json` with keys in `tmp/bench/results/v9/audit/key-*.json`. A key maps an `id` to `run` and `goal`; a verdict carries `verdict` (`correct`, `wrong`, or `ambiguous`) and its reason.
- **Evidence for each rule.**
  - `/home/user/scaffold/.orkestrel/agent/issues.md` § I-327, § I-330, § I-341, and § I-295.
  - `tmp/bench/results/v10/G06.md` and `tmp/bench/results/v10/METHOD-DEEP-DIVE.md` § Trace g08 and § Findings outside the claims.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/writing.md` for comments and the report.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Write nothing outside `tmp/bench/u2/`. Never run `npm run build` or `npm run clean`.

## Scope

- **Owned.** `tmp/bench/u2/`, which you create.
- **Off-limits.** Every other path, `tmp/bench/rescore.mjs`, every scenario file, and every result included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Write each fixture before its rule, run it against the live rules, and report the fixtures that fail there.

## Contracts to land

1. **g03 and g05, the replaced code.** A reply that names MX-4471 as the code that was replaced (for example "rotated from MX-4471 to MX-4486", "the original code MX-4471", "MX-4471 (old)") passes the MX-4471 pattern; a reply that gives MX-4471 as the code to use still fails it.
2. **g01, the scrapped fee.** g01's `forbiddenPatterns` carry the restocking patterns g05 carries, so a refund reply that applies or reserves a restocking fee fails g01.
3. **g06, the delivery date.**
   - A date fails only in a sentence or table row about arrival, delivery, an estimate, or an expected date; the 2026-10-07 ship date and a dated header pass. Every written form of 2026-10-12 still fails anywhere.
   - A reply that claims the kettle arrived or was delivered fails.
   - A reply with no text addressed to the customer fails, such as a note to the shift lead that drafts nothing Kenji can receive.
   - A claimed gift-note action that the lookup contradicts (§ I-330): find the goal whose replies carry it and rule it in the report, adding a pattern only where a recorded reply needs one.
4. **g08, the figure.** A reply that states an available-credit figure other than $3,760 fails; "$4,240 total after the order, within the $5,000 limit" passes. The account manager's line stays unscored.
5. **Scorer field.** When a rule needs a check the four fields cannot express, add one field to a staged copy `tmp/bench/u2/rescore.mjs`, applied by `compileRules` and `scoreText` so the three importers inherit it unchanged, and save `tmp/bench/u2/rescore.diff` against the live file. Otherwise stage no scorer copy.
6. **Rules file.** `tmp/bench/u2/rules.json` holds, per changed goal, the whole replacement value of each changed field.
7. **Apply.** `node tmp/bench/u2/apply.mjs --check` reads the 17 live files, exits 1 naming the file and field when one file's scoring for a changed goal differs from `scenario.json`'s, and prints each field it would change; `--write` backs each file up as `FILE.pre-u2`, writes the rules, installs the staged scorer when one exists (backup `rescore.mjs.pre-u2`), and refuses to run when a `.pre-u2` file exists. Every other field of every file stays byte-identical.
8. **Compare.** `node tmp/bench/u2/compare.mjs` scores every recorded v9 and v10 row of the five goals under the live rules and the staged rules, without writing outside `tmp/bench/u2/`, and writes `compare.json` and `compare.md`: each changed verdict with its run, goal, the reply excerpt that decides it, the old and new verdicts, and the audit verdict when one exists. `node tmp/bench/u2/compare.mjs --fixtures` scores `tmp/bench/u2/fixtures.json` (hand-written replies, each with its intended verdict and the rule it exercises, covering every case contracts 1 to 4 name) under the staged rules and exits 1 on any mismatch.

## Output

Return the rules per goal, each fixture that failed under the live rules, the counts of changed verdicts per goal and direction, every changed verdict that disagrees with its audit verdict with your ruling, the `--check` output, and each gate's exit code.

## Acceptance criteria

1. `node --check` exits 0 for every script in `tmp/bench/u2/`.
2. `node tmp/bench/u2/compare.mjs --fixtures` exits 0.
3. `node tmp/bench/u2/compare.mjs` exits 0, and every changed verdict on an audited row agrees with a `correct` or `wrong` audit verdict, or `compare.md` quotes the reply and states why the audit verdict is wrong.
4. `node tmp/bench/u2/apply.mjs --check` exits 0.
5. No file outside `tmp/bench/u2/` changed: list `find tmp/bench -newer tmp/bench/u2 -type f -not -path 'tmp/bench/u2/*' -not -path 'tmp/bench/results/v10/t4-*'`, which prints nothing.
