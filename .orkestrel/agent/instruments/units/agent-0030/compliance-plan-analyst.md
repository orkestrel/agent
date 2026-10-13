# Rejected findings

This is a read-only implementation plan against `c04eea4cfff4e509115d61c9335f63ac7b6a659d`. No files were changed, no campaign gates were run, and no request was sent to `127.0.0.1:11434`. The requested scope and acceptance conditions come from [the campaign](/home/user/agent-release/tmp/units/compliance-campaign.md:5) and [the brief](/home/user/agent-release/tmp/units/compliance-design-brief.md:20).

Keep the audit’s `refuted` population excluded. A separately confirmed finding at the same location remains eligible; a referral from another lane doesn’t create another repair.

The following dispositions replace conflicting or superseded prescriptions.

| Finding | Expected, found, and resolution |
|---|---|
| `src/core/contexts/factories.ts:85` | Expected: extract duplicated judgment lookup. Found: both consumers belong to R5’s removed stock-selection implementation. Close through deletion; don’t introduce `findJudgment`. See `contexts/factories.ts:54` and `contexts/helpers.ts:91`. |
| `src/core/contexts/factories.ts:44`, `src/core/contexts/constants.ts:3`, `tests/setup.ts:194` | Their prose describes the removed stock-selection capability. Remove the relevant declaration or fixture instead of polishing it. Preserve any fixture with a surviving consumer. |
| `src/core/conversations/Conversation.ts:194` | Reject the prescription to retain the sentence explaining why rollup isn’t injected. R7 removes the rollup. Retain only the explanation of section-recap framing; see `Conversation.ts:195`. |
| `src/core/conversations/ConversationManager.ts:131` | Reject the replacement comment’s reference to forwarding `rollup`. Forward and describe only retained configuration. |
| `tests/setup.test.ts:398` | Reject the prescribed `snapshot.summary` assertion and the expected rollup digest. Retain independent section-summary and message assertions, and prove the absence of a rollup call. R7 removes the referenced behavior; see `Conversation.ts:270` and `snapshot():327`. |
| `tests/src/core/agents/Agent.test.ts:102` | Reject relocation of the handwritten `RecordingBudgetInterface` and `createRecordingBudget`. Their implementation reproduces budget state and cancellation (`Agent.test.ts:118`). Use the real budget with `createRecorder`, as the competing finding at `:118` prescribes. Move the unrelated fixture constants. |
| `tests/src/core/agents/factories.test.ts:151,172` | Reject a second `createLoopTools` export. Inline the tool registry containing `createLoopTool()`, following C2. See [the ruling](/home/user/agent-release/tmp/units/compliance-rulings.md:8). |
| Test-helper prescriptions allowing test-local exported helpers | Reject that placement. Reusable helpers belong in `tests/setup.ts`; trivial callbacks can remain at permitted argument positions. This affects `Channel.test.ts:149,167`, `Agent.test.ts:1328,4101`, `integration.test.ts:371`, and `Conversation.test.ts:17`. See scaffold `tests.md:187` and `architecture.md:175`. |
| `src/core/agents/AgentRegistry.ts:103` | Don’t rename `#budget` and subsequently delete it. Fold its single expression into the options builder, as the finding at `:136` prescribes. Rename only surviving methods. |
| `src/core/conversations/validators.ts:65,84` | Merge into one total, dense-array validation repair. The installed `objectOf` and `arrayOf` already contain exceptions; an additional outer `attempt` is unnecessary. See installed contract `index.js:6311,6470`. |
| `/home/user/agent-release:0` | This is a missing-review-input observation, not a code defect. The checkout was clean when inspected and HEAD matched the campaign baseline. Supply the eventual integrated diff to the campaign reviewers. |
| `package.json:89` | Defer the scaffold range update exactly as ruled. Don’t install an unpublished version or edit scaffold-owned copies. See [the deferral](/home/user/agent-release/tmp/units/compliance-rulings.md:18). |

C1–C4 prevail over the audit’s alternative names and wording. In particular, use `splitTurn`, `createAddTool`, `createLoopTool`, the `exerciseConversationStore…` family, and `4 characters per token`; see [the conflict rulings](/home/user/agent-release/tmp/units/compliance-rulings.md:7).

The following deviations need explicit reconciliation in the parent plan.

- **R5 names a nonexistent class.** Expected: preserve the “`Selection` class.” Found: `Selection` is an interface at `src/core/contexts/types.ts:239`. Resolution: preserve that interface, `SelectionHandler`, and the agent/context/scope selection seams; introduce no class.
- **R7’s consumer census is incomplete.** Expected: no consumer reads the removed rollup surface. Found: `/home/user/ollama/tests/service/compaction.test.ts:118` reads `conversation.summary`; `/home/user/ollama/tests/src/core/integration.test.ts:458,530` supplies `reference({ summary: false })`. Resolution: include the Ollama patch named below before accepting R7.
- **Distribution ownership is contradictory.** Expected: `tests/distribution.test.ts` is explicitly included, but presence-owned files are also excluded by `compliance-campaign.md:12,13`. Found: scaffold marks this file presence-owned and explicitly preserves authored improvements (`/home/user/scaffold/src/core/compilers.ts:2048,2070`). Proposed resolution: the specific inclusion governs this authored proof; apply only its confirmed repairs. Don’t resurrect the refuted wholesale helper-layout finding. Record that ruling before dispatching the distribution unit.
- **Replay success isn’t raw byte equality.** Expected: the campaign describes byte-identical requests. Found: `tmp/probes/ledger-replay.test.ts:53` permits named normalizations and residual differences. Resolution: preserve that existing oracle unchanged and require an additional before/after comparison against the c04eea4 port’s generated requests. Don’t report normalized equality as raw equality.

# Public changes and blast radius

Land the following changes in 0.0.30, with their consumer patches in the same campaign. Leave no aliases. The published baseline is the registry tarball identified by [the trim ruling](/home/user/agent-release/tmp/units/trim-rulings.md:5); the desk’s installed version string isn’t evidence of that published surface.

| Surface | Decision | Consumer patch |
|---|---|---|
| `RunOutcome` | Rename to `RunResult`. | Package source, tests, guide; correct the stale reference in `/home/user/ollama/tests/service/tools.test.ts:239`. No direct use was found in the named production-consumer populations. Declaration: `agents/types.ts:110`. |
| `AgentProvider.body`, `AgentJudge.body`, corresponding interfaces | Rename to `project`. Preserve the wire body exactly. | Update `/home/user/ollama/src/core/OllamaProvider.ts:74`, `OllamaJudge.ts:113`, their mirrored tests, `tests/guides.test.ts:344,516,670`, and `guides/ollama.md:281,338`. Package subclasses and fixtures also change. Base dispatch occurs at `AgentProvider.ts:271` and `AgentJudge.ts:127`. |
| `readHeaders` | Rename to `buildProviderHeaders`. | Package callers, tests, guide. Use a qualified name and verify fleet-name ownership before landing. Existing helper: `providers/helpers.ts:316`. |
| `handleAgentQueueJob`, `handleAgentRunnerJob` | Rename to `settleQueueJob`, `spawnRunnerJob`. | Package factories, helper tests, guide. Preserve parent settlement and non-awaited child spawning; see `agents/helpers.ts:208,231`. |
| `Conversation.rehydrate` | Return `undefined` for an unknown section instead of `[]`; keep the existing event behavior. | Package declaration, examples, and tests. No direct caller was found in the named production consumers. See `Conversation.ts:278` and `conversations/types.ts:430`. |
| `LedgerGauge.fixed`, `Gauge.fixed`, inherited gauge options | Rename to `overhead`. | Desk parser, display, and fixtures; bench5 driver, tests, and gauge fixtures; replay adapters. See `ledgers/types.ts:220`, desk `app/core/parsers.ts:638`, `app/vue/Lane.vue:173`, and bench5 `Driver.ts:891`. |
| `Gauge.left` | Rename to `remain`. | Package ledger, tests, and guide. This remains a method taking calls, so use a verb rather than the audit’s noun suggestion `remainder`; see `Gauge.ts:86` and `Ledger.ts:982`. |
| `LedgerQuestion.amends/supersedes`, `LedgerThreshold.amends/supersedes` | Rename to `amendment/supersession`. | Desk `app/server/constants.ts:127`; bench4 constants, question adapter, and threshold comparison; bench5 constants, corpus adapter, seams, and tests. See `ledgers/types.ts:36,53`. |
| Judgment-id strings `'amends'`, `'supersedes'` | **Keep unchanged.** Explicitly map those serialized discriminants to the renamed option properties. | Preserve corpus keys, recorded requests, cache keys, and stored judgments. Their construction and reuse are at `Classifier.ts:194,271`; bench5 reads corpus literals at `helpers.ts:344`. |
| `LedgerClassification.quiet/amended/superseded` | Rename to `omissions/amendments/supersessions`. | Package callers and fixtures; bench5 `tests/Mirror.test.ts:264,275`, `tests/aggregates.test.ts:750`; replay adapters. Declaration: `ledgers/types.ts:365`. Keep the distinct `Classifier.quiet(id)` predicate. |
| `LedgerProjection.loose/stale` | Rename to `remainder/staleness`. | Package projection/recall callers and tests; bench5 `aggregates/Aggregator.ts:343`, `aggregates/helpers.ts:266`; replay adapters. Declaration: `ledgers/types.ts:424`. |
| `LedgerProjectionInput.exclude` | Rename to `exclusions`. | Every package, harness, and replay projection-input constructor. Declaration: `ledgers/types.ts:441`. |
| `LedgerNote.closed` | Rename to `closure`; preserve its string value. | Package references; bench5 `seams.ts:38` and `Driver.ts:915`; replay references. Declaration: `ledgers/types.ts:104`. |
| `resolveLedgerCall` | Rename to `findLedgerCall`. | Package ledger/tests/guide; bench5 required-export census at `seams.ts:61` and any actual imports. Definition: `ledgers/helpers.ts:33`. |

The trims have the following exact boundaries.

- **R1–R4:** remove `LedgerOptions.notes`, `LedgerRecallOptions.description`, `budget/signal/error` from `LedgerAgentOptions`, and `Gauge.measure`. Use `LEDGER_NOTES` directly and preserve all note text. See `ledgers/types.ts:119,231,274`, `Ledger.ts:144,188`, and `Gauge.ts:67`.
- **R5:** remove `createSelection`, `SelectionOptions`, `ScreenHandler`, `Criterion`, `Applicability`, `NEEDED_QUESTION`, `NEEDED_CRITERION`, `buildNeededQuestion`, `inferApplicability`, `buildConditionKey`, `parseConditionKey`, `filterSelectionMessages`, `renderSelectionState`, `SelectionError`, and `isSelectionError`. Remove only their exclusive fixture/test/documentation closure. The fixture closure begins at `tests/setup.ts:194`; `createStockSelectionFixture` is at `:235`. Keep `Selection`, `SelectionHandler`, `select`, fault/usage handling, scope overrides, and ledger selection.
- **R6:** remove `ScopeInput.description`, `ScopeInterface.description`, and the class’s storage/copy of it. Its only source reads are construction and child copying at `contexts/scopes/Scope.ts:49,63`; the bounded consumer search found no use.
- **R7:** remove conversation `rollup` options, the conversation-level `summary` getter/event/snapshot field, `#regenerate`, and the `Summary:` reference line. Also remove `ConversationReferenceOptions.summary`, because it controls only that line (`Conversation.ts:307`). Preserve `Section.summary`, section merging, compaction, recap messages, reference labels, and reference excerpts.

These declarations move without a root-package rename:

- `Reading` moves from root types to provider types (`src/core/types.ts:179`).
- `copyJSON` moves to root `cloners.ts` (`src/core/helpers.ts:223`).
- `isMessage` moves to conversation validators (`src/core/validators.ts:34`).
- `collectExchanges`, `collectToolGroups`, and `matchesJudgment` move to root helpers; `Judgment` and `JudgmentInput` move to root types. Conversations and ledgers both consume them (`conversations/helpers.ts:22,104,192`; `ledgers/Classifier.ts:1,13`; `Ledger.ts:32`).

Export and document extracted reusable logic through its owning barrel. Preserve `copyJSON` semantics: the installed `cloneJSONValue` freezes and rejects inputs that `copyJSON` serializes, so it isn’t a replacement (`helpers.ts:208`; installed contract declarations `index.d.ts:519,563`).

Retain the ruled capabilities and behavior: optional `think`, lookup metadata, defensive/error paths, narrowing fallbacks, `replay`, `judgments`, `call`, `thinking`, and `InstructionManager.close`; see [the keeps](/home/user/agent-release/tmp/units/trim-rulings.md:24).

# R7 snapshot ruling

**Read a 0.0.29 snapshot without consuming its top-level `summary`.**

Remove `summary` from the current `ConversationSnapshot` declaration and from the fields inspected by `isConversationSnapshot`. Don’t add an old-version branch, an alias, or a migration discriminator. The structural validator already admits unrelated members; its installed `objectOf` implementation inspects declared fields only (`node_modules/@orkestrel/contract/dist/src/core/index.js:6470`).

Hydration must never read `snapshot.summary`; a subsequent `snapshot()` must omit it. Preserve `id`, section summaries and originals, live messages, and optional judgments. The source locations are `Conversation.ts:127`, `Conversation.ts:325`, and `conversations/validators.ts:124`.

This distinction is deliberate: the guard doesn’t mutate or sanitize the original record, and a raw store read can still carry an undeclared extra property. The conversation ignores it and produces the current snapshot shape. `DatabaseConversationStore.get` already returns the structurally accepted row (`DatabaseConversationStore.ts:81`).

Acceptance must prove:

- A real 0.0.29-shaped fixture containing a string `summary` validates, hydrates, preserves retained content, and resnapshots without that field.
- An unknown top-level `summary` value or throwing `summary` getter is never inspected.
- Malformed retained fields, sparse message arrays, and throwing getters on inspected fields return `false`.
- Compaction makes only retained section/merge summarizer calls and emits no summary event.
- A merge failure preserves the newly compacted section and remaining originals, without the removed regeneration call (`Conversation.ts:249`).
- Both store implementations and manager open/save paths still round-trip the retained contract.

A read-only check of the installed combinators confirmed unknown-member acceptance, non-reading of an unknown throwing getter, rejection of sparse arrays, and containment of inspected throwing getters. This is supporting dependency evidence, not a campaign acceptance result.

# Units

The following ownership partition is exhaustive for the brief’s package scope. Each module unit owns all its non-barrel source files and mirrored tests, including files absent from the initial finding list. This gives the supplementary audit an owner without inventing repairs.

`F` identifiers below are the audit’s `confirmed` array entries in their existing order. Canonical finding keys are `file:line`; duplicate reports at a key become one obligation containing all distinct applicable requirements. Secondary occurrences named inside an entry follow their file owner. Cross-file producers return exact patches for shared files; only the corresponding integration unit applies them.

For every source unit, acceptance proceeds through the finding-specific proof, each touched test file, `npm run check:src:core`, then the `src:core` project after its dependencies integrate. The file command is:

```sh
npx vitest run --config vite.config.ts --project src:core PATH
```

A shared-file dependency may delay acceptance; it doesn’t authorize another writer to edit that file. These boundaries follow [the shared-file ruling](/home/user/agent-release/tmp/units/compliance-rulings.md:22).

## Foundation and conversations — F

**Role:** `astra`.

**Owned files:** root `src/core/*.ts` except `index.ts`; `src/core/conversations/**` except its `index.ts`; root `tests/src/core/*.test.ts` except `integration.test.ts`; every conversation test. This includes new `src/core/cloners.ts`, its mirrored test, and `tests/src/core/conversations/factories.test.ts`.

**Closes:** R7; declaration moves; snapshot ruling; conversation validation; factory coverage; root and conversation findings. The canonical anchors are:

| File, relative to package root | Lines |
|---|---|
| `src/core/types.ts` | 90, 179 |
| `src/core/helpers.ts` | 19, 29, 37, 120, 194, 223 |
| `src/core/validators.ts` | 34 |
| `src/core/conversations/constants.ts` | 23, 25 |
| `src/core/conversations/helpers.ts` | 22 |
| `src/core/conversations/JudgmentManager.ts` | 107, 135 |
| `src/core/conversations/Conversation.ts` | 25, 101, 106, 122, 194, 236, 243, 283, 321, 343 |
| `src/core/conversations/validators.ts` | 64, 65, 84 |
| `src/core/conversations/ConversationManager.ts` | 15, 131, 154 |
| `src/core/conversations/types.ts` | 44, 75, 131, 213, 354, 376, 396, 476, 697 |
| `src/core/conversations/factories.ts` | 75, 81, 173 |
| `src/core/conversations/stores/MemoryConversationStore.ts` | 5, 63 |
| `src/core/conversations/errors.ts` | 3 |
| `tests/src/core/helpers.test.ts` | 88, 240 |
| `tests/src/core/conversations/Conversation.test.ts` | 17, 500, 554, 967, 968, 1104 |
| `tests/src/core/conversations/validators.test.ts` | 66 |
| `tests/src/core/conversations/stores/DatabaseConversationStore.test.ts` | 19, 35 |
| `tests/src/core/conversations/stores/MemoryConversationStore.test.ts` | 105 |

**Depends on:** P receiving `Reading`; S/T for fixture migration; barrel integrations; G for changed guide proofs. Send exact move/import requirements to P and L before their implementation.

**Acceptance:** cloner ownership/serialization tests; total `isSection` negative controls; exchange/tool-group preservation; judgment reuse after moves; R7 cases listed above; unknown-section `undefined`; direct behavior tests for every retained conversation factory. Preserve the existing sections-cap comparison while extracting it: `NaN` acceptance is existing behavior, not an authorized validation tightening (`Conversation.ts:122,214`).

## Agents — A

**Role:** `builder`.

**Owned files:** `src/core/agents/**` except `index.ts`, and every mirrored agent test.

**Closes:** agent naming, documentation, extraction, test-helper, recorder, and wait findings; C2/C4. The canonical anchors are:

| File | Lines |
|---|---|
| `src/core/agents/AgentRegistry.ts` | 23, 103, 128, 136 |
| `src/core/agents/factories.ts` | 37, 137, 212, 226, 235, 252 |
| `src/core/agents/Agent.ts` | 58, 68, 333, 354, 382, 387, 470, 623, 862 |
| `src/core/agents/types.ts` | 41, 110, 147, 245, 247, 281, 287, 289, 502, 507, 654 |
| `src/core/agents/Channel.ts` | 72 |
| `src/core/agents/errors.ts` | 75, 89 |
| `src/core/agents/Authority.ts` | 22 |
| `src/core/agents/helpers.ts` | 92 |
| `tests/src/core/agents/Channel.test.ts` | 84, 109, 149, 167 |
| `tests/src/core/agents/factories.test.ts` | 40, 43, 62, 84, 151, 157, 172, 184, 277, 360, 362, 474, 598, 670, 674, 755, 846 |
| `tests/src/core/agents/helpers.test.ts` | 15, 29, 282, 357 |
| `tests/src/core/agents/Agent.test.ts` | 2, 68, 102, 118, 1328, 1542, 1562, 1707, 1792, 1932, 1990, 2588, 3168, 3642, 3670, 3697, 3777, 3780, 3844, 3858, 4101, 4180, 4360, 4376, 4393, 4450, 4570 |
| `tests/src/core/agents/Authority.test.ts` | 2, 14 |
| `tests/src/core/agents/AgentRegistry.test.ts` | 2, 23 |

**Depends on:** F/C contracts; S/T integration; agent barrel.

**Acceptance:** prove extracted registry lookup hit/miss and shared substrate-option omission; preserve queue/runner partial-result behavior; use a real budget plus recorder; prove FIFO drain and late rejection; replace store polling with `waitForCondition`; prove child spawning completes at concurrency 1. Apply emitter option forwarding at `Agent.ts:145`. Declare `AgentErrorCode` before using it (`agents/errors.ts:89`).

## Contexts and selection trim — C

**Role:** `builder`.

**Owned files:** `src/core/contexts/**` except `index.ts`, and every mirrored context test.

**Closes:** R5/R6 and surviving context findings. The canonical anchors are:

| File | Lines |
|---|---|
| `src/core/contexts/helpers.ts` | 191, 211, 236, 240 |
| `src/core/contexts/AgentContext.ts` | 148, 176, 198, 219 |
| `src/core/contexts/factories.ts` | 44, 85 |
| `src/core/contexts/instructions/InstructionManager.ts` | 61 |
| `src/core/contexts/types.ts` | 27, 144, 163, 207, 516 |
| `src/core/contexts/constants.ts` | 3 |
| `tests/src/core/contexts/helpers.test.ts` | 315 |
| `tests/src/core/contexts/AgentContext.test.ts` | 61, 535, 926 |
| `tests/src/core/contexts/scopes/Scope.test.ts` | 117 |
| `tests/src/core/contexts/factories.test.ts` | 2, 43 |
| `tests/src/core/contexts/instructions/InstructionManager.test.ts` | 15 |
| `tests/src/core/contexts/scopes/ScopeManager.test.ts` | 9 |

**Depends on:** F’s root helper moves; S/T removing exclusive fixtures; context barrel.

**Acceptance:** retain real tests for default selection, scope override, selection usage/fault handling, changed-view handling, tool authorization, image attachment, and context assembly. Remove stock-handler-only tests, including the parser proof if its subject is removed. Prove scope narrowing still preserves `select` and tightens allow-lists (`Scope.ts:57`). Preserve structural files required by the contract.

## Ledger compliance and trim — L

**Role:** `astra`.

**Owned files:** `src/core/ledgers/**` except `index.ts`, and every mirrored ledger test, including new validator proofs.

**Closes:** R1–R4; ledger public renames; T1–T4 and NEW-1–NEW-3; ledger extraction, mutation, and line-ending findings. The canonical anchors are:

| File | Lines |
|---|---|
| `src/core/ledgers/Ledger.ts` | 115, 122, 189, 228, 277, 317, 400, 447, 607, 624, 642, 789, 993, 1003, 1076, 1096 |
| `src/core/ledgers/Classifier.ts` | 315 |
| `src/core/ledgers/Gauge.ts` | 63, 75, 86 |
| `src/core/ledgers/helpers.ts` | 143, 213, 375, 520 |
| `src/core/ledgers/types.ts` | 36, 104, 220, 366, 427, 441, 620 |
| `tests/src/core/ledgers/helpers.test.ts` | 147, 1035 |

**Depends on:** F moves; A/C retained agent/selection contracts; S/T fixtures; ledger barrel; H/DK consumer patches before acceptance.

**Acceptance:** preserve threshold boundaries, capacity bounds, zero/absent/nonfinite prompt-usage handling, provider-error propagation, replay omission semantics, tool metadata, classification reuse, projection order, amended traversal, recall closure, and exact rendered text.

Extract the common traversal only with tests distinguishing admission, traversal termination, cycles, shared descendants, and global recall deduplication (`Ledger.ts:789,1061`). Repair recall-key and digest splitting together (`Ledger.ts:1076,1096`). The recorded replay must remain 108/108 with its oracle unchanged.

Use copy-on-write for stored arrays (`Ledger.ts:228,926,943`; `Gauge.ts:128`). The same law applies to stored Map/Set state; each module owner must distinguish persistent fields from local construction accumulators, preserve iteration order, and prove reentrant behavior. Don’t create a separate speculative refactoring unit for that audit referral.

## Providers — P

**Role:** `astra`.

**Owned files:** `src/core/providers/**` except `index.ts`, and every mirrored provider test.

**Closes:** provider renames, `Reading` relocation, shared HTTP-error translation, reader-abort extraction, NEW-4, and provider findings. The canonical anchors are:

| File | Lines |
|---|---|
| `src/core/providers/AgentJudge.ts` | 100, 153 |
| `src/core/providers/helpers.ts` | 97, 201, 311, 316 |
| `src/core/providers/types.ts` | 41, 75, 103, 226, 263 |
| `src/core/providers/RelayStream.ts` | 88 |
| `src/core/providers/AgentProvider.ts` | 151 |
| `src/core/providers/RelayProvider.ts` | 139 |
| `src/core/providers/SystemOneJudge.ts` | 52, 91 |
| `src/core/providers/shapers.ts` | 20 |
| `src/core/providers/errors.ts` | 9, 83 |
| `tests/src/core/providers/ThinkSplitter.test.ts` | 5, 59 |

**Depends on:** F’s cloner and `Reading` moves; S updating subclasses/fixtures; provider barrel; O before acceptance.

**Acceptance:** readable/empty/null/erroring HTTP bodies; original cause and error taxonomy; abort during body read; pre-aborted reads; listener cleanup; reader release; streaming early exit; identical projected wire bodies. Don’t let extraction change cancellation precedence or leave a reader locked (`providers/helpers.ts:101,129,154,179`). Replace `RelayStream.test.ts:80`’s deadline race with an observable close wait.

## Core integration proof — X

**Role:** `builder`.

**Owned files:** `tests/src/core/integration.test.ts`.

**Closes:** canonical anchors `:249,250,371,420`, plus supplementary findings for this file.

**Depends on:** F/A/C/L/P and S.

**Acceptance:** run this file under `src:core`; compose real production entities; move reusable `splitWordDeltas` and scenario helpers to S. Preserve independent assertions after fixture consolidation.

## Shared setup integration — S

**Role:** `astra`.

**Owned files:** `tests/setup.ts`; `tests/setupLedger.ts` for deletion after migration.

**Closes:** C1/C3; the ledger setup fold; all exact helper patches from module/test units. Canonical anchors:

| File | Lines |
|---|---|
| `tests/setup.ts` | 194, 403, 446, 449, 461, 498, 563, 568, 791, 911, 1164, 1205, 1223, 1240, 1576, 2020 |
| `tests/setupLedger.ts` | 1, 106, 214 |

**Depends on:** closed helper signatures and final contracts from F/A/C/L/P/X/G. Apply their patches serially.

**Acceptance:** keep the module host-independent; import existing `@orkestrel/test` helpers; remove the R5-exclusive fixture closure; rename function types to `…Function`; freeze exported fixture collections; consolidate relay request creation; replace abort deferreds with `waitForAbort`; rename only the recorded-provider `cancelled` field to `aborted`.

Preserve ledger projection fixture behavior while exporting required helpers. `readShape`, `listPlacementKeys`, and `hasEffect` need focused proof in T (`tests/setupLedger.ts:214`). Verify no surviving import resolves to `setupLedger.js`.

## Shared setup-proof integration — T

**Role:** `builder`.

**Owned files:** `tests/setup.test.ts`; `tests/setupLedger.test.ts` for deletion after migration.

**Closes:** canonical anchors `setup.test.ts:48,70,398` and `setupLedger.test.ts:23,38`.

**Depends on:** S and F’s R7 contract.

**Acceptance:** run:

```sh
npx vitest run --config vite.config.ts --project setup tests/setup.test.ts
npm run test:setup
```

Move the ledger describe blocks without weakening assertions. Prove migrated helpers through declared fixtures or a disagreeing mechanism. Replace self-derived snapshot assertions with explicit section content and summary expectations; remove rollup expectations. Prove `buildLedgerLine`, `replaceLedgerRecord`, and the promoted projection helpers.

## Distribution proof — D

**Role:** `astra`.

**Owned files:** `tests/distribution.test.ts`, conditional on the ownership reconciliation stated earlier.

**Closes:** canonical anchors `:181,232,233,663,669,855`.

**Depends on:** ownership ruling and a completed build.

**Acceptance:** replace the duplicate record guard with the installed guard; spawn npm’s JavaScript entry through `process.execPath`; remove the shell; merge environment variables case-insensitively; use owned scratch cleanup without masking the original failure. Fail clearly if npm’s entry cannot be resolved (`distribution.test.ts:228,678`).

Run the scoped distribution project after its cheap classifier checks:

```sh
npx vitest run --config vite.config.ts --project distribution tests/distribution.test.ts
```

The release-mode run belongs to the final gate. A Linux result doesn’t establish Windows behavior.

## README and manifest disposition — R

**Role:** `opus`.

**Owned files:** `README.md`, `package.json`.

**Closes:** `README.md:24,55`; records the deferred disposition of `package.json:89`.

**Depends on:** final public surface.

**Acceptance:** match Node `>=22.12.0` to `package.json:100`; preserve README/guide tagline equality; correct links; include the ledger where the surface description needs it. Leave the scaffold range unchanged until the authorized release visit. Don’t alter gate scripts to accommodate failures.

## Root barrel integration — B-root

**Role:** `builder`. **Owned file:** `src/core/index.ts`.

**Closes:** F’s root moves and `cloners.ts` exposure. **Depends on:** F and the module barrels. **Acceptance:** star exports only, no compatibility re-exports, no name collisions; `npm run check:src:core`, followed by guide parity after V.

## Agent barrel integration — B-agents

**Role:** `builder`. **Owned file:** `src/core/agents/index.ts`.

**Closes:** A’s export patches. **Depends on:** A. **Acceptance:** expose retained intentional exports, including extracted helpers and types; scoped typecheck and final parity.

## Context barrel integration — B-contexts

**Role:** `builder`. **Owned file:** `src/core/contexts/index.ts`.

**Closes:** C’s R5 export removal patches. **Depends on:** C. **Acceptance:** no removed selection exports; retained selection seam resolves; scoped typecheck and final parity.

## Conversation barrel integration — B-conversations

**Role:** `builder`. **Owned file:** `src/core/conversations/index.ts`.

**Closes:** F’s conversation move/export patches. **Depends on:** F. **Acceptance:** moved symbols remain reachable through the root without compatibility rows; scoped typecheck and final parity.

## Ledger barrel integration — B-ledgers

**Role:** `builder`. **Owned file:** `src/core/ledgers/index.ts`.

**Closes:** L’s validator/helper export patches. **Depends on:** L. **Acceptance:** every intentional extracted export resolves and has direct proof; scoped typecheck and final parity.

## Provider barrel integration — B-providers

**Role:** `builder`. **Owned file:** `src/core/providers/index.ts`.

**Closes:** P’s move/export patches. **Depends on:** P. **Acceptance:** `Reading` and retained provider helpers resolve; scoped typecheck and final parity.

## Shared guide-proof integration — G

**Role:** `astra`.

**Owned file:** `tests/guides.test.ts`.

**Closes:** canonical anchors `:800,1252,1367`, all public API changes, removed capability examples, and supplementary findings for this file.

**Depends on:** source units, S/T, and barrels.

**Acceptance:** preserve `GuideCommand` entry/rewrite behavior and existing parity strength; move reusable helpers to S; replace duplicated thresholds with the shared fixture; remove only assertions whose capability is explicitly removed. Preserve executed proofs of retained selection, denial, strict-mode failure, compaction, and ledger behavior. Run `npm run test:guides` after V’s matching prose integrates.

## Guide-index integration — I

**Role:** `opus`.

**Owned file:** `guides/README.md`.

**Closes:** canonical anchors `:5,16,36`; all index patches.

**Depends on:** final module/export placement and R.

**Acceptance:** include ledgers in concept and directory maps; describe relocated root/provider/conversation declarations accurately; fix prose links and introductions; leave vendored mirrors untouched. Run guide parity with G/V.

## Agent-guide integration — V

**Role:** `opus`.

**Owned file:** `guides/agent.md`.

**Closes:** every source-doc patch and the following canonical anchors: `:11,13,72,127,195,265,313,750,798,801,952,1525,1709,1791,1837,1939,2097,2155`. Also closes NEW-2 and the trim’s test-index correction at `:2648`.

**Depends on:** every source, test, barrel, and other documentation integration. **Integrates last.**

**Acceptance:** Summary cells equal final source doc blocks; method tables match final interfaces; titled examples equal their source examples; flagship examples execute. Remove the stock-selection and rollup documentation; retain the selection seam and section-compaction explanation.

Correct denial-chunk and strict-mode claims using behavior, not substring checks (`agent.md:2097,313`). Remove the unsupported empirical attribution sentence at `:2155`. Link verifiable primary sources for the third-party claims at `:1837,1879`, or remove those claims. Run `npm run test:guides` bare.

## Desk consumer patch — DK

**Role:** `builder`.

**Owned files in `/home/user/desk`:** `app/server/constants.ts`, `app/core/parsers.ts`, `app/vue/Lane.vue`, `app/vue/helpers.ts`, `tests/app/core/parsers.test.ts`, `tests/app/server/setupThreads.ts`, `tests/app/fixtures.ts`, and `tests/app/vue/App.test.ts`.

**Closes:** ledger threshold and gauge renames at the concrete consumers. Preserve unrelated `fixed` booleans and section summaries; see `app/core/types.ts:83,171`.

**Depends on:** L and the packed result.

**Acceptance:** update parser return shape and fixtures atomically; prove malformed gauge refusal and rendered overhead value. Run the touched app projects, then packed-build `check`, `test:app`, and `test:journey:vue`. Script definitions are at `/home/user/desk/package.json:20,26,32`.

## Ollama consumer patch — O

**Role:** `astra`.

**Owned files in `/home/user/ollama`:** `src/core/OllamaProvider.ts`, `src/core/OllamaJudge.ts`, their mirrored tests, `tests/src/core/integration.test.ts`, `tests/service/compaction.test.ts`, `tests/service/tools.test.ts`, `tests/guides.test.ts`, and `guides/ollama.md`.

**Closes:** `body`→`project`, removed reference-summary options, rollup test expectations, and the `RunOutcome` comment.

**Depends on:** F/P and the packed result.

**Acceptance:** unchanged projected chat/judge requests; updated overrides compile; hermetic integration still proves references and recaps. Run touched `src:core` files, `npm run check`, and `npm test` against the packed result. Keep the live compaction proof in its service project; don’t weaken it into a passing skip. Scripts are at `/home/user/ollama/package.json:50,56,60`.

## Harness and replay adaptation — H

**Role:** `astra`.

**Owned files:** affected bench4 `Driver.mjs`, `constants.mjs`, and `helpers.mjs`; bench5 `seams.ts`, `constants.ts`, `types.ts`, `helpers.ts`, `Driver.ts`, `aggregates/Aggregator.ts`, `aggregates/helpers.ts`, and their affected tests; the local `tmp/probes/ledger-replay*.ts` adapter files.

**Closes:** every public ledger rename reaching the measured driver, aggregate harness, and replay instrument.

**Depends on:** L/P/O and a built artifact.

**Acceptance:** adapt API property access without rewriting measured wire files, corpus rows, expected text, judgment-id strings, or comparison tolerances. Specifically repair the bench4 threshold comparison, which otherwise compares renamed runtime keys with recorded old keys (`bench4/Driver.mjs:118`). Update the required seam names and question/note key checks (`bench5/seams.ts:37`).

Use a vendored build with a recorded digest. Run offline harness tests and the seams probe; require zero fetch calls. Preserve the replay’s 108/108 population and negative controls.

## Supplement and deduplication assignment

The supplementary audit file was absent at the final inspection. Its arrival is an acceptance prerequisite, not permission to infer a clean audit. Every `tests/src/core/**` file belongs to F/A/C/L/P/X by the partition above; root setup proofs belong to S/T, guide proofs to G, and distribution to D. Scaffold-owned `tests/config.test.ts`, `tests/policy.test.ts`, and `tests/setupPolicy.ts` remain excluded.

The `critic.missed` entries are assigned as follows; each expanded occurrence follows the named file owner.

| Missed entry | Canonical anchor and owner |
|---|---|
| Scaffold range | `package.json:89` → R, deferred |
| Job-helper names/examples | `agents/helpers.ts:208,231` → A |
| Pluralized source tokens | `contexts/types.ts:101,408`, `ScopeManager.ts:15`, `InstructionManager.ts:16`, `AgentContext.ts:69` → C; `agents/types.ts:37,264,421,511,640`, `agents/factories.ts:173,224`, `Agent.ts:110` → A |
| Possessive source tokens | Every enumerated conversation occurrence → F; context occurrence → C; agent occurrence → A; paired Summary cells → V integration |
| Stored-array mutation | `Conversation.ts:245,258` → F; `Gauge.ts:128` → L; `Channel.ts:35,55` → A |
| Abort deferred | `tests/setup.ts:1800` → S |
| Close deadline | `RelayStream.test.ts:80` → P |
| Calibration documentation | `ledgers/types.ts:323` → L |
| Nonexistent evidence references | `tests/setup.ts:934` → S; `ThinkSplitter.test.ts:9` → P; `Agent.test.ts:3650` → A |
| Technical numerals | `ledgers/helpers.ts:531,639` → L; `providers/helpers.ts:206,208`, `SystemOneJudge.ts:53` → P; `agents/helpers.ts:92` → A; `conversations/factories.ts:57` → F; matching fence → V |
| Anthropomorphic prose | `src/core/types.ts:23` → F; `providers/types.ts:25` → P; `Authority.ts:30`, `Agent.ts:771`, `agents/types.ts:360` → A; guide occurrences → V |
| Local fixture declarations | `integration.test.ts:246` → X; `ScopeManager.test.ts:19`, `InstructionManager.test.ts:24` → C; `Gauge.test.ts:9` → L; exported fixture patches → S |

Merge duplicates beyond those explicitly listed in the ruling: repeated guide-token repairs, placeholder repairs, contract-list conversion, empirical-claim removal, polling repairs, local fixture moves, and setup prose repairs. Keep distinct obligations at a shared line—for example guide `:313` needs both the strict-mode correction and token-prose correction.

The coverage-only gaps don’t create speculative code units. The verifier reconciles tracked scope with ownership; module owners inspect emitter construction and destruction where such lifecycle exists; R checks manifest/script intent. See the audit’s `critic.gaps` and scaffold `patterns.md:61`.

# Integration order

Use the following dependency order.

1. **Freeze the plan and dispositions.** Reconcile distribution ownership, receive the supplementary audit, confirm the registry 0.0.29 artifact, and record every canonical finding’s owner and status. Keep the scaffold range deferral explicit.
2. **Establish types before implementation.** F/A/C/L/P write their owned contracts. Freeze destination names, helper signatures, serialized discriminants, and exact shared-file patches. The parent orchestrator records a checkpoint before writing dispatch.
3. **Run disjoint source units in parallel.** F/A/C/L/P can work concurrently after cross-module move interfaces are fixed. X and R can proceed when their contracts are available. No unit edits a shared file.
4. **Integrate each barrel serially.** B-agents, B-contexts, B-conversations, B-ledgers, B-providers, then B-root. Resolve semantic conflicts through the owning unit, not through an unreviewed integration change.
5. **Integrate shared test infrastructure serially.** S, then T, then G. Module units apply their own import/call-site changes and run their scoped acceptance after these dependencies land.
6. **Land consumer adaptations.** DK, O, and H use the same built/packed result. O must be built before the measured driver consumes its renamed provider implementation.
7. **Integrate documentation.** R’s README, I’s index, and finally V’s agent guide. Run guide parity after the final source doc blocks and test transcriptions are present.
8. **Audit and verify.** Run one independent `orkestrel-falsify` round over the integrated claims, then the verifier’s final gates. Repair only failed claims and rerun affected checks.

The `opus`, `astra`, and `builder` roles retain the brief’s routing labels; the actual harness uses the mapping in scaffold `.agents/orchestration.md:25`. This analyst lane doesn’t launch another design round.

# Exit criterion and gates

The campaign exits only when every canonical confirmed finding and supplementary finding is repaired, deleted with its explicitly removed capability, refuted with evidence, or covered by the declared scaffold-range deferral. No shared-file patch, consumer patch, behavioral proof, or required gate may remain outstanding. This implements [the campaign acceptance](/home/user/agent-release/tmp/units/compliance-campaign.md:25).

The verifier records commands, exit codes, artifact digests, host, and unfiltered output. Run these gates against the integrated result.

| Gate | Required evidence |
|---|---|
| Discovery and ownership | Run the installed built twin of `orkestrel-harden/scripts/discovery.js`; reconcile every discovered test with its owner and gate. Confirm the setup-ledger files and imports are gone. |
| Finding-specific proof | Red/green or mutation evidence for repaired behavior; direct tests for extracted reusable logic; unchanged retained behavior for removals. |
| Full package gate | `npm run prepublishOnly`, read bare. This already includes format, lint, comprehensive checking, build, default tests, and release-mode distribution (`package.json:66`). |
| Recorded replay | `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` returns **108/108**, with existing normalizations, residual allowances, and controls unchanged. Compare pre/post port requests separately for raw-byte invariance. |
| Measured dry runs | Execute the actual entrypoint `bench4/driver.mjs --copy N --dry` for copies 1 through 8. `Driver.mjs` exports the class; lowercase `driver.mjs:4` invokes it. Require every comparison and the zero-fetch condition to pass. |
| Desk packed consumption | Pack the completed build into owned scratch, install it in an isolated consumer checkout, then run `npm run check`, `npm run test:app`, and `npm run test:journey:vue`. |
| Ollama packed consumption | Against that same packed artifact, run `npm run check` and `npm test`; run the amended live compaction proof in the separately authorized service session. |
| Aggregate seams | `node /home/user/scaffold/.orkestrel/agent/instruments/harness/bench5/seams.ts --build VENDORED_INDEX --json`; require exit 0, matching build digest, every seam satisfied, and zero fetch calls. The interface is documented at `seams.ts:1`. |
| Live wire comparison | The authorized live session runs one copy and `compare-wires.mjs` against its recorded wire. Preserve the no-request restriction for this design lane. The live requirement remains part of the campaign at `compliance-campaign.md:8`. |
| Independent audit | One `orkestrel-falsify` round on the integrated diff, covering public compatibility, snapshot behavior, selection retention, ledger bytes, test adequacy, and documentation truth. |

Read `npm run prepublishOnly` without a pipe. Don’t run its constituent tree-wide gates redundantly beside live writers. A registry outage, absent service, missing supplement, or unavailable host reading is an unmet gate, not a pass.

# Risks

- **The supplement can change bounded work.** Its findings weren’t available. File ownership is fixed, but acceptance must incorporate its verified findings before closing the campaign; see `compliance-design-brief.md:13`.
- **Public renames extend outside this checkout.** Provider subclasses, desk parsing, corpus adapters, and aggregate projections have concrete consumers. An agent-only green build cannot accept those changes.
- **Recorded literals must remain distinct from API names.** Renaming serialized judgment heads would invalidate corpus reuse and alter judge calls (`Classifier.ts:271`; bench5 `helpers.ts:344`).
- **Removing rollup changes summarizer-call counts and failure paths.** Preserve section merging and failed-merge recovery while removing only regeneration (`Conversation.ts:249,266,272`).
- **The replay proves its declared comparison contract.** Its accepted normalizations mean 108/108 alone can’t establish literal equality (`ledger-replay.test.ts:53`).
- **Scaffold 0.0.100 is a deferred release dependency.** Passing the installed 0.0.99 instruments doesn’t prove every 0.0.100 semantic rule. Review against the checkout canon, then repeat affected policy checks after the authorized release visit (`compliance-rulings.md:18`).
- **Windows remains a separate reading.** Linux validation cannot close npm-entry resolution, environment merging, or scratch-cleanup behavior on Windows; the campaign assigns that host to the other session (`compliance-campaign.md:17`).