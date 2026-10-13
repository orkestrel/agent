# Unit u8b-probe-fix — Make the replay probe report every departure and accept none it cannot name

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a workflow subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

The replay probe written under `tmp/units/u8-ledger-replay-brief.md` over-accepts on four paths, per the review in `tmp/units/u8-review.md` (claims 2 to 5, findings A and B). Close each so the probe reports every body the port sends that differs from the recording, labeled by cause. The port is not changed by this unit, so the per-copy tests keep failing on the port's departures; that is the expected result.

## Context

- **Probe.** `tmp/probes/ledger-replay.test.ts`, `ledger-replay-compare.ts`, and `ledger-replay-support.ts`, all in this worktree, `/home/user/agent-port-gauge`.
- **Evidence.**
  - `tmp/units/u8-report.md`: the builder's report, with the five causes C1 to C5.
  - `tmp/units/u8-review.md`: the reviewer's findings, each with its required change.
- **Measured harness.** `/home/user/agent/tmp/bench3/bench.mjs` and `records.mjs`, read-only.
- **Recorded runs.** `/home/user/agent/tmp/bench/results/v9/a5-records-v1` to `v8` and their `-wire` directories, read-only.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/tests.md`: no mocks, spies, or module replacement; a stub implements the real interface over recorded data.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent`.

## Scope

- **Owned.** The three probe files and a report file `tmp/probes/ledger-replay-report.json`.
- **Off-limits.** Every other file, `src/` and `tests/` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **R2a scope (review claim 2).** Apply the R2a residual on the briefing route only, and decide staleness from the corrections the run decided, not the scorer's `STALE` table. A stale-sentence removal on a recall result or a digest note is unlisted, with cause `C6 stale removal off the briefing route`.
2. **Held judge bodies (review claim 3a).** A judge body with no recorded twin that matches a held row is reported, per copy, with cause `C7 re-asked a held judgment`. The transport answers it so the replay can proceed, and the per-copy test counts it as unlisted. The held match compares `model`, `system`, and `options` with the recorded judge settings as well as the prompt.
3. **Twin reuse (review claim 3b).** When the port sends a recorded body more times than the harness did, the transport returns 500 with no twin. Assert that the number of twinned traces equals the recorded judge body count, less the held rows.
4. **Controls (review claim 4).** Add three controls, each a test that expects the failure:
   - an injection into an answer-pass body, which drops a non-call user message, reads `unlisted`;
   - the removal of a non-stale sentence from a recall line reads `unlisted`;
   - the replay's held predicate, given a held-like prompt with changed `options`, refuses the body.

   The repricing control asserts that repricing changes at least one body.
5. **Setup values (review claim 5).**
   - Assert the gauge the ledger holds through its public `gauge` getter before the first `respond` call against `seed.measured`.
   - Read the judge's `num_ctx` from the run's settings line in `a5-records-vN/ledger.md`.
6. **Compared members (finding A).** Compare the port's `schema` with the recorded `format`, and keep every message member, `thinking` included, in the comparison.
7. **Pricing input (finding B).** Print, per copy, that the scripted provider rewrites `usage.prompt` from the per-call ratio in `ledger.jsonl`, with the count of calls rewritten.
8. **Labeled report.** Label every unlisted body with one or more causes:
   - C1 to C5 as `u8-report.md` names them;
   - C6 and C7 from this brief;
   - `C8 unclassified` for any other, with its exact diff.

   Write `tmp/probes/ledger-replay-report.json`: per copy, per body, the file name, the causes, and a diff excerpt.

## Output

Return:

- the per-copy counts by cause;
- each gate's exit code;
- every `C8 unclassified` body with its exact diff and one hypothesis.

## Acceptance criteria

1. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` from `/home/user/agent-port-gauge`: every setup, judge, first-request, call-count, and control test passes, and every per-copy failure lists only labeled bodies.
2. `tmp/probes/ledger-replay-report.json` exists and parses.
3. `git -C /home/user/agent-port-gauge diff --stat -- src tests` is empty.
