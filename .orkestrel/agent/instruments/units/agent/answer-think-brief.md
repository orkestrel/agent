# Unit answer-think — Run the records answer pass with thinking off

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes the flag, its values, and the behavior. Executor: NATIVE_SUBAGENT.

## Objective

Add a `--answer-think on|off` flag to the records harness `tmp/bench3/bench.mjs` (in `/home/user/agent`). With `off` and `--think`, the ledger's tool-free answer pass sends `think: false` while every other agent call keeps `think: true`. With the flag absent or `on`, every request body stays byte-identical to the bodies before this unit.

## Context

- **Evidence.**
  - In `tmp/bench/results/v10/t2w-records-v1`, goals g01 and g10 got no reply. Each first pass ended with a call whose thinking held the answer and whose content was empty (wire responses `00012` and `00083` in `t2w-records-v1-wire`).
  - The tool-free answer pass then thought to the 2,048-token cap, in a loop of rechecks, with no content (wire responses `00013` and `00084`). With thinking off, the 2B answers that pass directly.
- **The seams.**
  - The answer pass is the `answer` function near `bench.mjs:3392`, which calls `generate('answer', …)`; `generate` (near `:3368`) calls `agent.generate()`.
  - The provider's `body` sets `think: this.#think` (near `:430`); the `request.options` it receives carries any per-run `think` the agent forwards.
  - The flags are parsed near `:175` to `:253`, and `--think-predict` is the precedent for a flag whose absence leaves the bodies unchanged.
  - The run's summary line (near `:3739`) and the row writer name the settings.
- **Law.**
  - `AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`;
  - `/home/user/scaffold/.claude/rules/writing.md` for comments.
- **Standing conditions.**
  - The file is the measured harness, and a live series runs it between your edits' install and the next run. Write the change to `tmp/bench3/bench.mjs.next`, a copy of `bench.mjs` with your edit, and leave `bench.mjs` untouched. The Orchestrator installs it.
  - Send no request to `127.0.0.1:11434`.
  - Never run `npm run build` or `npm run clean`.

## Scope

- **Owned.** `tmp/bench3/bench.mjs.next` (create it from `bench.mjs`), and `tmp/bench3/answer-think-check.mjs` if you need a temporary copy with the `.mjs` extension to run the checks (delete it before you finish).
- **Off-limits.** Every other file, `tmp/bench3/bench.mjs` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **`--answer-think`**: a string flag, values `on` and `off`, default `on`.
   - Any other value fails with the harness's usage refusal, exit 2, as `--think-predict 0` does.
   - `off` without `--think` fails the same way, with a message that says the flag needs `--think`.
2. **With `off`:**
   - the answer pass's `generate` calls `agent.generate({ think: false })`;
   - the provider's `body` sends `think: request.options?.think ?? this.#think`;
   - every other pass and call keeps `think: true` and its `num_predict`.
   - The call's log entry records that it ran with thinking off (for example `think: false` beside `thinking`), so the run's thinking tallies leave it out of the cut counts.
3. **With `on` or absent:** no call passes options to `agent.generate`, so every body is byte-identical to today's.
4. **The summary line** names `answer-think off` only when it is set, so an unset run's summary text is unchanged.
5. **Self-check.** Add one check to the `--check-ledger` suite:
   - a stub-transport run under `--think --answer-think off` sends `think: false` on its answer-pass body and `think: true` on its first-pass body;
   - the same run without the flag sends `think: true` on both.

## Output

Return:

- each contract's `path:line` in `bench.mjs.next`;
- each gate's exit code;
- the sha256 of `bench.mjs.next`.

No process diary.

## Acceptance criteria

Run each from `/home/user/agent`, against a temporary `.mjs` copy of `bench.mjs.next`, because Node loads no `.next` extension:

1. `node --check` on the copy exits 0.
2. The copy's `--check-ledger --profile refined` exits 0.
3. The copy's `--check-ledger --profile roundA` exits 0.
4. The copy with `--answer-think maybe` exits 2, and the copy with `--answer-think off` and no `--think` exits 2.
5. `diff <(sed -n p tmp/bench3/bench.mjs) tmp/bench3/bench.mjs.next` shows only this unit's edit.
