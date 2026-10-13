# Compliance and trim plan for @orkestrel/agent 0.0.30: subjective lane

Lane: subjective (API shape, naming, vocabulary, guide voice). Every item the brief lists gets a ruling. I wrote no file and ran no command. Every reading in this plan comes from the files cited.

## Rejected findings

I reject the following findings, or parts of findings, on verification. Each entry gives the reason.

- **`/home/user/agent-release:0`** (conversations/prose-host): this is a process note about a missing diff, not a finding (`compliance-audit.json:5454-5460`).
- **`src/core/contexts/factories.ts:85`** (findJudgment duplicate): R5 removes both sites. The second site sits inside `inferApplicability` (`contexts/helpers.ts:91`, duplicate at `:102-111`), which R5 lists (`trim-rulings.md:19`).
- **`src/core/contexts/factories.ts:44`** (createSelection remark): R5 removes `createSelection` (`contexts/factories.ts:54`).
- **`src/core/contexts/constants.ts:3`** ("measured" `NEEDED_CRITERION`): R5 removes the constant. G deletes the guide rows at `guides/agent.md:453` and `:1058` with the rest of the R5 rows.
- **`src/core/ledgers/types.ts:36`** (`amends`/`supersedes` keys → nouns): rejected, and raised under Tensions.
  - The key is one token with the persisted judgment-id head. `#buildPair(head)` writes `JSON.stringify([head, earlier, later])` and reads `questions[head]` and `thresholds[head]` (`Classifier.ts:271-274`, `:86-90`). `classification()` parses the head back (`Classifier.ts:191-202`).
  - Renaming only the key splits one concept across two words, which breaks "One concept, one term" (`/home/user/scaffold/AGENTS.md:54`) and needs a translation table.
  - Renaming the head too makes every recorded judgment stop matching: the desk snapshots, the Driver's imported corpus (`Driver.mjs:224`), and the replay fixture (`tmp/probes/ledger-replay-support.ts:673`, `:975`). That would break the measured-bytes proof (`trim-rulings.md:36`).
  - Keeping the key costs no consumer patch: desk `server/constants.ts:127-128`, `Driver.mjs:66`, `seams.ts:37-39`, and `ledger-replay-support.ts:41` all use these keys.
- **`src/core/ledgers/types.ts:366`, `quiet` part only**: rejected. `quiet` is the concept's one term. `Classifier.quiet(id)` (its rename was refuted at `compliance-audit.json:4169-4175`) and `QUIET_CATEGORIES` keep it, and `seams.ts:255` checks the method. Every noun candidate (`noise`, `silence`) adds a second term. The `amended` → `amendments` and `superseded` → `supersessions` parts of the same finding are accepted.
- **`src/core/ledgers/types.ts:427`, `stale` part only**: rejected for the same reason. The verifier added it as "reviewer's choice". "Stale" is the term carried by `LedgerStaleSentence` (`types.ts:414`) and by the prose at `helpers.ts:805`. The `loose` part is accepted.
- **`critic.missed` `package.json:89`** (scaffold `^0.0.100`): deferred by ruling (`compliance-rulings.md:18`) and refuted (`compliance-audit.json:4753-4758`).
- **`critic.missed` `src/core/agents/helpers.ts:208`, rename half**: the `handle*` rename was refuted (`compliance-audit.json:3657-3662`), so I don't bring it back. The `@example` half is accepted and assigned to U3.
- **`critic.missed` `Channel.ts:35` and `:55`** (copy-on-write on the FIFO `#buffer`): deferred to the Orchestrator together with the Set/Map scope question that ledgers-a referred (`compliance-audit.json:1610`). The Conversation and Gauge arrays in the same item are accepted.
- **Overruled sides of conflicting test fixes.** Each of these was confirmed by one lane and contradicted by another; the losing side is rejected:
  - `factories.test.ts:151`: the `createPartialJob`, `createBudgetZeroJob`, and `createLoopTools` exports are rejected. They are pass-through factories (`architecture.md:165`) and C2 rules on them (`compliance-rulings.md:8`). The fix is to inline them.
  - `Agent.test.ts:3697`: the `createContextBudget` export is rejected; inline it.
  - `Agent.test.ts:102` and `:118`: exporting `createRecordingBudget` is rejected, because the object is a behavioral fake (`tests.md:29`). Use the real budget with a recorder consumer (`compliance-audit.json:2113`).
  - `ledgers/helpers.test.ts:147`: the `buildReading` export is rejected (wrapper law); inline it.

## Public changes and blast radius

The registry 0.0.29 surface in the following table is read from `/home/user/ollama/node_modules/@orkestrel/agent/dist/src/core/index.d.ts`. That file reports 0.0.29 and declares no `createLedger`. Every change lands in 0.0.30.

| Change | 0.0.29 | Desk | Ollama | Harness and Driver | Patch |
| --- | --- | --- | --- | --- | --- |
| `RunOutcome` → `AgentRunResult` (`agents/types.ts:110`) | published (`d.ts:1137`, `:1299`) | none | none | none | none |
| `AgentProvider.body` / `AgentJudge.body` → `encode` (`providers/types.ts:263`, `:358`) | published (`d.ts:684`, `:904`) | none | `OllamaProvider.ts:74`, `OllamaJudge.ts:113` | none | X2 |
| `readHeaders` → `buildHeaders` (`providers/helpers.ts:316`) | absent | none | none | none | none |
| `rehydrate` returns `undefined` on a miss (`conversations/types.ts:430`) | published (`d.ts:1862`) | none | none | none | none |
| `ConversationManager.remove` overload order (`types.ts:747`) | type only | none | none | none | none |
| `AgentErrorCode`, `FailureRead`, `LedgerWordSet` types added | absent | none | none | none | none |
| `Reading`, `copyJSON`, `isMessage`, `Judgment`, `JudgmentInput`, `collectExchanges`, `collectToolGroups`, `matchesJudgment` change kind file | same barrel | none | none | `seams.ts:58` stays satisfied | none |
| `LedgerGauge.fixed` → `overhead` (`ledgers/types.ts:220`) | absent | `app/core/parsers.ts:633-640`, `vue/Lane.vue:168-173`, `vue/helpers.ts:1320` | none | probe `ledger-replay-support.ts:780`, `ledger-replay.test.ts:298`; Driver report field (Risks) | X1; U6 edits the probe |
| `GaugeInterface.left` → `remainder` (`types.ts:620`) | absent | none | none | none | none |
| `LedgerNote.closed` → `closure` (`types.ts:104`) | absent | none (reads `.cue`, `AgentThread.ts:98`) | none | `seams.ts:38` | X3 |
| `resolveLedgerCall` → `findLedgerCall` (`ledgers/helpers.ts:33`) | absent | none | none | `seams.ts:61` | X3 |
| `LedgerClassification.amended`/`superseded` → `amendments`/`supersessions`; `LedgerProjectionInput.exclude` → `exclusions`; `LedgerProjection.loose` → `orphans` | absent | none | none | none | none |
| R1 `LedgerOptions.notes`, R2 `LedgerRecallOptions.description`, R3 narrow `LedgerAgentOptions` to `limit`, `timeout`, `on`, R4 `Gauge.measure` removed | absent | none (`server/factories.ts:54-65` sets none of them) | none | `Driver.mjs:67` passes `recall.limit` and `agent.limit`/`timeout` only | none |
| R5: `createSelection` and its closure removed (contexts only; trace in U4) | absent | none (`Selection` type kept, `RecordsThread.ts:6`) | none | `seams.ts:238` uses `select`/`apply`, which stay | none |
| R6: `Scope`/`ScopeInput.description` removed | absent (`d.ts:5234-5236`) | none | none | `seams.ts:280` passes `name`/`select` only | none |
| R7: `rollup` option (3 interfaces); `summary` getter, event, and snapshot field; `ConversationReferenceOptions.summary`; the `Summary:` line | getter, event, field, and reference option published (`d.ts:1849`, `:1926`, `:2400`); `rollup` absent | none (reads section `summary` only, `AgentThread.ts:55`) | none | none | none |
| Helper and guard exports added (Design) | absent | none | none | none | none |

## R7 snapshot ruling

**Ruling: read a 0.0.29 snapshot without its `summary`. Don't refuse it.**

The implementation needs no added code:

1. U5 deletes `summary` from `ConversationSnapshot` (`types.ts:509`).
2. U5 deletes `summary: optionalOf(isString)` and its entry in the optional list from `isConversationSnapshot` (`validators.ts:128`, `:133`).
3. `objectOf` admits unknown members ("unknown members admitted", `node_modules/@orkestrel/contract/dist/src/core/index.d.ts:4274`). A 0.0.29 snapshot that carries `summary` therefore passes the guard.
4. The conversation hydrates its sections, messages, and judgments. Its next `snapshot()` omits the field.
5. `isSection` keeps requiring the section `summary`, because section summaries stay (`trim-rulings.md:22`).

Refusing was rejected for three reasons:

- It needs an added exactness check, which is a format-keyed branch that `architecture.md:317` forbids.
- It turns every persisted 0.0.29 conversation into `undefined` on read, so `DatabaseConversationStore.get` drops user data.
- The rollup never reached the view (`trim-rulings.md:22`), so dropping it changes nothing the model reads.

U5 must add a proof. The proof feeds a 0.0.29-shaped snapshot that carries `summary: 'recap of 2'` through `isConversationSnapshot` (expects true) and through `ConversationManager.open`. It then asserts that `snapshot()` has no `summary` key and that `view()` equals the recaps followed by the tail.

## Design (subjective rulings the units implement)

### Names

The names chosen for renamed and added symbols are the following:

- **Agents:**
  - `#run` → `#execute`.
  - `#events` → `#drainEvents`. Not `#drain`, which is `Channel.drain`.
  - `#parents` → `#combineSignals`.
  - `broke` → `exited`; `est` → `estimate`.
  - `#parked` → `#park`.
  - `#options` → `#buildOptions` and `#manager` → `#buildToolManager`. Fold `#budget` into `#buildOptions`.
  - `#resolve` → the exported helper `requireEntry(pool, category, name)`. `resolve*` is reserved for option defaults (`names.md:98`).
  - The duplicate queue options → `extractQueueOptions(options)`, typed with the `@orkestrel/queue` type. "Substrate" is jargon.
- **Conversations:**
  - `#own` → `requireJudgment(value)`.
  - The sections guard → `requireSectionsCap(cap)`.
  - `require*` takes one meaning across the package: it returns its validated argument or throws a coded error.
  - `sub` → `unmatched`.
  - `#ensure` → one `#ensureConversation()` that returns `active ?? seat`.
- **Ledgers:**
  - Guards `isFraction` and `isPositiveSafeInteger` go in a created `ledgers/validators.ts`. `isCapacity` was too generic for fleet ownership.
  - Pure helpers: `collectProjectionIds`, `scanAmendments` (`scan*` walks a structure, `names.md:96`), `buildRecallMessage`, `renderTopicNames` (`render*` produces text), `renderCauseChain` (qualified so it doesn't collide with `describeError` in the fleet), `extractWords` (returns `LedgerWordSet`, a sibling of `LedgerTokenSet`), and `splitWords`.
  - `#runPass` → `#generatePass`.
  - `#price(messages)` is a private method.
- **Providers:**
  - `body` → `encode`. It pairs with `read`, which decodes a record. `project` reads as a noun.
  - `readFailure` with type `FailureRead` (sibling of `TextRead`).
  - The reader cleanup → `armReaderAbort`, which avoids the word "cancel" (`names.md:117`).
  - `#cancel` → `#abort`.
- **Duplicate pinned rendering:** `renderLedgerPinned` composes `renderLedgerRecord` and adds one heading level. No `renderLedgerSection` export, so `seams.ts:66` and the guide rows stay as they are.
- **Tests:**
  - C1 and C3 apply (`compliance-rulings.md:7-9`).
  - `domainArgument` → `returnDomain`, a sibling of `returnUndefined`.
  - Function types → `DeltaFunction`, `ConversationStoreFunction`, and `ConversationSnapshotFunction`. Type names are never plural (`names.md:167`).
  - `conversationStoreRoundTripExpectation` → `CONVERSATION_STORE_ROUND_TRIP_EXPECTATION`, frozen.
  - `RecordedProvider.cancelled` → `aborted`.
  - Folded ledger helpers: `flipLedgerItems` → `reverseLedgerMembers` (one term with `reverseLedgerInput`; also clears `items`), `flipLedgerMap` → `reverseLedgerMap`, `readShape` → `computeLookupKey` (`*Shape` is reserved, `names.md:192`), and `args` → `values`.
  - Test helpers moved to setup: `collectPaced`, `createTurnRegistry`, `createAuthorityContext`, `createEchoProvider`, `createAnswerProvider`, `requestConversation`, `computeUsageTotal`, `seedCompactionAgent`, `createMessage`, `generateReply`, `splitWordDeltas`, `buildGaugeCall`, `buildLedgerLine`, `replaceLedgerRecord`, `LEDGER_EMPTY_FOUND`, and `LEDGER_DESK_THRESHOLDS`.
- **Prose:** one placeholder, `IMAGE_BASE64`, explained on first use. It replaces `'<payload>'` at `contexts/helpers.ts:236-307` and at `guides/agent.md:195`, and resolves the BASE64_IMAGE / BASE64_PAYLOAD split between the two docs findings.

### Alternatives

- `RunResult` was considered instead of `AgentRunResult`. `AgentRunResult` matches `AgentRunOptions` (`agents/types.ts:417`) and is less likely to collide under the fleet `surface` rule.
- The audit's `renderLedgerSection` export and `selectSubstrate` name were rejected for the composition and the name given in Design.
- Phase-free strict ownership was considered: each module unit would return import-line patches for relocations. It needs patches into files that aren't shared, which the protocol doesn't provide. U1 runs alone instead (see Tensions).

## Units

The supplementary audit (`tmp/units/compliance-audit-tests.json`, not present on 2026-10-10) maps to owners as follows. The unit that owns a test file applies that file's supplementary findings. If the JSON lands after a unit has handed back, the same unit takes a second pass over its own files before IG runs.

Every unit returns exact patches for shared files:

- B integrates `src/core/index.ts` and each module's `index.ts`.
- S integrates `tests/setup.ts` and `tests/setup.test.ts`.
- IG integrates `tests/guides.test.ts`.
- G integrates `guides/agent.md`, `guides/README.md`, and `README.md`.

Every guide patch gives each changed Summary cell as the exact new TSDoc description paragraph, with each `{@link}` written as its code token.

### U1 relocate

- **Role:** builder.
- **Phase:** 1a. It runs alone, because it touches files that later units own.
- **Owns (phase 1a only):**
  - `src/core/{types,helpers,validators,cloners}.ts` (`cloners.ts` is created)
  - `src/core/providers/{types,helpers,AgentJudge}.ts`
  - `src/core/conversations/{types,helpers,validators,JudgmentManager,Conversation}.ts`
  - `src/core/contexts/{helpers,factories}.ts`
  - `src/core/ledgers/{Classifier,Ledger}.ts`
  - `tests/src/core/{helpers,validators,cloners}.test.ts`
  - `tests/src/core/conversations/{helpers,validators}.test.ts`
- **Closes:**
  - `types.ts:179`: `Reading` moves to `providers/types.ts`.
  - `helpers.ts:223` (two entries, merged): `copyJSON` moves to `cloners.ts`.
  - `validators.ts:34`: `isMessage` moves to `conversations/validators.ts`.
  - `conversations/helpers.ts:22`: `collectExchanges`, `collectToolGroups`, and `matchesJudgment` move to root `helpers.ts`; `Judgment` and `JudgmentInput` move to root `types.ts`. Keep `ReadonlyArray<readonly Message[]>`, because the refuted entry at `compliance-audit.json:4001-4005` keeps it.
  - It moves the matching test cases.
  - It renames, rewords, and adds nothing.
- **Patches:**
  - To B: `export * from './cloners.js'`.
  - To G: move the rows at `agent.md:748`, `:782`, and `:788` and the conversations helper and type rows to their module tables; update the test-index lines at `:2610-2611`.
- **Depends on:** nothing.
- **Acceptance:** after B applies its patch, run `npm run check:src:core`, then `npm run test:src:core`. A Grep for `function copyJSON|function isMessage|interface Reading` must hit only the destination files.

### U8 distribution

- **Role:** astra.
- **Phase:** 1a, in parallel with U1 (no shared files).
- **Owns:** `tests/distribution.test.ts`.
- **Closes:** `:181` (installed `isRecord`), `:233` (spawn `process.execPath` with the npm JavaScript entry, no shell), `:232` (child environment merged by case-folded name), `:663` and `:669` (merged: `createScratch`, `destroyScratch`, and `removeTree`), and `:855` (history clause).
- **Refers:** the scaffold template copies at `/home/user/scaffold/src/core/templates.ts:2050`, `:1895`, and `:2919`, to the Orchestrator.
- **Depends on:** nothing.
- **Acceptance:** `npx vitest run --config vite.config.ts --project distribution tests/distribution.test.ts`, run on Linux. The Windows reading is the other session's gate (`compliance-campaign.md:17`).

### S0 setup pass (first pass of the S integration unit)

- **Role:** builder.
- **Phase:** 1b, after U1's acceptance.
- **Owns:** `tests/setup.ts` and `tests/setup.test.ts` for the whole campaign.
- **Closes:**
  - `setup.ts:498`, `:900`, `:911` (C1).
  - `:1240` (two entries, merged, C3), plus `domainArgument` at `:1874` → `returnDomain`, and the `makeStore` parameter → `create`.
  - `:446` (function types), `:1223` (frozen constant), `:791` (`aborted`), `:568` (one `createRelayRequest`), `:1576` (`compactSeedTurns`).
  - `:449`, `:1501`, `:1506` (summary sentences), `:563` (`@param`/`@returns` on the cited exports), `:461` and `:527` (two entries, merged), `:1205`, `:1164`, `:2020`, `:403` and `critic.missed :934`, and `critic.missed :1800` (`waitForAbort`).
  - `setup.test.ts:70` (three entries, merged), `:398` (assert section cases against the declaration; U5 removes the rollup half), and `:48`.
- **Depends on:** U1.
- **Acceptance:** `npx vitest run --config vite.config.ts --project setup tests/setup.test.ts`. `test:src:core` stays red until the phase-2 units update their imports.

### U2 root

- **Role:** builder.
- **Phase:** 2.
- **Owns:**
  - `src/core/{types,helpers,validators,cloners,constants,errors,contracts,shapers}.ts`
  - `tests/src/core/{helpers,validators,cloners,contracts,shapers,integration}.test.ts`
- **Closes:**
  - `helpers.ts:37` (`members`), `:19`, `:29`, `:194`, `:120`.
  - `types.ts:90` (numeral; guide cell `agent.md:734`).
  - `critic.missed types.ts:23` (G cells `:733` and `:740`).
  - `helpers.test.ts:88` and `:240` (two pairs of duplicate entries, merged).
  - `integration.test.ts:371` (two entries, merged → `generateReply`), `:249`, `:420`, `:250` (`splitWordDeltas`), `critic.missed :246`.
  - The object-literal-method sites from `Agent.test.ts:4393` that fall in its files.
- **Depends on:** U1 and S0.
- **Acceptance:** after S and B apply its patches, run `npx vitest run --config vite.config.ts --project src:core tests/src/core/helpers.test.ts tests/src/core/integration.test.ts` and `npm run check:src:core`.

### U3 agents

- **Role:** opus.
- **Phase:** 2.
- **Owns:** `src/core/agents/**` and `tests/src/core/agents/**`.
- **Source closes:**
  - `AgentRegistry.ts:136`, `:103`, `:128`, `:23`.
  - `factories.ts:212`, `:37`, `:252`, `:137`, `:235`, `:226` (with `types.ts:790`).
  - `Agent.ts:354`, `:333`, `:862`, `:470`, `:382`, `:387`, `:68`, `:58`, `:623`, `:146` (emitter options passed straight through).
  - `types.ts:110`, `:507` (two entries, merged), `:281`, `:41`, `:147`, `:245`, `:247`, `:287`, `:654`, `:289`, `:502`.
  - `errors.ts:89` (`AgentErrorCode`), `:75`.
  - `Authority.ts:22`, `Channel.ts:72`.
  - `helpers.ts:92` (C4).
  - `critic.missed`: `helpers.ts:208` (`@example` only), the agents plurals and possessives, `Authority.ts:30`, `Agent.ts:771`, `types.ts:360`.
- **Test closes:**
  - `Channel.test.ts:109` (iterator assertion), `:149` and `:167` (`collectPaced`), `:84`.
  - `factories.test.ts:62` (two entries, merged), `:157`, `:172` (C2), `:184` (inline these three), `:151` (`JOB_USAGE` and `PARTIAL_TURNS` move to setup), `:277` (with `Agent.test.ts:4393` and `:4423`: one setup export per distinct contract), `:360`, `:674`, `:755` (two entries, merged → `waitForCondition`), `:846`, the prose lines at `:40-42`, `:144-145`, `:43`, `:84`, `:95`, `:362`, `:387`, `:474`, `:598`, `:670`, `:766`, `:780`.
  - `helpers.test.ts:357` (two entries, merged), `:29` (two entries, merged), `:15`, `:282`.
  - `Agent.test.ts:118`, `:1328` (inline), `:1792`, `:3858`, `:4101`, `:4376`/`:4450`, `:4570`, `:1932`, `:3670`, `:3697` (inline), `:102`, `:1542`, `:2`, `:68`, `critic.missed :3650`, and the prose lines at `:1562`, `:1660`, `:1707`, `:1711`, `:1825`, `:1990`, `:2461`, `:2588`, `:3003`, `:3168`, `:3225`, `:3642`, `:3777`, `:3780`, `:3844`, `:3852`, `:4167`, `:4180`, `:4360`, `:4449`.
  - `Authority.test.ts:14` (two entries, merged), `:2`.
  - `AgentRegistry.test.ts:2`, `:23`, `:268`, `:557`.
- **Depends on:** U1 and S0.
- **Acceptance:** after S and B apply its patches, run:
  - `npx vitest run --config vite.config.ts --project src:core tests/src/core/agents`
  - `npm run check:src:core`
  - Grep over `src/core/agents` for `` RunOutcome|#run\b|\}s\b|`[^`]+`s\b|'s\b `` must return no prose hit.

### U4 contexts (with R5 and R6)

- **Role:** astra.
- **Phase:** 2.
- **Owns:** `src/core/contexts/**` and `tests/src/core/contexts/**`.
- **Closes:**
  - R5, with the closure trace confirmed to stay inside contexts.
  - R6: `types.ts:342`, `:363`, `:370`; `Scope.ts:24`, `:44`, `:49`, `:63`.
  - `AgentContext.ts:148`, `:219`, `:176`, `:198`.
  - `InstructionManager.ts:61` and `ScopeManager.ts:50` (emitter options).
  - `helpers.ts:211` and `:240` (merged), `:236`, `:191`.
  - `types.ts:27`, `:144`, `:207`, `:516`, `:163`, `:424` (G cell `agent.md:1525`).
  - `critic.missed`: the contexts plurals and possessives that survive R5.
  - Tests: `factories.test.ts:2`, `:43`; `helpers.test.ts:315` (two entries, merged); `AgentContext.test.ts:61` (and `:299`, `:478`, `:535`, `:725`, `:926`, `:983`); `Scope.test.ts:117`; `InstructionManager.test.ts:15`; `ScopeManager.test.ts:9`; `critic.missed` fixture constants.
- **Emptied kind files:** delete `contexts/{errors,parsers,templates}.ts` if R5 empties them, together with `tests/src/core/contexts/{parsers,templates}.test.ts`. The B patch removes their barrel rows (Tensions).
- **Patches:**
  - To S: remove the selection fixtures and imports (`setup.ts:34-37`, `:50-53`). This also closes `setup.ts:194`.
  - To IG: remove the R5 cases, including the `guides.test.ts:800` site that uses `filterSelectionMessages`.
  - To G: remove the R5 and R6 rows and prose.
- **Depends on:** U1 and S0.
- **Acceptance:** after S and B apply its patches, run `npx vitest run --config vite.config.ts --project src:core tests/src/core/contexts` and `npm run check:src:core`. A Grep for the R5 symbol list (`trim-rulings.md:19`) over `src` and `tests` must return nothing outside IG's pending file.

### U5 conversations (with R7 and the snapshot ruling)

- **Role:** astra.
- **Phase:** 2.
- **Owns:** `src/core/conversations/**` and `tests/src/core/conversations/**`, including a created `factories.test.ts`.
- **Source closes:**
  - R7, including removing `ConversationReferenceOptions.summary` and rewriting the `buildSummaryMessage` TSDoc. That helper stays, because it serves the section merge at `Conversation.ts:255`.
  - `JudgmentManager.ts:135`, `:107`.
  - `Conversation.ts:122`, `:283`, `:117`, `:25`, `:101`, `:243`, `:236`, `:343`, `:194`, `:321`, `:106`, `critic.missed :245` and `:258`.
  - `validators.ts:84` merged with `:65`, `:64`.
  - `ConversationManager.ts:154`, `:15`, `:131` (drop "rollup" from the replacement comment).
  - `types.ts:213` (two entries, merged, plus `factories.ts:28` and `:154`), `:376` (two entries, merged), `:697`, `:44`, `:396`, `:131`, `:354`, `:476`, `:75`.
  - `factories.ts:173`, `:81`, `:75` (the missing mirror), `critic.missed :57`.
  - `MemoryConversationStore.ts:5`, `:63`.
  - `errors.ts:3`.
  - `constants.ts:25` (three entries, merged), `:23`.
  - `critic.missed`: the conversations possessives.
- **Test closes:** `Conversation.test.ts:967`, `:968`, `:1104` (two entries each, merged; drop `rollup: true`), `:17` (`renderRecap`), `:23`, `:500`, `:554`; `validators.test.ts:66`; `DatabaseConversationStore.test.ts:19`, `:35`, `:129`; `MemoryConversationStore.test.ts:105`.
- **Patches:**
  - To S: remove the rollup fixtures, including `rollupSummary` and the remaining half of `setup.test.ts:398`.
  - To IG and G: the matching rollup removals, plus the cells at `agent.md:945`-`:1011`.
- **Depends on:** U1 and S0.
- **Acceptance:** after S and B apply its patches, run:
  - `npx vitest run --config vite.config.ts --project src:core tests/src/core/conversations`
  - `npm run check:src:core`
  - The R7 snapshot proof.
  - A Grep for `rollup` over `src` and `tests` must return nothing outside IG's pending file.

### U6 ledgers (with R1–R4 and the setup fold)

- **Role:** astra.
- **Phase:** 2.
- **Owns:**
  - `src/core/ledgers/**`, including a created `validators.ts`
  - `tests/src/core/ledgers/**`, including a created `validators.test.ts`
  - `tests/setupLedger.ts` and `tests/setupLedger.test.ts` (both deleted)
  - `tmp/probes/ledger-replay*.ts`
- **Source closes:**
  - R1–R4.
  - T1, T2, T3, T4, NEW-1, and NEW-3 (merged with `helpers.ts:375`).
  - `Ledger.ts:277`, `:115`, `:122`, `:642`, `:789`, `:607`, `:993`, `:189`, `:624`, `:1003`, `:400`, `:447`, `:228`, `:1076`, `:1096` (one edit), `:317` (with `critic.missed types.ts:323`).
  - `Classifier.ts:315`.
  - `Gauge.ts:86` (merged with `types.ts:620`), `:75` (two entries, merged), `:63` (merged with `types.ts:220`), `critic.missed :128`.
  - `helpers.ts:520` (composition), `:143`, `:213`, `critic.missed :531` and `:639`.
  - `types.ts:366` and `:427` (accepted parts), `:441`, `:104`.
  - `guides.test.ts:1252` (the 16 ledger sites, plus `LEDGER_DESK_THRESHOLDS` in the fold).
- **Test closes:** `helpers.test.ts:147`, `:1035`; `critic.missed Gauge.test.ts:9`; `Gauge.test.ts:11` (`readCode` moves to setup under a verb-led name); `setupLedger.ts:1` (five entries, merged), `:214`, `:106`; `setupLedger.test.ts:23` (two entries, merged), `:38`.
- **Fold (brief item 4):** U6 returns one S patch.
  - The patch moves every `setupLedger.ts` declaration into `tests/setup.ts`, under the renames in Design and the ledger renames, and exports each private helper with TSDoc.
  - It moves both describe blocks into `tests/setup.test.ts` and inlines `listFaults`.
  - It adds cases for `computeLookupKey`, `listPlacementKeys`, and `hasEffect`, each failing for the defect it guards (`compliance-audit.json:3102`).
  - U6 repoints `ledgers/helpers.test.ts:41` and `Classifier.test.ts:19` to `../../../setup.js`, merges each with the existing setup import, and deletes both `setupLedger` files.
  - The mirror law holds in both directions after the deletion (`tests.md:21-25`). `setup.ts` stays host-independent (`compliance-audit.json:2896`).
- **Probe:** edit only the gauge key, at `ledger-replay-support.ts:780` and `ledger-replay.test.ts:298`. Leave `THRESHOLDS` (`:41`) as it is.
- **Depends on:** U1 and S0. Its patches are integrated first in phase 3.
- **Acceptance:** after S and B apply its patches, run, in order:
  1. `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers`
  2. `npx vitest run --config vite.config.ts --project setup`
  3. `npm run check:src:core`
  4. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts`, which must read 108 passed.
  5. A Grep for `resolveLedgerCall|\.left\(|\bfixed\b|exclude:|\.loose|amended|superseded` over `src/core/ledgers` and `tests`, which must return no code hit.

### U7 providers

- **Role:** opus.
- **Phase:** 2.
- **Owns:** `src/core/providers/**` and `tests/src/core/providers/**`.
- **Source closes:**
  - `AgentJudge.ts:153`, `:100`.
  - `helpers.ts:97`, `:201`, `:316`, `:311`, `critic.missed :206` and `:208`.
  - `types.ts:263`, `:103`, `:226`, `:75`, `:41`, `critic.missed :25`.
  - `RelayStream.ts:88`; `AgentProvider.ts:151`; `RelayProvider.ts:139`.
  - `SystemOneJudge.ts:91`, `:52`, `critic.missed :53-55` (a titled example; G changes the fence at `:1873-1876`).
  - `shapers.ts:20`; `errors.ts:83`, `:9` (merged with NEW-4).
- **Test closes:** `ThinkSplitter.test.ts:59`, `:5`, `:133`, `critic.missed :9`, `:13`; `critic.missed RelayStream.test.ts:80`; and the `Agent.test.ts:4393` object-literal sites in `RelayProvider.test.ts` and `contracts.test.ts`.
- **Patches:**
  - To S: `body` → `encode` in the setup subclasses, and the `aborted` readers.
  - To IG: the transcribed `body` fences.
  - To G: the fences at `:1821` and `:1909` must equal the titled examples at `AgentProvider.ts:62` and `AgentJudge.ts:33`.
- **Depends on:** U1 and S0.
- **Acceptance:** after S and B apply its patches, run `npx vitest run --config vite.config.ts --project src:core tests/src/core/providers` and `npm run check:src:core`. A Grep for `\bbody\(|readHeaders|#cancel` over `src` must return nothing.

### B barrels

- **Role:** builder.
- **Owns:** `src/core/index.ts` and `src/core/{agents,contexts,conversations,ledgers,providers}/index.ts`.
- **Closes:** nothing of its own.
- **Work:** applies the U1, U4, and U6 rows before each unit's acceptance.
- **Acceptance:** `npm run check:src:core`.

### S integration (later passes)

- **Role:** builder.
- **Work:** applies each unit's setup patch serially (order under Integration order), then runs that unit's acceptance together with `npx vitest run --config vite.config.ts --project setup`.

### IG guides test

- **Role:** astra.
- **Owns:** `tests/guides.test.ts`.
- **Closes:**
  - `:800` (two entries, merged). Check each local binding against the fences under `guides/agent.md` first (`tests.md:237-238`). `:3058` stays a transcription (`compliance-audit.json:4721-4726`).
  - `:1367` (`createPhraseJudge` moves to setup), `:2802` (no name `run`), and the three `:1252` sites.
  - It applies every unit's guides-test patch.
  - Its own setup patch goes to S.
- **Depends on:** U2–U7 and S.
- **Acceptance:** after S applies its patch, run `npm run check`.

### G docs

- **Role:** opus.
- **Owns:** `guides/agent.md`, `guides/README.md`, and `README.md`.
- **Closes:**
  - `agent.md:952` (merged parity copies), `:801`, `:798` (merged with `:750`), `:2097`, `:1525`, `:313` (two findings), `:11` (three findings: plurals, verb uses, contractions outside Summary cells), `:127`.
  - `:195` (two entries, merged → `IMAGE_BASE64`), `:2155` (two entries, merged: delete the sentence, because no run is cited), `:1709` (two entries, merged: bullets), `:265`, `:13`, `:1939`, `:72`, `:1837`, `:1791`, `:2648`, NEW-2.
  - The `critic.missed` cells at `:411`, `:733`, `:740`, `:1746`, `:2269`, `:2271`.
  - `guides/README.md:16`, `:36`, `:5`.
  - `README.md:24`, `:55`.
  - Every unit's cell, row, and fence patch, and the rows for each added export.
- **Depends on:** IG. Fence text must equal IG's transcriptions.
- **Acceptance:** `npm run test:guides`, read bare.

### K converge

- **Role:** builder.
- **Work:** `npm run lint`, then `npm run format`. It makes no semantic edit.
- **Depends on:** G.

### X1, X2, X3 consumer patches

- **Role:** builder, one unit each.
- **X1 desk:** `fixed` → `overhead` at `app/core/parsers.ts:633-640`, `vue/Lane.vue:168-173`, and `vue/helpers.ts:1320`, plus each gauge literal in its tests.
- **X2 ollama:** `body` → `encode` at `src/core/OllamaProvider.ts:74`, `OllamaJudge.ts:113`, and every test and guide site.
- **X3 harness:** at `bench5/seams.ts:38` change `'closed'` to `'closure'`; at `:61` change the export name to `findLedgerCall`. This is a scaffold-repository change, routed to the session that holds scaffold's publish authority.
- **Depends on:** K and a packed build.

### V verifier

- **Role:** verifier. Runs the gates in Exit criterion and gates. Edits no source.

## Integration order

The units run in the following serial order:

1. U1 ∥ U8, then B applies U1's row and U1 runs its acceptance.
2. S0.
3. U2, U3, U4, U5, U6, and U7 in parallel. Each hands back code and patches.
4. B and S apply each unit's patches in this order, and each unit's acceptance runs right after its own patches:
   1. U6: the largest setup patch, and the replay gate.
   2. U5: R7 removes setup fixtures.
   3. U4: R5 removes setup fixtures.
   4. U3.
   5. U7.
   6. U2.
5. IG, then S applies IG's setup patch.
6. G.
7. K.
8. V.
9. X1, X2, and X3 against packed builds.
10. One `orkestrel-falsify` round on the integrated diff (`compliance-campaign.md:28`).

## Exit criterion and gates

The campaign exits when every confirmed and `critic.missed` finding is closed or listed under Rejected findings, and every following gate passes, read bare.

1. `npm run prepublishOnly`.
2. `npx vitest run --config vite.config.ts --project probe tmp/probes/ledger-replay.test.ts` reads 108 of 108.
3. `bench4/Driver.mjs --dry` passes on copies 1 to 8 against a build of this checkout vendored at `/home/user/scaffold/.orkestrel/agent/dist`. The Driver imports `../../dist/src/core/index.js` (`Driver.mjs:5`). One live copy must also match its recorded wire under `compare-wires.mjs`. That is the Orchestrator's live run.
4. Desk `check`, `test:app`, and the journey suite against `npm pack` of this checkout, with X1 applied.
5. `@orkestrel/ollama` check and tests against the packed build, with X2 applied.
6. `node bench5/seams.ts --build <vendored dist/src/core/index.js>` exits 0, with X3 applied.

## Risks

- **Every project loads `tests/setup.ts`** (`vite.config.ts:132-232`). A unit's acceptance is only valid after S applies its patch. A runtime use of a removed setup export reads `undefined` rather than failing at load.
- **The replay probe imports the built ollama judge** (`ledger-replay-support.ts:35`). Run gate 2 both before and after X2 rebuilds `/home/user/ollama/dist`.
- **Gauge report readers.** The Driver writes `this.#ledger.gauge` into its report (`Driver.mjs:223`), so the report field changes from `fixed` to `overhead`. An aggregate reader of `gauge.current.fixed` would break. I read no such reader.
- **Desk filing parse.** `parseGauge` rejects a whole filing when its gauge fails to parse (`app/core/parsers.ts:691-692`). A desk reply persisted before X1 stops parsing.
- **R7 changes the desk compaction wire.** Fewer summarizer calls is the intended effect (`trim-rulings.md:22`).
- **Readings, supplied and missing.**
  - Supplied: replay 108/108 at c04eea4 (`trim-rulings.md:36`), and the registry scaffold at 0.0.99 on 2026-10-10 (`compliance-rulings.md:18`).
  - Missing: any run of mine; the Driver `--dry` flag syntax; whether the desk persists filings; the contents of `compliance-audit-tests.json`.

## Tensions

The following judgment calls need a ruling from the other lane or the Orchestrator:

- **Phased ownership.** U1 owns other units' files during phase 1a only. Strict disjointness would need patches into files that aren't shared. Expected: disjoint ownership. Found: four cross-module relocations. Proposal: U1 runs alone first.
- **`amends`/`supersedes`, `quiet`, and `stale`.** I rejected these on one-concept-one-term grounds. The objective lane can hold `names.md:181` instead. If it does, the `amends` rename needs a head-literal map, plus patches to the desk, Driver, seams, and the probe.
- **Emptied R5 kind files.** `architecture.md:315` ("do not remove structural files because they are empty") and `:43` ("use only the centralized files an environment needs") pull opposite ways. I chose deletion: `AGENTS.md:31` scopes "structural" to `tsconfig.json`, `vite.config.ts`, and `types.ts`.
- **Distribution scope.** `compliance-campaign.md:12` lists `tests/distribution.test.ts` as in scope, while `:13` excludes presence-owned files, and scaffold marks this file presence-owned (`/home/user/scaffold/src/core/compilers.ts:2070-2072`). I applied the In list: a presence-owned file isn't overwritten by a visit. The template copy is referred.
- **Channel buffer and private collections.** The Channel `#buffer` and the private Set/Map fields need one copy-on-write ruling.
- **Open referrals, not resurrected.** These need an owner from the Orchestrator:
  - the false comment at `Instruction.ts:12-13` and `:29-30` (`compliance-audit.json:3868`)
  - the estimator claim at `agents/helpers.ts:127-134` (`:3772`)
  - the import cycle at `AgentProvider.ts:18` (`:4508`)
  - the corrupted arrow glyphs in `factories.test.ts` (`:4700`)
  - the checks at `agent.md:2604` and `:1879`

