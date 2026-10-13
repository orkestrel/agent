# Unit control-answer-think — Run the main harness's answer run with thinking off

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a native subagent. This brief fixes the behavior. Executor: NATIVE_SUBAGENT.

## Objective

In the main harness `tmp/bench/bench.mjs` (in `/home/user/agent`), which runs the full view and compaction, the tool-free answer run that follows `ANSWER_CUE` must send `think: false` under `--think`. Every other call keeps the run's thinking, and a run without `--think` is unchanged. This is the same fix the records harness took, and it carries no flag.

## Context

- **Evidence.**
  - In `tmp/bench/results/v10/t2w-control-v2`, goal g07 ended with no reply. Its answer run (wire `00010`, no tools, thinking on) thought to the 2,048-token cap with no content.
  - The records harness ran its answer pass with thinking off and replied on 40 of 40 goals.
  - The user ruled that a thinking answer pass is a defect for every harness, not an option.
  - The records harness's fix is the precedent; its diff is `tmp/units/answer-think-fixed.diff`.
- **The seams.**
  - `finishGoal` near `bench.mjs:2462` runs the answer run with `runs.push(await attempt(agent, 2))` under the `ANSWER` scope.
  - `attempt` near `:2431` calls `agent.generate()`.
  - The provider's `body` near `:538` sends `think: this.#think`, and the log entry near `:531` adds the thinking tallies.
  - The `--probe-reply` think cases near the README's line 173 check that every request asks for thinking with `num_predict` 1024.
- **Law.**
  - `AGENTS.md`, which resolves to `/home/user/scaffold/AGENTS.md`;
  - `/home/user/scaffold/.claude/rules/writing.md` for comments.
- **Standing conditions.**
  - Write `tmp/bench/bench.mjs.next`: copy `bench.mjs` over it first, then edit the copy. Leave `bench.mjs` untouched; the Orchestrator installs the change.
  - Send no request to `127.0.0.1:11434`.

## Scope

- **Owned.** `tmp/bench/bench.mjs.next`, `tmp/bench/README.md.next` (copied from `README.md`, then edited), and a temporary `.mjs` copy for the gates, which you delete before you finish.
- **Off-limits.** Every other file.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **`attempt`.** It takes an optional per-run `think` and passes `agent.generate({ think })` only when it is given; otherwise it calls `agent.generate()` exactly as today.
2. **The answer run.** Under `--think`, `finishGoal`'s answer run calls `attempt(agent, 2, false)`. The reminder run of `--reply tool` keeps the run's thinking. Add one comment stating why: a thinking model asked for a reply with no tools can end its turn inside its reasoning, or think to the cap.
3. **The provider body.** It sends `think: request.options?.think ?? this.#think`. When an overridden call sends `think: false`:
   - it keeps the condition's `num_predict`, as the records harness's answer pass does;
   - its log entry carries `think: false`;
   - it takes no thinking tallies.
   - This matches the records harness's entry.
4. **Without `--think`.** Every body is byte-identical to the installed file's bodies.
5. **`--probe-reply`.** Under think on, the case "thinking that spends `num_predict` with no content, then an answer under the answer scope" checks two things:
   - the first request asks for thinking with `num_predict` 1024;
   - the answer-scope request sends `think: false` with `num_predict` 1024.
   - Keep every other check.
6. **README.** In `README.md.next`, update the thinking-mode section and the `--probe-reply` think case to state that the answer run runs with thinking off. The sentence at the README's line 182, that thinking text never reaches a later request, stays true and stays.

## Output

Return:

- each contract's `path:line`;
- each gate's exit code;
- the sha256 of `bench.mjs.next` and `README.md.next`.

No process diary.

## Acceptance criteria

Run each from `/home/user/agent`, against a temporary `.mjs` copy of `bench.mjs.next` placed in `tmp/bench/`:

1. `node --check` on the copy exits 0.
2. The copy's `--probe-reply`, `--probe-search`, `--probe-exchanges`, and `--probe-chain` each exit 0. Read each flag's other arguments from the README.
3. `diff tmp/bench/bench.mjs tmp/bench/bench.mjs.next` shows only this unit's edit.
