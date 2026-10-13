# Unit p2-probe-held-exact — Match a held second ask by its exact prompt

## Role and engine

`builder` on Claude Sonnet 5.5, reached as a workflow subagent. This brief fixes every contract. Executor: NATIVE_SUBAGENT.

## Objective

Close the acceptance path the review in `/home/user/agent-port/tmp/units/p1-review.md` found in N9, and the two label absorptions it found, so the replay probe admits no judge body it cannot rebuild and labels no line it cannot place.

## Context

- **Probe.** `tmp/probes/ledger-replay.test.ts`, `ledger-replay-compare.ts`, and `ledger-replay-support.ts`, in this worktree, `/home/user/agent-port-gauge`, which sits at the port's commit `7f346b5`.
- **Review.** `/home/user/agent-port/tmp/units/p1-review.md`: § Paths that pass without a recorded twin (the criteria matcher), contract 5 (the C1 label), and § Findings outside the claims (the C5 label, `widen`, and the two judge assertions).
- **Judge template.** `/home/user/ollama/dist/src/core/index.js` near lines 80 to 95 renders the prompt.
- **Law.** `AGENTS.md`, which resolves to `../scaffold/AGENTS.md`, and `../scaffold/.claude/rules/tests.md`.
- **Standing conditions.** Send no request to `127.0.0.1:11434`. Never run `npm run build` or `npm run clean`. Write nothing under `/home/user/agent` or `/home/user/agent-port`.

## Scope

- **Owned.** The three probe files and `tmp/probes/ledger-replay-report.json`.
- **Off-limits.** Every other file, `src/` and `tests/` included.

## Execution

Perform the assignment yourself and spawn nothing. Never delete a file you did not create.

## Contracts to land

1. **N9 exact prompt.** A held second ask matches only when its whole body equals a body rebuilt from the held row: the recorded calibration judge body's members, and the prompt rendered by the ollama judge template from the row's question, criteria with their labels, and state. Add a control in which the criteria labels are swapped, which gets 500.
2. **C1 label.** Per message, sum the N of the recorded cut lines, group the port-only seed lines into items (a seed line plus its amenders), and label them C1 only when the item count is at most N; otherwise label each such line C8 with its exact text.
3. **C5 label.** Label a recorded-only bare or nested line C5 only when its text is a line of the recorded note that the message carries; otherwise C8.
4. **Judge assertions.** Assert `heldRecorded === 0` directly, and delete the assertion that cannot fail at `ledger-replay.test.ts` near line 270.

## Output

Return the per-copy counts by cause, each gate's exit code, and every C8 body with its exact diff.

## Acceptance criteria

1. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` from `/home/user/agent-port-gauge`: every setup, judge, held, first-request, call-count, and control test passes. Per-copy body tests fail only on the recall differences a separate port unit is closing.
2. `npx oxlint --config .oxlintrc.json --deny-warnings` on the three probe files exits 0.
3. `git -C /home/user/agent-port-gauge diff --stat -- src tests` is empty.
