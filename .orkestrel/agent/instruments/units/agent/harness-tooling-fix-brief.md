# Unit harness-tooling-fix — Close the harness and series findings of the attack round

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

Close the attack round's harness and series findings. The findings are in `/home/user/agent/tmp/bench/results/v10/audit/attack.json`, under `confirmed`:

- records-harness B and C6;
- main-harness F4 and F5;
- machinery F4 and F8.

A live series runs both harnesses and the series tools. Stage every executable change as a `.next` file beside its original, and leave the originals untouched; the Orchestrator installs the changes between runs. The READMEs are read by no run, so edit them in place.

## Context

- **Files.**
  - The records harness `/home/user/agent/tmp/bench3/bench.mjs` and its `README.md`.
  - The main harness `/home/user/agent/tmp/bench/bench.mjs`, its `README.md`, and `rescore.mjs`.
  - The series tools `/home/user/agent/tmp/bench/results/v7/tools/series.ts` and `run-one.ts`.
- **Law.**
  - `AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`;
  - `/home/user/scaffold/.claude/rules/writing.md`.

## Scope

- **Owned.**
  - `tmp/bench3/bench.mjs.next` and `tmp/bench3/README.md`;
  - `tmp/bench/README.md` and `tmp/bench/rescore.mjs.next`;
  - `tmp/bench/results/v7/tools/series.ts.next` and `run-one.ts.next`;
  - temporary `.mjs` copies for gates, which you delete before you finish.
- **Off-limits.** Every other file, the installed `bench.mjs` files, `series.ts`, and `run-one.ts` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create. Send no request to `127.0.0.1:11434`.

## Contracts to land

1. **C6, records self-check.** In `bench3/bench.mjs.next`:
   - `runLedger`'s arm construction passes `think: flags.think` explicitly (near line 3514);
   - the `--check-ledger` answer-pass case builds its arm through that same construction path with `flags.think` set true for the check;
   - the case asserts that the answer-pass request sends `think: false` and the first-pass request sends `think: true`.

   Every existing check still holds.
2. **B, records README.** Rewrite `bench3/README.md` near line 441 so that it states what the code does:
   - the tool-free answer pass sends `think: false` and keeps the `num_predict` cap;
   - the reminder and hold runs think;
   - `num_predict` comes from `--think-predict` (default 1024).

   Add `--think-predict N` to the flag table, and correct lines 109 and 437 to match.
3. **F4 (main), main README.** In `bench/README.md` near lines 116 and 421, state `num_predict` as the `--think-predict` value (default 1024), and add `--think-predict` to the flag table.
4. **F5 (main), rescore.** In `rescore.mjs.next`, refuse with exit 2 when a row's `scenario` field names a file whose scoring fields (`expected`, `expectedAny`, `forbidden`, `forbiddenPatterns`, `tools`) differ from `scenario.json`'s for that goal. Name the goal and the field.
5. **Machinery F4 and F8, series safety.**
   - `run-one.ts.next` refuses (exit 2) when the run's output directory, its `.log`, or its `-wire` directory already exists.
   - `run-one.ts.next` appends the harness file's sha256 to the start line it writes to `run.log`, as ` harness-sha256 HEX`.
   - `series.ts.next` refuses to start (exit 2) when `run.log` holds a start line with no matching end line.
6. **No other behavior changes.**
   - Run without the new conditions, each `.next` file does exactly what its original does.
   - The harness `.next` file sends byte-identical request bodies.

## Output

Return:

- each contract's `file:line`;
- each gate's exit code;
- the sha256 of every `.next` file.

## Acceptance criteria

Run from `/home/user/agent` through temporary `.mjs` copies where Node needs the extension.

1. The `bench3/bench.mjs.next` copy passes these checks:
   - `node --check`;
   - `--check-ledger --profile refined`, `--check-ledger --profile roundA`, and `--check-ledger --think --profile refined`, each exiting 0.
2. `node --check` on the `rescore.mjs.next` copy. Its usage run exits as the original's does.
3. `series.ts.next` and `run-one.ts.next`:
   - each runs with no arguments and exits 64, as the original does;
   - `run-one.ts.next`, given an output path that exists, exits 2.

   Use a scratch path under `/tmp/claude-0/-home-user/5e260bfe-213d-5ed6-a85a-c681e970c415/scratchpad/`, and launch no harness.
4. `diff` of each original against its `.next` file shows only this unit's edits.
