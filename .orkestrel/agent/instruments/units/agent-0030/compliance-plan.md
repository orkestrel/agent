# Reconciled plan: 0.0.30 compliance and trims (2026-10-10)

This file is the plan of record. Its base is the planner's plan (`compliance-plan-planner.md`): its units, its integration order, its name choices, and its finding assignments hold except where this file rules otherwise. The analyst's plan (`compliance-plan-analyst.md`) contributes the items under "Taken from the analyst". Where the two plans differ and this file is silent, the planner's plan holds.

## Name rulings

| Surface | Ruling | Reason |
| --- | --- | --- |
| `RunOutcome` | `AgentRunResult` | Matches `AgentRunOptions` (`agents/types.ts:417`) and avoids a fleet name collision. |
| `AgentProvider.body`, `AgentJudge.body` | `encode` | Pairs with `read`, which decodes a record. |
| `readHeaders` | `buildProviderHeaders` | Qualified, because the fleet surface rule refuses a second owner of a generic name. |
| `handleAgentQueueJob`, `handleAgentRunnerJob` | keep | The audit refuted the rename; the `@example` half of the critic's item stays. |
| `LedgerGauge.fixed`, `Gauge` `fixed` | `overhead` | Both lanes agree. |
| `Gauge.left` | `remainder` | The sibling gauge queries are nouns (`rate`, `reserve`, `room`). |
| `LedgerQuestion` and `LedgerThreshold` `amends`, `supersedes` | keep | One concept, one term: the key is the persisted judgment-id head (`Classifier.ts:271-274`, `:191-202`). |
| `LedgerClassification.quiet` | keep | `quiet` is the concept's one term (`Classifier.quiet`, `QUIET_CATEGORIES`). |
| `LedgerClassification.amended`, `superseded` | `amendments`, `supersessions` | Both lanes agree. |
| `LedgerProjection.loose` | `orphans` | `remainder` is taken by the gauge. |
| `LedgerProjection.stale` | keep | `LedgerStaleSentence` carries the term. |
| `LedgerProjectionInput.exclude` | `exclusions` | Both lanes agree. |
| `LedgerNote.closed` | `closure` | Both lanes agree; the string value stays. |
| `resolveLedgerCall` | `findLedgerCall` | Both lanes agree. |
| `Conversation.rehydrate` on a miss | returns `undefined` | Both lanes agree. |

Every other private or test name follows the planner's Design section.

## Other rulings

- R7 snapshot: read a 0.0.29 snapshot without its `summary`; never refuse it (both lanes agree). U5 adds the proof both plans describe.
- Emptied R5 kind files are deleted with their mirrored tests and barrel rows (`AGENTS.md:31` scopes "structural" to `tsconfig.json`, `vite.config.ts`, and `types.ts`).
- `tests/distribution.test.ts`: the campaign's In list governs; apply only its confirmed repairs.
- Copy-on-write for internal state (`.claude/rules/typescript.md:40`) applies to `Conversation.ts:245` and `:258`, `Gauge.ts:128`, and the Channel `#buffer` (`Channel.ts:35`, `:55`). U3 owns Channel, U5 Conversation, U6 Gauge.
- Open referrals get owners: `Instruction.ts:12-13`, `:29-30` false comment (U4); the estimator claim at `agents/helpers.ts:127-134` and the corrupted glyphs in `tests/src/core/agents/factories.test.ts` (U3); the import cycle at `AgentProvider.ts:18` (U7); the checks at `guides/agent.md:2604` and `:1879` (G). Each unit verifies the referral before repairing it.
- Routing: the planner's `astra` units (U4, U5, U6, IG) run on `opus`, because the Codex transport refuses a second writer in the checkout and phase 2 runs six writers at once. U8 runs on `builder`. Recorded in `compliance-campaign.md` § Routing ledger.

## Taken from the analyst

- R7 has consumers the planner missed: `/home/user/ollama/tests/service/compaction.test.ts:118` reads `conversation.summary`, and `/home/user/ollama/tests/src/core/integration.test.ts:458`, `:530` pass `reference({ summary: false })`. The ollama patch X2 covers them beside `body` to `encode`.
- `RunOutcome` has a stale reference at `/home/user/ollama/tests/service/tools.test.ts:239`; X2 covers it.
- The replay oracle permits named normalizations (`tmp/probes/ledger-replay.test.ts:53`). Beside the 108 of 108 gate, V compares the requests the c04eea4 build and the final build generate for the 8 recorded runs, raw, and reports every difference.
- The rejected-finding table at the top of the analyst's plan (stock-selection prose, rollup comments, `Agent.test.ts:102`, `factories.test.ts:151,172`, test-local exported helpers, `AgentRegistry.ts:103`, `validators.ts:65,84`) agrees with the planner's rejections and is binding.

## Patch protocol

Each phase-2 unit writes every shared-file patch as a unified diff to `tmp/units/patches/<unit>/<file-with-slashes-as-dashes>.diff`, applicable with `git apply` from the checkout root, and lists the files in its report. B, S, IG, and G apply them in the planner's integration order. A patch that no longer applies after an earlier patch is returned to its unit, never hand-merged by the integrator.

## Consumer patches

- X1 desk: `fixed` to `overhead` (planner's list), committed to the desk's local branch with the re-pin.
- X2 ollama: `body` to `encode`, the R7 test sites, and the `RunOutcome` reference, written as a patch file under `tmp/units/patches/ollama/`; this session holds no push access to ollama, and the session that holds its publish authority applies it.
- X3 harness: `bench5/seams.ts`, `bench5/Driver.ts` (`fixed`), the replay probe copies, and bench4's gauge readers, committed on the scaffold aggregator branch after the trimmed build is vendored.
