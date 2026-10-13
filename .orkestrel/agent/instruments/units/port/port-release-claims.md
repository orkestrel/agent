# Falsify round port-release — the @orkestrel/agent changes since the last round

## Subject

The branch `port` in `/home/user/agent-port`, tip `7f346b5`, over `f28d222`. The changes:

| Commits | What they claim to close |
| --- | --- |
| `2418a2b`, `f699ddc` | Selection and compaction keep exchanges and call groups whole; no fold after a cancel; a failed judge call leaves its subject undecided; the rollup is opt-in. |
| `99cdca6` | A selection's briefing travels in `Selection.briefing` and reaches the model as the last system part. |
| `3698798` to `095f345`, `01710ae` | The ledger module: types, records projection, gauge, classifier, `Ledger`, guide. |
| `d738cfe` to `1117e23` | Recorded thinking, the replay policy, the ledger's thinking budget, the answer pass with thinking off. |
| `4ceab14`, `7f346b5` | Recall, the answer note, and the seed tail list what the measured ledger listed; the guide says so. |

Prior rounds on this chain: the integrated falsify round that `f28d222` closed; the thinking review that `f1f4c0a` applied; the attack round whose package findings `1117e23` closed; the replay rulings in `tmp/units/records-port-plan.md` § Replay fidelity rulings. Assume this chain has one more defect than those rounds found.

## What the round decides

Whether `@orkestrel/agent` at `7f346b5` is bumped, published, and consumed by the desk.

## Already established

The Orchestrator verified each of the following itself on 2026-10-09 at `7f346b5`:

- `npx tsc --noEmit`, `check:src:core`, `lint:check`, and `format:check` exit 0; `test:src:core` passes 1,231 of 1,231, `test:guides` 106 of 106, `test:policy` 119 of 120 with 1 skipped, `test:config` 227 of 228 with 1 skipped, `test:setup` 70 of 70, and `test:distribution` 9 of 9.
- The offline replay of the 8 measured `a5-records` runs through `createLedger` (`/home/user/agent-port-gauge/tmp/probes/ledger-replay.test.ts`) passes 108 of 108 with 0 unlisted agent bodies under the listed normalizations N1 to N10, F4a, and R2a on the briefing; every judge body has a recorded twin or is a held second ask under N9.

Do not re-derive these. They say nothing about inputs the replay never sent.

## Review evidence

- The diff: `tmp/units/falsify-port.diff` (`git diff f28d222 7f346b5 -- src guides tests`).
- `git status --porcelain` at `7f346b5`: empty.
- The rulings: `tmp/units/records-port-plan.md`.

## Claims

Every lane rules on every claim. The objective lane leads on 1 to 9; the subjective lane leads on 10 to 12.

1. **Abort.** When the caller aborts `Ledger.respond` at any point (during filing, the first pass, a lookup, or `recall`), the ledger runs no answer pass, settles as `LedgerResult` documents, keeps every completed judgment, and accepts the next `respond` with no state left from the aborted request.
2. **Concurrency.** A second `respond` or `calibrate` on the same ledger while one is active rejects with `AgentError` code `CONCURRENCY` and changes no state of the active request.
3. **Answer pass.** Every answer pass advertises no tools and sends `think: false`, whatever the `think` option, the provider's default, and the first pass's outcome, and it runs only when the first pass ended partial or without final text and the caller did not abort.
4. **Budget invariant.** With replay `'none'`, a ledger at `capacity` W + P and `predict` P sends a first-pass request with the same messages and briefing as one at W with `predict` 0, for every conversation the plan can serve; and no request the ledger sends has an estimated prompt above `capacity` less `predict`.
5. **Recall.** `recall` lists exactly the messages the measured rules admit (listable, on topic, worded), with stored content, amenders after their source, each source once, cut by whole items with the exact notice; a second call with the same topic in one request is a repeat that aborts the pass; after the limit or when the room falls under twice the reply reserve it returns the `closed` note.
6. **Briefing.** No request's system message carries a stale sentence of a decided correction, and no model-facing text the ledger writes (briefing, recall, answer note, tool descriptions, stubs) carries a message or result handle.
7. **Judge failures.** A deterministic judge failure holds its item for the ledger's life with no second ask; a transient failure is asked again on a later request; a judge abort settles the filing and keeps completed judgments; a selection whose judge calls all fail faults, and one with some failures leaves those subjects undecided.
8. **Thinking replay.** Under `'none'` no provider request carries recorded thinking; under `'turn'` a request carries thinking only after its last user message; recorded thinking stays on `Message.thinking` and never reaches a summary, a judge state, or a calibration body.
9. **Selection and compaction.** No selection or compaction result splits a call from its result or a request from its exchange, and no fold runs after a run's abort.
10. **Guide.** Every behavior claim in `guides/agent.md` § Serving a conversation through a ledger, § Recording and replaying thinking, and the selection and compaction sections the diff touched is true of the code, and each has an executed assertion that fails when it goes false; no claim was replaced by an unfalsifiable one.
11. **API.** Every export the diff adds is needed by a named consumer (the desk, the guide, or a test of observable behavior), is named by `../scaffold/.claude/rules/names.md`, and has TSDoc in the shape `../scaffold/.claude/rules/typescript.md` requires; no option has a default that hides a measured setting the caller must choose (thresholds have no default).
12. **Coherence.** The package is coherent as a whole. Would you ship it?

## Unknowns

- How the ledger behaves on a conversation unlike the Larkspur seed (no lookups, no seed, interleaved requests). Rule what the code does; mark a claim `UNRESOLVED` with the probe that would settle it.
- The live behavior U9 measures. Do not rule on scores.

## Threshold

A finding is worth more than a clean pass: the alternative is the desk or another consumer finding it after publication. Do not hedge toward an imagined consensus. `CONFIRMED` requires naming the attack you tried that failed. A claim you cannot decide is `UNRESOLVED`, with what would settle it.
