# Unit p1-probe-normalizations — Add the ruled normalizations and close the probe review

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a workflow subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

Bring the replay probe to the rulings in `/home/user/agent-port/tmp/units/records-port-plan.md` § Replay fidelity rulings, and close the three findings of `/home/user/agent-port/tmp/units/u8b-review.md` (contracts 2, 4, and 8). The port is fixed in a separate checkout at the same time; this worktree's `src/` stays at `111beef` until the Orchestrator moves it, so the per-copy tests keep failing on C1, C3, C4, C5, and C6 here.

## Context

- **Probe.** `tmp/probes/ledger-replay.test.ts`, `ledger-replay-compare.ts`, and `ledger-replay-support.ts`, in this worktree, `/home/user/agent-port-gauge`.
- **Normalization wording.** `/home/user/agent-port/tmp/units/fidelity-planner.md` § Probe normalizations (P1): N8, the R2a scope, and N9.
- **Review.** `/home/user/agent-port/tmp/units/u8b-review.md`, contracts 2, 4, and 8, each with its required change.
- **Recorded runs.** `/home/user/agent/tmp/bench/results/v9/a5-records-v1` to `v8`, their `-wire` directories, and `/home/user/agent/tmp/bench/results/v3/cal-categories.jsonl`, read-only.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/tests.md`.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port`.

## Scope

- **Owned.** The three probe files and `tmp/probes/ledger-replay-report.json`.
- **Off-limits.** Every other file, `src/` and `tests/` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **N8, ended pin lines (C2).** As the planner words it: on the recorded body only, drop a line that matches `^p\d+ \([mr]\d+\) ended: superseded by [mr]\d+$` from a recall result or an answer note, count the drops, and report a body unlisted with `C2 cut room` when the same content also carries a cut line.
2. **N9, the held second ask (C7).** Replace the fabricated 200 response.
   - A body with no twin matches a held row only when every member except `prompt` equals the recorded calibration judge body's members (`model`, `system`, `options`, `format`, `raw`, `stream`, `logprobs`, `top_logprobs`, `keep_alive`, and any other), and the prompt carries the row's state, its question line, and the answer instruction.
   - The response reproduces the recorded failure, so that `createOllamaJudge` rejects with the row's error.
   - Each row is served at most once per copy; a second match gets 500 and no twin.
   - Assert per copy that the held second asks equal `seed.json`'s undecided list and that no held item is asked a third time.
3. **R2a scope.** `dropStale` runs on the briefing only. Confirm it, and keep a stale difference in a recall or a note unlisted.
4. **Controls (review contract 4).**
   - The non-stale recall control selects its line through the recorded body's leads: an `mN` lead with a decided correction, in a tool message that answers `recall`.
   - Add a control that removes a stale sentence from a recall line and expects `unlisted` with C6.
   - Add a control in which a pin-like line carrying a token that is not a handle stays unlisted.
   - Keep the held-like body control with changed `options`, which gets 500.
5. **Labels (review contract 8).** Label a port-only line C1 only when its text equals a seed message whose recorded line was cut; label C3 only when the same text is still among the port's lines; label anything else C8 with its exact lines.
6. **Per-copy assertion.** Each copy's body test requires 0 unlisted bodies after N1 to N9, F4a, and R2a on the briefing.

## Output

Return:

- the per-copy counts by cause;
- each gate's exit code;
- every C8 body with its exact diff.

## Acceptance criteria

1. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` from `/home/user/agent-port-gauge`: every setup, judge, first-request, call-count, and control test passes; the per-copy tests fail only on labeled bodies.
2. `npx oxlint --config .oxlintrc.json --deny-warnings` on the three probe files exits 0.
3. `git -C /home/user/agent-port-gauge diff --stat -- src tests` is empty.
