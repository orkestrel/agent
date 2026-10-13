# Trim rulings for 0.0.30 (2026-10-10)

## Premise

The registry's 0.0.29 tarball (`npm pack @orkestrel/agent@0.0.29`, gitHead 2c38d00) declares no `createLedger`, and `git ls-tree 2c38d00 src/core/ledgers/` lists nothing. The desk's `node_modules/@orkestrel/agent` reports 0.0.29 but holds a locally packed port build. 0.0.30 therefore creates the ledger, selection, judgment, and thinking surfaces, and the creation gate in `AGENTS.md` § Design laws (Minimal public API) applies to each of them.

The trim audit's keep rulings K0, K2, K3, K4, K6, and K7 rest on the false premise that 0.0.29 published the ledger. They are re-ruled in the following sections.

## Consumers

The real consumers are the desk (`/home/user/desk/app`), `@orkestrel/ollama` (`/home/user/ollama/src`), and the measured live driver (`/home/user/scaffold/.orkestrel/agent/instruments/bench4/Driver.mjs`). Every one of the 112 added exports is either used by a consumer or used inside `src` (census in this session), so no export is dead. Cruft sits at the member level.

## Ruled trims (created in 0.0.30, no consumer)

- R1 `LedgerOptions.notes`: no consumer sets it; the desk reads the `LEDGER_NOTES` constant directly (`desk/app/server/AgentThread.ts:98`). The ledger uses `LEDGER_NOTES`. `LedgerNote` stays as the constant's type.
- R2 `LedgerRecallOptions.description`: no consumer sets it.
- R3 `LedgerAgentOptions` `budget`, `signal`, and `error`: no consumer sets them; narrow the `Pick` to `limit`, `timeout`, and `on`. This also dissolves the calibrate-ignores-`agent.signal` defect (K4).
- R4 `GaugeInterface.measure` and `Gauge.measure`: no caller anywhere, inside `src` included.
- R5 The stock selection handler: `createSelection` and the closure only it uses (`SelectionOptions`, `ScreenHandler`, `NEEDED_QUESTION`, `NEEDED_CRITERION`, `buildNeededQuestion`, `Applicability`, `Criterion`, `inferApplicability`, `buildConditionKey`, `parseConditionKey`, `filterSelectionMessages`, `renderSelectionState`, `SelectionError`, `isSelectionError`, and any other symbol the closure trace finds only it uses). The method it implements was measured and dropped (selection: about 60 judge questions and 5 minutes per goal); the ledger replaced it. No consumer imports it. The selection seam stays: `select` on the agent, the context, and the scope, the `Selection` class, and `SelectionHandler`, because the ledger and the desk use them.
- R6 `Scope.description` and `ScopeInput.description`, when the census confirms no consumer and no internal reader beyond the child-scope copy.

- R7 The conversation rollup, by the user's ruling of 2026-10-10: the `rollup` option on `ConversationOptions`, `ConversationManagerOptions`, and `ConversationInput`; the `summary` getter and `summary` event on the conversation; the `summary` field of `ConversationSnapshot` (the design round rules whether a 0.0.29 snapshot that carries one is refused or read without it); and the `Summary:` line of `reference()`. Compaction, sections, section summaries, the recap in `view()`, and `reference()` with its excerpts stay. The rollup never reaches the model (the view carries section recaps only), no consumer reads the getter, the event, or `reference()`, and the wire reading of 2026-10-08 found 4 of 9 summarizer calls spent on it. This removes a 0.0.29 capability; the user ruled it out of 0.0.30.

## Ruled keeps

- `think` omission semantics: the provider's `think` carries the same optional-boolean contract.
- Lookup tool metadata forwarding (K5), the defensive and error paths (K8), and the narrowing fallbacks (K9).
- `replay`, `judgments`, `call`, `thinking`, `InstructionManager.close`: each has a consumer or replaces a 0.0.29 member.

## Prose corrections carried from the trim audit

T1 (Classifier `@param requests`), T2 (seed tail stub), T3 (topic `requested`), T4 (Gauge history narration), NEW-1 (category question skips requests), NEW-2 (`LedgerTopic` Summary cell), NEW-3 (`buildRecords` history narration), NEW-4 (stray comment in `providers/errors.ts`), and the guide test-index line at `guides/agent.md:2648`.

## Proof that the measured bytes stay

No consumer sets a trimmed member, and R5 removes code the ledger never calls. Baseline at c04eea4: the recorded-wire replay (`/home/user/agent-port-gauge/tmp/probes/ledger-replay.test.ts`, copied to `tmp/probes/` with `tmp/units/f2-recall-residue-rooms.json`) passes 108 of 108. After the trims, the same command must pass 108 of 108, and `bench4/Driver.mjs --dry` must pass on copies 1 to 8 against a build of this checkout.
