# U4 (Ollama's half of the budget layers): falsify verdict

## Lane

| Lane | Engine | Transport | Report |
| --- | --- | --- | --- |
| Objective (one lane, medium) | GPT-6 Astra high (`analyst`) | T3 `delegate_task` `u4-ollama-falsify-astra-1` | `tmp/units/u4-ollama-verdict-objective-1.md`: FAIL 5, 7; outside: O1 |

The claims are `tmp/units/u4-ollama-claims.md`. The subject is Ollama `f2a94d6` plus U4, on Agent `53bfe20` and budget
`4d74195`.

## Live evidence

The live runs used a dedicated daemon on port 11435, Ollama 0.40.6. Port 11434 was untouched.

| Run | Result | Receipts and logs |
| --- | --- | --- |
| `budget.test.ts` | 9 of 9 | `tmp/units/u4-daemon/` |
| Full service suite | 79 of 80. The one failure was a stale `tev1:0.8b` | `tmp/units/u4-daemon/` |
| After the user re-pulled `tev1:0.8b` | judge 1 of 1; full suite **80 of 80** | `tmp/units/u4-daemon-2/` |

The daemon answers `done_reason: 'length'` at the `num_predict` cap, which settles design 2 § 0 item 2.

## Rulings

1. **CONFIRMED.** Projection.
2. **CONFIRMED.** The model, meter and budget layers are distinguished hermetically and live.
3. **CONFIRMED.** The contract sites.
4. **CONFIRMED.** The guide.
5. **BROKEN, reporting only.** U4's inventory of pre-existing banned sites in the files it touched missed four
   count-only recorders. Each predates U4, as the lane checked with `git grep` at `f2a94d6`. The supplemental
   inventory is below. They are left in the source under the deferral of Ollama's Bindings sweep, and no code change
   is owed in U4.
6. **CONFIRMED.** No test was weakened.
7. **BROKEN.** It follows from 5 and O1. With 5 recorded here, only O1 remains.

**O1, fixture placement: reproduced by reading.**

- **The sites.** U4 declared case matrices and shared fixture constants inline:
  - `tests/src/core/helpers.test.ts:396` and `:407`, the `extractTruncated` reason matrices;
  - `tests/src/core/integration.test.ts:329-334`, the `DELTAS` and `DONE` constants;
  - `tests/service/budget.test.ts:166-167`, the `LONG_PROMPT` and `SHORT_PROMPT` constants.
- **The rule.** Scaffold `tests.md:190` and `:194` require them in a setup file.
- **Fix.** Unit U4-F moves them into `tests/setup.ts`, unchanged in value.

## U4-F result

**Accepted** (T3 `u4-ollama-fix-sonnet-1`).

- **The moves.** These are now frozen exports in `tests/setup.ts`, each with a TSDoc block and a proof in
  `tests/setup.test.ts`:
  - `TRUNCATED_STRING_REASONS` and `TRUNCATED_INVALID_REASONS`;
  - `CANNED_STREAM_DELTAS` and `CANNED_STREAM_DONE`;
  - `LONG_ANSWER_PROMPT` and `SHORT_ANSWER_PROMPT`.
- **Counts.**
  - Focused src:core is unchanged at 89.
  - setup goes from 72 to 75 with the new proofs.
  - Each value mutation fails exactly its consumer.
- **One more consolidation.** The Orchestrator also replaced the identical inline prompt at
  `tests/service/budget.test.ts:142` with `LONG_ANSWER_PROMPT`, under `tests.md:191`. Afterwards format, lint and
  `check` all exit 0.
- **Live evidence still holds.** The live 80 of 80 ran before these moves. The moved values are byte-identical, which
  the mutation proofs and the typecheck confirm.

## The Ollama Bindings sweep (2026-10-18, now running)

The brief is `tmp/units/ollama-sweep-brief.md`, the baseline `ba171bd`. Six units run on disjoint files.

- **OS-src: accepted.**
  - **Source.** `src/core/helpers.ts`:
    - `escapeSpecialTokens`'s `let` became a `reduce`;
    - `renderJudgePrompt`'s lines are built with `map` and `Array.from`;
    - `extractTopLogprobs`'s `seen` set became a derived duplicate check;
    - `computeAnswer`'s `available` map is built from a log of readings;
    - `extractTools` is `Array.from(...).filter`.
  - **Tests.** `let caught` (two sites) and five count-only recorders were converted.
  - **Proofs.**
    - The differential probe against `ba171bd` found 0 mismatches over about 24 000 seeded cases, sparse, growing,
      getter-ordered and `uuid`-ordered inputs included. Two planted mutations each fail it.
    - Three new hole tests each fail under their mutation.
    - src:core passes 172.
- **OS-setup: accepted, with one relocation owed.**
  - **Rewrites.**
    - `buildTurns`, `fillWorkspace` and `sampleTimerSpans`: `Array.from` and `for…of` over a fixed list.
    - `setup.test.ts`'s `let spans` became a module-scope `await`.
    - Count-only recorders were converted.
    - `warmOllama` and `requireDaemonOrigin` take their `let response` through the new exported helper `fetchDaemon`,
      which is proved and arms its deadline inside its `try`.
    - `createDaemon` became the class `FixtureDaemon`, with `#` fields.
  - **Proofs.** The differential probe against `ba171bd` matched all 30 comparisons. Three mutations each fail their
    proofs, and setup passes 101.
  - **Ruled: `fetchDaemon`'s extra microtask tick.**
    - `fetchDaemon`'s async frame adds one microtask tick to `warmOllama` and `requireDaemonOrigin`.
    - It is accepted. **Try results** prescribes a helper that runs the `try` and returns its value, and any such
      wrapper adds that tick.
    - These are test-only readiness paths, not streaming paths, and their outcomes, messages and causes are identical.
  - **Owed.** `FixtureDaemon` is still declared in `tests/setupService.test.ts`, as the baseline's `createDaemon` was.
    That breaks `tests.md:195`. Its home is `tests/setupServer.ts`, so move it there once OS-server returns.
- **OS-docs: accepted, with two moves owed.**
  - **`tests/guides.test.ts`.**
    - The stream walks use `drive` from `tests/setupServer.ts`.
    - The cancel walk uses `Array.fromAsync(…).catch(…)` over a recorder that is asserted whole.
    - The 401 test's callback-fed `calls` list became `createRecordingTransport`, asserting `daemon.requests` is `[]`.
  - **`tests/distribution.test.ts`.** Seven sites became derived helpers:
    - `decodeSegment` and `computeDeclaration`;
    - `readScopeType`, a bounded recursion;
    - `collectDiagnostics`, `classifyExport(s)` and `checkResolution`.
  - **`guides/ollama.md`.** The streaming fence became `readStream` over a caller-owned delta log, so the catch arm no
    longer pushes.
  - **`README.md`.** The Orchestrator applied the unit's patch for the same fence. Both asserted lines are kept, and
    `test:guides` passes 42 of 42 with the patch.
  - **Proofs.**
    - Seven differential groups against `ba171bd` all matched, about 43 600 cases. A planted `collectDiagnostics` fault
      fails the probe.
    - Four mutations each fail their tests.
    - guides passes 42 of 42.
  - **Ruled.**
    - **`guides/ollama.md` is Ollama's own file.** It does appear in the vendored host manifest, but
      `selectHostPaths` leaves the workspace's own guide out of its host set (scaffold `src/core/helpers.ts:471-476`),
      so repair never overwrites it.
    - **The helpers stay local in `distribution.test.ts`.** Scaffold's template emits that file's helpers locally, the
      file's ownership is `presence`, and budget's, Study's and Agent's sweeps kept the same placement, with
      `decodeSegment` and `readPackageType` common to all four.
    - **Fence residuals elsewhere.** `guides/agent.md:38`'s `let step` is a vendored copy of Agent's published
      guide. Agent's own guide is already clean, and the copy refreshes when it is next vendored. The other guide hits
      belong to other packages.
  - **Owed.**
    - The inline `TURN` and `RECLASSIFIED` fixtures in `tests/guides.test.ts` move to `tests/setupServer.ts` under
      `tests.md:190` and `:194`, as O1's did. They join `FixtureDaemon`'s move after OS-server.
    - The new `distribution classifiers` test is proved by the probe only. `test:distribution` runs it at the gates.
- **OS-store: swept, two deviations sent to OS-store-F.**
  - **`tests/setupStore.ts`.**
    - `createStoreServer`'s closure collections moved into the entity `StoreActivity`.
    - `converseStore`'s per-turn state moved into `StoreCallRecord`, and its outcome now comes from `settleStoreRun`
      over a results log.
    - `findUnlistedReferences`, `extractWindowText` and `matchesJourneySequence` became `reduce`s over immutable
      carriers.
    - `findContinuedRead` became a bounded recursion over an iterator.
    - `attachThinking` and `computeRefusals` became derivations through `Array.from`.
  - **`tests/setupStore.test.ts`.** `let store` became `Promise.withResolvers`, and `let name` and `let input` became
    `buildJourneyInvocation`.
  - **Proofs.**
    - The probe compares eight subjects against `ba171bd` over about 50 000 fuzzed and scripted cases, holes
      included. All eight matched.
    - Eight mutations each fail.
    - The focused setupStore project goes from 142 to 167 tests, and `check` exits 0.
  - **Ruled.**
    - **Accepted:** `StoreCallRecord.observe` throws when a tool callback arrives after `end()`, where the baseline
      would have recorded it with stale turn state. `converseStore` cannot reach that, because `driveAgent` drains the
      event channel. Failing loudly is the safer fixture behaviour. It is listed for the falsify lanes.
    - **D1 and D2 are authorized as public setup changes.** Every caller is in the unit's two files. The work is unit
      OS-store-F (`tmp/units/os-store-f-brief.md`, T3 `os-store-f-sonnet-1`).
      - **D1.** `collectTurnThinking`'s `thoughts[last] +=` extends a record already logged, which **Lists and logs**
        forbids. The new form logs each `think` and `usage` chunk, and a pure helper derives the per-turn texts with
        `join`. The generator layer stays as it is.
      - **D2.** The concurrent provider and tool paths append to one list. Under **Per-call state**, that list
        becomes an entity created per `converseStore` call, so completion order and the intervals of rejected calls
        are kept. The `Promise.all` form is rejected, because it would reorder the intervals and drop some.
- **OS-service: accepted by typecheck, pending the live run.**
  - **The sites.** Eight of the fifteen files changed:
    - `browser.test.ts`: `Promise.withResolvers`, with a teardown that `beforeAll` returns, and an iterator for
      attempts;
    - `budget.test.ts:274-286`: `reduce` sums;
    - `lifecycle.test.ts` and `conversation.test.ts`: whole-history recorders replace the flags and the count-only
      abort and fault logs. That includes the inventory's `lifecycle.test.ts:146`, `:191`, `:224` and
      `conversation.test.ts:29`;
    - `OllamaProvider.test.ts`: `.then` pairs replace `let caught`;
    - `page.test.ts`: an append-only `reads` log tagged by `category`;
    - `authority.test.ts` and `tools.test.ts`: fresh recorders per attempt, asserted whole. Two write-only recorders
      were removed.
  - **Proofs.**
    - The lifecycle and probe-calibration loops matched `ba171bd` over scripted runs against the real Agent.
    - The probe caught one mismatch, which was fixed. A first page-producer rewrite dropped the partial reads of a
      faulted attempt, so 4 of 6 stages differed. With the append-only log, all 6 match.
    - Seven assertion mutations fail where the replaced counts passed.
    - `check`, format and lint on `tests/service` exit 0.
  - **Owed at the gates.** The stronger assertions were never run live. The dedicated 11435 daemon run settles them.
- **OS-server: accepted, with D4 sent to OS-place.**
  - **`tests/setupServer.ts`.**
    - Closure collections moved into entities: `RecordingTransport`, `OpenTransport`, `RefusingTransport`,
      `RequestLog`, `RecordingServer`, `CallCounter` and `PageObserver`. The factories stay as thin wrappers.
    - `try` results go through helpers: `fetchUpstream`, `findFileText` and `observePageAttempt`.
    - The import map is built by `flatMap` and `Object.fromEntries`, and the scripted transport reads a `values()`
      iterator.
    - The local `createUpstream` fixture moved here as `createChatUpstream`, which also avoids clashing with
      scaffold's published name.
  - **`tests/setupServer.test.ts`.** The count-only recorders now assert `toEqual([[]])`, and the `try` results became
    `.then` captures.
  - **Proofs.**
    - The probe matched `ba171bd` in 34 of 36 scenarios, including 17 for `boundPageAttempt` that compare outcome,
      cause and event order.
    - Twelve mutations each fail.
    - setupServer passes 62: the 48 existing names are unchanged and 14 tests are added.
    - setup passes 330 plus 1 skipped, src:core 172, guides 42, conformance 17, and the Orchestrator's run of policy
      119 plus 1 skipped. `check` exits 0.
  - **Rulings.**
    - **D1, accepted.** The `try` helpers add one microtask tick to `boundPageAttempt` and the recording proxy. That
      is the same ruling as `fetchDaemon`'s: the **Try results** helper always crosses that tick, and these are test
      fixture paths that stream no model output.
    - **D2, accepted.** A second open of `createOpenTransport` now errors the first stream, where the baseline
      errored the latest.
      - The baseline's last-wins needs a latest-value slot, which is banned.
      - The transport is documented as single-use, and no consumer opens it twice.
      - The first-write latch matches Study's transport, and a new test pins the contract.
    - **D3, accepted.** The scripted transport's iterator stays exhausted, so an array grown after exhaustion is not
      served. The parameter is a `ReadonlyArray`, so growing it is outside the contract.
    - **`buildImportMap` and `__proto__`, accepted by reading.** It now keeps a root named `__proto__` as an own key,
      where the baseline's assignment dropped it. That is the same ruling as Study's `__proto__` fix, and no Orkestrel
      package has that name.
    - **D4, banned.** `RequestLog.relay` hands its own `#entries` to `buildRelayRoute`. That function's route handler
      keeps the array in its closure and pushes to it after the factory has returned, which **Entity state** bans. The
      fix, unit OS-place, passes the `RequestLog` itself, so the handler appends through `add`.
    - **D5, accepted.** The fixture was moved into the setup file.
    - **`RequestLog.entries` returns a readonly-typed live array**, as the baseline's closure arrays were. That is a
      readonly view, which the immutability rule allows. It is listed for the falsify lanes.
- **OS-store-F: accepted.**
  - **D1.** `collectTurnThinking` still appends from the same single generator, now one record per `think` and
    `usage` chunk into a `StoreThought[]` log. The new `deriveTurnThinking` derives the per-turn texts with `join`.
  - **D2.** The new `StoreTimer` entity holds `#timings`, with a synchronous `record` and a copying `read`.
    `converseStore` creates one per call, and the three wrappers take it in place of the array.
  - **Proofs.**
    - 49 conversations, 9 named and 40 fuzzed, match `ba171bd` on every returned field and on the order of `timings`.
    - 5686 prefix checks of the derived texts, covering full runs, early breaks and failures at every position, find
      no mismatch. A planted fault yields 3996 mismatches, so the probe can fail.
    - Five mutations fail between 1 and 7 tests each.
    - setupStore goes from 167 to 181, and `check`, format and lint exit 0.
  - **Ruled.**
    - **The returned `timings` is a snapshot.** The baseline's live array kept growing after return, with tools still
      pending from a rejected batch.
      - The one consumer, `executeStoreTask`, reads it synchronously after the `await`, so the transcripts are
        identical.
      - A snapshot is what the immutability rule asks for: never leak a mutable internal reference.
    - **Non-string `think` content** cannot occur, because `AgentChunk` types `content` as `string`.
    - The Orchestrator scanned `setupStore.test.ts` for local fixture declarations, since OS-place excludes the file.
      The only module-scope declaration is test-registration state, the `staging` resolver.
- **OS-place: accepted** (`tmp/units/os-place-brief.md`, T3 `os-place-sonnet-1`).
  - **D4.** `buildRelayRoute(provider, log: RequestLog)` appends through `log.add(await readRequest(request))`, then
    relays, and `RequestLog.relay` passes `this`. A mutation that skips the append fails 4 tests. The relay probe
    against `ba171bd` gave equal statuses, texts and entries.
  - **The moves.**
    - `FixtureDaemon` and its types and constants went to `tests/setupServer.ts`, and its readers became
      `readLatestChat` and `readChatMessages`.
    - `TURN` and `RECLASSIFIED` became `HELLO_TURN` and `RECLASSIFIED_TURN` in `tests/setup.ts`.
    - `CONTEXT` became `TOOL_CONTEXT`.
    - Ten copies of `TIMEOUT = 60_000` became `CASE_TIMEOUT`.
    - Also moved: `DEADLINE_MS`, `SETTLE_MS`, `TINY_PNG_BASE64`, `driveScript`, `SCHEDULE_SLACK`, the three page
      constants, `SAMPLING_TABLES` and `buildRecordedRequest`. A duplicate `OBFUSCATED` was deleted.
    - Each new export carries TSDoc and a proof, and every `ba171bd` test title is kept.
  - **The near-duplicate check.** `FixtureDaemon` stays separate. It serves three routes with answers that can be
    replaced, and folding it into `createChatUpstream` would change what `setupService.test.ts` reads. The inventory
    lists everything kept local, and why.
  - **Checks.** setup passes 365 plus 1 skipped, src:core 172, conformance 17, policy 119 plus 1 skipped and guides 42.
    `check`, format and lint exit 0.
  - **The unit's own deviation: it contacted the user's daemon.**
    - A probe config that merged the `probe` project also collected the live probes under `tmp/probes/**`, from
      16:11:45 to 16:14:12.
    - That run wrote `tmp/probes/logs/cart-1.json` to `cart-16.json` and `journey-1.json`, from a live store run
      against `localhost:11434`.
- **The `setup` project contacts the user's daemon on every run. This predates the sweep.** The Orchestrator
  reproduced it 2026-10-18.
  - **The cause.**
    - `tests/setupStore.ts:63` imports `PAGE_BROWSER_ARGS` and `requirePageBrowser` from `tests/setupService.ts`.
    - At module load, `setupService.ts` runs `isOllamaReady()` and `warmOllama()`. Those are a `GET /api/tags` and a
      one-token `POST /api/chat` with `keep_alive: '30m'`, against `OLLAMA_HOST`, which defaults to
      `http://localhost:11434`.
    - The `setup` project sets `isolate: false`. So unless `setupService.test.ts`'s fixture host happens to load first,
      every `setup` run, and every `npm test`, reaches the user's daemon and loads the model for 30 minutes.
    - The import exists at `f2a94d6` and at `ba171bd`.
  - **The reproduction.** With `OLLAMA_HOST=http://127.0.0.1:1`, `setupStore.test.ts` alone fails at import with
    "Ollama service tests require qwen3.5:2b-q4_K_M at http://127.0.0.1:1". The log is `tmp/units/os-hermetic-repro.log`.
  - **The evidence on the host**, read from OS state only and without contacting the daemon:
    - the user's daemon spawned a `llama-server` runner at 16:17:24, during OS-place's final `setup` run;
    - two `TimeWait` sockets to 11434 were still open at 16:19.
  - **The reach.** Every `setup` and `npm test` run in Ollama on this host contacted 11434, including:
    - U4's gates;
    - each sweep builder's focused `setup` runs.
  - **Agent and Study are hermetic.** Wherever they name 11434, they inject a fetch fixture. Study's
    `STUDY_OLLAMA_ORIGIN` is documented as "an origin no fixture contacts".
  - **The fix: unit OS-hermetic** (`tmp/units/os-hermetic-brief.md`, T3 `os-hermetic-sonnet-1`).
    - Move `PAGE_BROWSER_ARGS`, `requirePageBrowser` and `requireBuild` into `tests/setupServer.ts`.
    - Correct the `setupService.ts` section comment that claims it is importable in `setup`.
    - Add a structural proof that no non-service file imports `setupService.js`, which the fixture-hosted
      `setupService.test.ts` is exempt from.
    - Add the runtime proof: the `setup` project passes with `OLLAMA_HOST` unreachable.
  - **The standing guard from now on.** Every non-service Ollama command runs with
    `OLLAMA_HOST=http://127.0.0.1:1`, so anything that still reaches for a daemon fails instead of touching 11434.
  - **OS-hermetic also takes OS-place's leftovers:**
    - the scenario builder for the repeated `OllamaProvider.test.ts` steps (`tests.md:197`);
    - the `60_000` literals in `setupStore.test.ts`;
    - rulings on the `.at(-1)` reads OS-place flagged.
- **OS-hermetic: accepted.**
  - **The fix.** `PAGE_BROWSER_ARGS`, `requirePageBrowser` and `requireBuild` moved byte-identical into
    `tests/setupServer.ts`, with their proofs. `setupStore.ts` and `service/page.test.ts` import them from there, and
    the `setupService.ts` section comment now states that the module contacts the daemon at load.
  - **The regression proof** is `tests/setupServer.test.ts`, under `the hermetic projects`.
    - It builds every non-service project's file population from `vite.config.ts` and parses each file with Vite's
      `parseAst`, so static, type-only, re-export and dynamic imports all count.
    - It asserts that the only importer of `setupService.js` is the fixture-hosted `setupService.test.ts`.
    - Reintroducing the import statically, in `setupStore.ts`, or dynamically, in a `src:core` test, fails it, and the
      failure names the file.
  - **The runtime proof** runs with `OLLAMA_HOST=http://127.0.0.1:1`. Before the fix, `setupStore.test.ts` failed at
    import. After it, `setup` passes 382 plus 1 skipped.
  - **The host evidence.** No new `llama-server` runner was spawned under the user's daemon after 16:17:24, and no
    socket to 11434 was open at 16:36.
  - **The leftovers.**
    - `captureProviderRequest` carries 29 `OllamaProvider.test.ts` cases, with titles, inputs and assertions
      unchanged.
      - Removing its request wait fails all 29.
      - An abort that never fires fails its own proof.
      - Three tests that do not follow the abort-once-recorded flow were left as they were.
    - The four `60_000` literals became `CASE_TIMEOUT`.
    - All five `.at(-1)` reads were ruled lawful, each on a list that is also read by content.
  - **Checks**, all guarded: setup 382, src:core 172, conformance 17, policy 119, guides 42; `check`, format and lint
    exit 0.
  - **Two outside edits, accepted.** It corrected two `guides/ollama.md` sentences that the move made false. The
    `guides/browser.md:3656` sentence it flagged describes the browser package's own test, so it needs nothing.
  - **Open, for the falsify lanes.** `tests/src/core/integration.test.ts` holds 9 `waitForRequest` calls and
    `factories.test.ts` 1. The builder may fit them.
- **Gates: green, except discovery, which needs a daemon.** A guarded Haiku verifier ran them, with logs at
  `tmp/units/ollama-sweep-verify-*.txt`.
  - **Exit 0:** `format:check`, `lint:check`, `check` and `build`.
  - **`npm test`:**

    | Project | Passed | Skipped |
    | --- | --- | --- |
    | src:core | 172 | |
    | setup | 383 | |
    | policy | 119 | 1 |
    | config | 227 | 1 |
    | guides | 42 | |
    | conformance | 17 | |

  - **`test:distribution`:** 10.
  - **The daemon was not touched.** Its state is identical before and after, read from OS state only: the one
    `llama-server` runner from 16:17:24, and no socket to 11434.
  - **Discovery exits 2, because the guard stops it.**
    - Its first, full `vitest list` collects the `probe` project and `service`.
    - `probe` holds `tmp/probes/wire-dump.test.ts` and `store-live.test.ts`, which import `setupService.ts`.
      `store-live.test.ts` is the live instrument of the open campaign `.orkestrel/agent/lifecycle/reading/small/`,
      with rows V5 and V6 queued, so it is series-read and stays.
    - `service` lists `setupService.ts` in its `setupFiles`, and `vitest list` evaluates them at collection.
    - So discovery in Ollama reaches `OLLAMA_HOST` even in a clean checkout. Unguarded, that is the user's 11434.
    - `--projects` does not avoid it, because the first listing is full.
    - **Settled by:** running discovery during the live window with `OLLAMA_HOST=http://127.0.0.1:11435`, the
      dedicated daemon.
  - **Queued: the collection-time contact.**
    - **Ollama's side.** Move the `setupService.ts` readiness gate and its warm-up from module load into a `beforeAll`
      that its setup file registers. Collection and `vitest list` would then need no daemon. A failed gate would then
      fail each test rather than the import, so the user rules on it.
    - **Scaffold's side.** `orkestrel-harden`'s discovery could document that collection evaluates `setupFiles`.
- **The live run passes 80 of 80.** It ran on a dedicated daemon on 11435: PID 5192, Ollama 0.40.6,
  `qwen3.5:2b-q4_K_M`.
  - The receipts are `tmp/units/os-daemon/daemon-start.json` and `daemon-stop.json`, and the log is
    `service-full.log`.
  - 15 files pass in 201 s, including OS-service's stronger whole-history assertions.
  - The compaction case "dependent lookups" logged one designed `retryUntil` retry and passed on it, as at U4.
  - **Discovery against the dedicated daemon exits 0:** service 80, setup 383, src:core 172, config 227, policy 119,
    guides 42, conformance 17, distribution 10, probe 4. The log is `tmp/units/os-daemon/discovery.log`.
  - **The stop.** The daemon was stopped by its recorded PID, with its 2 runner children. 11435 is free afterwards,
    and the user's daemon processes are unchanged.
- **Falsify.** Claims: `tmp/units/ollama-sweep-claims.md`. Lane brief:
  `tmp/units/ollama-sweep-falsify-brief.md`.
  - **Objective lane: FAIL 2, 3, 4, 5, 7, 8, 9, 10.** Astra xhigh, T3 `ollama-sweep-falsify-astra-1`. Verdict:
    `tmp/units/ollama-sweep-verdict-objective-1.md`.
    - **Held:** claim 1 (Bindings) and claim 6 (the live run).
    - **2, `extractTools`** (`src/core/helpers.ts:438`). `Array.from` falls back to array-like access when
      `Symbol.iterator` is removed, so it returns a call where the baseline's `for…of` threw `TypeError`.
    - **3, setup differences that were never ruled:**
      - `attachThinking` (`setupStore.ts:1163`) re-reads earlier `role` getters, so a getter that changes over time
        moves the thought.
      - `findUnlistedReferences` (`:1603`) takes a snapshot before processing, so an index getter that mutates an
        earlier element changes the result.
      - `continueRead` (`:1956`) recurses once per call and throws `RangeError` at 20 000 calls, where the baseline
        returns `undefined`.
    - **4, the documented stream.** The README and guide `readStream` helper adds a suspension after the terminal
      `next()`. The baseline order is tick-1, tick-2, settled, tick-3. The sweep's is tick-1, tick-2, tick-3, settled.
    - **5 and 8, the fence guard.** `guides.test.ts` runs `drive`, not the documented loop, and checks the fences by
      substring. A fence mutated to `.map(() => 'wrong')` passes every assertion.
    - **7, placement.**
      - Local case matrices remain in `setupServer.test.ts`, at `:2064`, `:2092` and `:2196`.
      - The ruling that keeps `distribution.test.ts`'s helpers local is contested: precedents are not rule-text
        exceptions.
      - `integration.test.ts` repeats a single-request scenario, at `:684` against `:739`.
    - **10, the hermeticity proof.**
      - It reads direct imports only, so a chain from `tests/setupBridge.ts` through `src/bridge.ts` into
        `setupService` passes.
      - The `import('…')` type form and a template-literal `import()` return no specifier.
      - A bare `fetch` to `OLLAMA_HOST` is outside its reach.
    - **9** follows from the rest.
    - **ADVISORY.** `computeRefusals` and `attachThinking` do quadratic work.
  - **Reproductions.** Native Workflow `wf_5ca72aa3-030` ran them, with one Sonnet agent per finding, under the guard
    and with no daemon contacted. Every finding reproduced, and most are wider than stated.
    - **o2: reproduced.**
      - With `Symbol.iterator` set to `undefined` or `null`, `extractTools` returns the call where the baseline threw.
      - **The same class in `renderJudgePrompt`'s score form.** A criteria array whose `map` species result has no
        iterator renders there, where the baseline threw `entries is not iterable`.
      - **Cost.** `computeAnswer` takes 10 523 ms at 20 000 unique tokens, against the baseline's 3.4 ms. Its
        duplicate check is now `includes` per entry, which is quadratic. The daemon asks for 20, so this is a cost
        regression in `src`, not a correctness one.
    - **o3: reproduced, and wider.**
      - **The three named sites:**
        - `attachThinking` gives `["one","one"]` against `["one","two"]`;
        - `findUnlistedReferences` reports a click the baseline does not;
        - `findContinuedRead` throws `RangeError` from 5 000 calls up.
      - **The same class at three more sites:**
        - `computeRefusals` reads ahead: 1 against 2, and 18 name reads against 6;
        - `collectTurnThinking` and `deriveTurnThinking` read `content` late, so a chunk that a consumer mutates
          derives `["z"]` against `["a"]`;
        - `findModuleSpecifiers` recurses once per syntax-tree level, and throws `RangeError` by depth 3 000.
    - **o4: reproduced** for both fences. The consumer resumes exactly one microtask later at 0, 1 and 2 deltas. The
      spacing between deltas is unchanged.
    - **o5 and o8: reproduced, and wider.**
      - Every fence assertion accepts a fence mutated to `.map(() => 'wrong')` or to the thinking channel.
      - Nothing asserts the guide's `catch` arm (`error.partial.content`).
      - At the baseline, two cases executed a hand-copied loop. The sweep replaced that copy with `drive`. Neither
        version bound the fence text.
    - **o10: reproduced.**
      - **The direct-import misses.** A transitive chain through `src/`, the `import('…')` type form and a
        template-literal `import()` are all missed. So are `import = require()`, `require()`,
        `new URL(…, import.meta.url)` and `import.meta.glob`.
      - **The project table** omits `probe`.
      - **The real graph is hermetic today.** Walked with a broader collector, every non-service project reaches
        `setupService.ts` only through the allowed `setupService.test.ts`. The gap is in the proof's reach, not an
        existing breach.
    - **o7: reproduced, and wider.**
      - **(a)** There are more local tables in `setupServer.test.ts`: `witnesses` at `:2214`, `refused` at `:1976`,
        and `DONE` at `:313`, which is new in the sweep.
      - **(b)** There is no exception in the rule text or the template, and scaffold's own `distribution.test.ts`
        imports from `./setupServer.js`.
        - The template emits only `isPackageTarget`, `resolvePackageTarget`, `resolveTarget` and `readPackageType`.
        - Seven helpers are Ollama's own additions. Six of them (`computeDeclaration`, `readScopeType`,
          `collectDiagnostics`, `classifyExport`, `classifyExports` and `checkResolution`) exist in no sibling.
        - `guides/scaffold.md:1702-1712` places a presence-owned file under the workspace's laws once it is written.
      - **(c)** 16 single-request scenarios repeat in `integration.test.ts`, plus `:895`, which waits for two requests.
        They predate the sweep.
        - `captureProviderRequest` would add an abort the originals do not issue, so a sibling helper with an optional
          abort is needed.
        - `factories.test.ts` holds 3 more.
  - **The `distribution.test.ts` ruling is reversed.** The OS-docs ruling that kept its helpers local rested on the
    template and the siblings. The reproduction shows the template covers four of Ollama's helpers and none of the six
    new ones, and that the scaffold guide places the file under the workspace's laws.
    - **Ollama.** Its reusable `distribution.test.ts` helpers move to `tests/setupServer.ts`, as scaffold's own gate
      does.
    - **Owed elsewhere.** The same move is owed in budget, Study and Agent, whose accepted sweeps kept `decodeSegment`
      and `readPackageType` local. Scaffold's template also emits its four helpers locally, while scaffold's own gate
      imports them, which is a scaffold queue item.
  - **Subjective lane: FAIL 3, 4, 5, 7, 8, 9, 10; outside the claims: O1.** Native Workflow `wf_50ab4b16-3c4`,
    with three Opus lenses and a synthesizer. Verdict: `tmp/units/ollama-sweep-verdict-subjective-1.md`.
    - **Held: claims 1, 2 and 6.** A 20 000-case `src` differential came out byte-identical. The live log covers the
      final tree, and the daemon log shows 181 real `/api/chat` calls on 11435.
    - **O1.** The sweep broke the open campaign's live probes, `tmp/probes/store-live.test.ts` and `wire-dump.test.ts`.
      They import the helpers OS-hermetic moved, so `tsc` reports four new `TS2305` errors. `tmp/` is ignored, so the
      repository search missed them.
    - **3.** These differences were never ruled:
      - `FixtureDaemon.url` throws after `stop()`;
      - its histories are copies;
      - its `stop` lost the `running` guard;
      - the factories return class instances where they returned plain objects.
    - **4.** The proxy does relay live streams. So the stated reason of the D1 ruling, "stream no model output", is
      wrong, though the tick lands before the response head. The fence's `readStream` adds a consumer-side tick.
    - **5.**
      - `FixtureDaemon`'s copies proof checks only `calls`.
      - No test asserts `converseStore`'s `timings`, `usages` or `partial`, and four planted mutations kept setupStore
        at 181.
      - The fence transcription was lost.
    - **7.**
      - `STORE_SEARCH_SEED` is unexported.
      - Local `HEAVY_TIMEOUT`, `OPERATIONS`, `forms` and `unrelated` remain.
      - `reservePort` duplicates `createLoopback` from `@orkestrel/test/server`.
      - `isPositiveInteger` reimplements contract's `isInteger`.
      - The integration scenario repeats.
      - **Disagreement.** This lane held the `distribution.test.ts` ruling. The objective lane's reproduction
        overturns it on evidence, and the reversal stands.
    - **8.** The guide fence fails `noUnusedLocals` (`reasoning`), and nothing executes the fences.
    - **10.** A hermetic project that lists `setupService.ts` in its `setupFiles` passes the proof, and so does a hop
      through a module outside the population.
    - **Advisory.**
      - A1, quadratic duplicates.
      - A2, the hermetic proof asserts workspace facts in a setup proof.
      - A3, a default URL bypasses the guard.
      - A4, the retry predicates are looser than the exact assertions.
  - **Rulings corrected.**
    - **D1, OS-server's microtask tick.** The reason "stream no model output" is withdrawn. The proxy relays live model
      streams. The ruling stands on narrower grounds: the tick lands before the response head, and no model-output
      chunk is added, removed or reordered.
    - **Claim 3's "no other difference".** The `FixtureDaemon` copies and the class-instance shape of the factories
      are ruled unreachable: no in-repository caller spreads, serializes or holds a fixture across calls. The `url`
      after `stop`, and the explicit idempotent `stop`, are fixed in OS-F-server.
    - **Claim 4's wording** narrows to: no change to the order, count or backpressure of model-output chunks.
      Response-head and consumer-side ticks are ruled. The fence's extra tick is removed in OS-F-server.
    - **A2.** The real-tree hermeticity assertion stays in `tests/setupServer.test.ts`, as the proof that the exported
      walker reports the real workspace. `config.test.ts` and `policy.test.ts` are vendored, so no package-owned home
      exists for a workspace law. Where one should live goes to the scaffold queue.
- **OS-F-src: accepted. Item 2 is ruled advisory.**
  - **Item 1.** `extractTools` and `renderJudgePrompt`'s score form hand `Array.from` an iterable that forwards only the
    iterator protocol (`{ [Symbol.iterator]() { return calls[Symbol.iterator]() } }`). A missing or `null` iterator
    therefore throws `TypeError` again, and the mapping stays interleaved and lazy.
    - **Differential.** 32 rows against `ba171bd` match on outcome and effect log.
    - **Message-only rows.** For a missing iterator the message reads `x[Symbol.iterator] is not a function` instead of
      `x is not iterable`. The throwing expression differs, which the contract allows.
    - **Mutations.** Four each fail exactly their named test.
    - **Checks.** src:core passes 179.
  - **Item 2, stopped.** A lazy O(n) duplicate check needs a per-call entity class: a new `src/core` file, a `types.ts`
    interface, a barrel or `INTERNAL` entry, and a mirrored test. All of that is outside the unit's files, and all of
    it touches published `src`.
    - **Cost.** At 20 000 tokens, `computeAnswer` takes 1855 ms and `extractTopLogprobs` 1009 ms, against the
      baseline's 3.4 ms and 4.3 ms. A throwaway entity prototype took 5.1 ms.
  - **Ruled: accepted as advisory.**
    - Both falsify lanes class A1 as ADVISORY, and the falsify skill keeps advisory findings out of the verdict.
    - The input is bounded in practice: the daemon is asked for `TOP_LOGPROBS = 20`, so the worst case is about 400
      comparisons.
    - A new class in published `src` for an input nobody sends is not proportionate.
    - The semantics that matter are pinned by new tests: the first duplicate is refused before any later entry is
      read, and `NaN`, `-0` against `0`, and object identity are each kept.
    - The cost is recorded here as known.
- **OS-F-store: accepted, with one follow-up.**
  - **The sites.** Each now keeps its state in a per-call entity, driven by `for…of` with no snapshot:
    - `attachThinking` → `StoreThinking`;
    - `findUnlistedReferences` → `StoreExposureTrace`, a line-for-line port of the baseline loop;
    - `computeRefusals` → `StoreRefusals`, linear again;
    - `findContinuedRead` → `StoreContinuationWalk`, iterative with an early return, and it closes the iterator.
  - **Also done.**
    - `STORE_SEARCH_SEED` is exported and pinned.
    - A new `converseStore` proof asserts five timings, three usages and the partial flags.
    - The sweep-only exports `advanceExposure`, `continueRead` and `StoreContinuation` are removed. They were new in
      the sweep, so this hides nothing.
  - **Proofs.**
    - **Differential.** About 13 000 seeded runs against `ba171bd` match on result and on a full getter-read trace,
      holes included, with the targeted cases.
    - **An unnamed regression, closed.** The sweep's `advanceExposure` took 15 325 ms at 20 000 calls. It now takes
      28 ms, against the baseline's 37 ms.
    - **Mutations.** Ten each fail.
    - **Checks.** setupStore passes 197, and format, lint and `check` exit 0.
  - **Its deviation 2 is in contract.** `collectTurnThinking` logs `{ ...chunk }`, which reads every own property of a
    chunk, where the baseline read `category` and `content` only. **OS-F-store-2** (T3 `ollama-fix-store2-sonnet-1`)
    narrows the log to `{ category, content }` records with the baseline's read count, and adds a read-trace proof.
- **OS-F-store-2: accepted.**
  - **The change.** `collectTurnThinking` logs `{ category: 'think', content }` and `{ category: 'usage' }` behind the
    baseline's two-branch check, and `StoreThought` is narrowed to that union.
  - **The read-trace proof** pins the baseline's exact reads: `category` and `content` for a think chunk, and
    `category` twice for any other. Reintroducing `{ ...chunk }` gives 13 reads against 8, and the proof fails.
  - **A new helper, `buildTracedRecord`, accepted.** It turns every own property into a reporting getter. That is
    distinct from `buildWatched`, which copies a getter's value at build time, and it has its own proofs.
  - **Checks.** setupStore passes 200. `check` still fails, but only in OS-F-server's in-flight
    `setupServer.test.ts`.
- **OS-F-server: accepted.**
  - **O1, the live probes.** `store-live.test.ts` and `wire-dump.test.ts` import the moved helpers from
    `setupServer.js`, and nothing else in them changed. `tsc -p tmp/probes/tsconfig.json` drops from 9 errors to the
    5 that predate the sweep.
  - **The hermetic walker.**
    - `collectModuleClosure` follows relative, directory, extensionless and alias specifiers to a fixed point.
    - `findModuleSpecifiers` reports eight forms (import, export, dynamic or template, type, assign, require, url and
      glob) through a worklist with no recursion. It passes at depth 10 000.
    - `findServiceSetupFiles` checks the projects' `setupFiles`, and the project list is derived from `vite.config.ts`.
    - The mutations fail, including a transitive hop through a module outside the population (1 of 171 fails) and a
      recursive walk (`RangeError`).
  - **`FixtureDaemon`.** It captures `#url` at `start` and has an idempotent `stop`. Its copies proof now covers `calls`,
    `chats` and `preflights`.
  - **Placement.**
    - The matrices moved into `setupServer.ts`: `forms`, `unrelated`, the project table, `witnesses`, `refused`, `DONE`
      and the three driven fixtures.
    - `HEAVY_TIMEOUT` and `PAGE_OPERATIONS` moved to setup files.
    - All 54 distribution helpers moved, parameterized, with proofs, and `distribution.test.ts` keeps only its stage
      constants and registrations.
    - `isPositiveInteger` is now `isInteger(value) && value > 0`, with 0 mismatches over 31 inputs.
  - **The scenario builder.** `captureScenarioRequest(options, issue, settle)` never aborts. It carries the 16
    single-request integration scenarios (9 settled, 7 not) and one test in `factories`.
  - **The fences.**
    - The guide and README keep the stream loop in the consumer: the baseline fence resumes at microtask depth 4, the
      new one at 4, and the extracted helper did at 5.
    - The guide reads `reasoning`, and `tsc` over the fences exits 0.
    - The transcriptions in `guides.test.ts` execute over `HELLO_TURN`, `RECLASSIFIED_TURN` and a cancelled open
      transport, under a guard that compares code with whitespace stripped.
    - Every fence and transcription mutation fails.
  - **Live predicates.** The `retryUntil` predicates in `conversation.test.ts` and `lifecycle.test.ts` match their exact
    assertions.
  - **Checks.** setup passes 481 plus 1 skipped, src:core 179, conformance 17, policy 119 and guides 44. `check`,
    `lint:check` and `format:check` exit 0 on the whole tree.
  - **Ruled.**
    - **`reservePort` is kept, and accepted.** Its body now composes the installed `createLoopback` instead of
      reimplementing it. Its job, returning a released free port, is not one the installed surface offers.
    - **The optional `drained` hook on `createOpenTransport` is accepted.** Executing the cancelled fence byte for byte
      needs it, and a mutation of it fails.
    - **The fix to `runNpm`'s `NPM_CONFIG_CACHE` case variants is accepted.** It is a real bug fix.
    - **Titles.** The renamed and removed titles were all new in the sweep. No `ba171bd` title is lost.
    - **The setup stage proofs.** They run `npm pack` and `npm install` in scratch directories against a loopback
      registry that answers only `ping`, with a dependency-free fixture package. They are offline, and they touch no
      workspace `node_modules`.
    - **One `Out-File` slip,** a debug probe, since deleted.
- **Gates after OS-F: green.** The run was guarded, with logs at `tmp/units/ollama-fix-verify-*.txt`.
  - **Exit 0:** `format:check` (93 files), `lint:check`, `check` and `build`.
  - **`npm test`:**

    | Project | Passed | Skipped |
    | --- | --- | --- |
    | src:core | 179 | |
    | setup | 482 | |
    | policy | 119 | 1 |
    | config | 227 | 1 |
    | guides | 44 | |
    | conformance | 17 | |

    The setup project takes 22 s, because it spawns `npm pack` and `npm install`.
  - **`test:distribution`:** 8.
  - **The probes' `tsc`:** exactly the 5 errors that predate the sweep, `format` and `body`, and no `TS2305`.
  - **The daemon.** No `llama-server` and no 11434 socket, before or after.
- **One baseline test was lost, and OS-F-dist restores it.** `distribution: 8` was below U4's 9.
  - **The check.** The new UTF-8 title diff, `tmp/units/title-diff.mjs`, covers 895 `ba171bd` titles. The baseline
    `describe('distribution classifiers')` › "classifies synthetic export mappings without a registry stage" is gone
    from every file.
  - **The cause.** OS-F-server turned that test into per-helper proofs and reported the block as new in the sweep,
    which the baseline contradicts. Its "no `ba171bd` title is lost" was therefore wrong.
  - **False positives.** The diff's three guides titles are in `tests/setup.ts:514-530`, as `STREAM_FENCE_CASES`
    titles registered by `it(scenario.title)`, so they are kept.
  - **The fix.** OS-F-dist (T3 `ollama-fix-dist-sonnet-1`) restores the block with its exact titles and baseline
    assertions, importing the moved helpers.
  - **For the falsify lanes.** The title diff is the check to run on any later claim that no title was lost.
- **OS-F-dist: accepted.**
  - **The restore.** The `distribution classifiers` block is back in `tests/distribution.test.ts`, with its exact
    titles and every baseline assertion: six `resolvesBrowser` keys and five `resolvesCommonJS` keys. It imports the
    moved helpers.
  - **The fixture.** It now comes from `createScratch({ files: CLASSIFIER_FILES })`, a temp directory of its own. The
    baseline wrote it into the shared `SCRATCH` directory.
  - **Proof.** A planted wrong value fails the test.
  - **Checks.** The title diff lists only the three false positives, and `check` exits 0. Distribution goes back to 9.
- **The live run after OS-F passes 80 of 80,** in 191.79 s, on a dedicated daemon on 11435: PID 44204, Ollama 0.40.6.
  - The receipts are `tmp/units/os-daemon-2/daemon-start.json` and `daemon-stop.json`, and the log is
    `service-full.log`.
  - The compaction case "dependent lookups" logged one designed `retryUntil` retry, as in earlier runs.
  - **Discovery against the same daemon exits 0:** config 227, conformance 17, distribution 9, guides 44, policy 119,
    probe 4, service 80, setup 482, src:core 179.
  - **The stop.** The daemon was stopped by its recorded PID, with its 2 runners. 11435 is free afterwards, and the
    user's daemon processes are unchanged, its earlier runner having unloaded on its own.
- **Successor falsify round 2 is running.** Claims: `tmp/units/ollama-sweep-2-claims.md`. Brief:
  `tmp/units/ollama-sweep-2-falsify-brief.md`. Judged against the stated equivalence contract.
  - **Objective:** Astra xhigh, T3 `ollama-sweep-2-falsify-astra-1`.
  - **Subjective:** native Workflow `wf_04d77175-c35`, with three Opus lenses and a synthesizer.
  - **Objective lane round 2: FAIL 1, 3, 5, 7, 8, 9, 10.** Verdict: `tmp/units/ollama-sweep-2-verdict-objective-1.md`.
    - **Held:**
      - claim 2, `src` equivalence, across iterators, holes, `return()` and duplicate laziness;
      - claim 4, stream timing, identical at 0, 1 and 2 deltas;
      - claim 6, the live run, with the aligned predicates.
    - **Closed from round 1:**
      - the store witnesses;
      - `FixtureDaemon`'s url and stop;
      - the copies proof;
      - the `converseStore` timings, usages and partial proof;
      - the titles, where the title diff finds only the three false positives;
      - O1, where the probes show a zero `tsc` delta;
      - the literal transitive, type and template import forms;
      - the derived project list.
    - **New, narrow findings:**
      - **1.** The fix round added count-only recorders: `helpers.test.ts:206` and `:324`, and `setupStore.test.ts:1270`
        and `:1904`.
      - **3.** `createScriptedTransport`'s `values().next()` advances before the element read. After a throwing
        element, the next call serves the next message, where the baseline threw again. A throwing element is inside
        the contract.
      - **5.** The guard gaps of 8 and 9, plus a missing conversation-level assertion of the thinking `attachThinking`
        returns.
      - **7.** A local `repeated` case matrix at `helpers.test.ts:344`, and the duplicated lifecycle of
        `captureProviderRequest` and `captureScenarioRequest`.
      - **8.** `containsCode` also strips whitespace inside string literals, so the guard accepts `join('')` turned
        into `join(' ')`.
      - **9.**
        - A scalar `setupFiles` string escapes `findServiceSetupFiles` and `listProjectSources`, and its proof expects
          that.
        - A computed `import('./' + 'x')` is silently ignored.
    - **ADVISORY A1** stands: the duplicate detection is quadratic, and its bound depends on the caller.
  - **Reproductions:** native Workflow `wf_6d287199-478`, four Sonnet agents. All reproduced except the `attachThinking`
    half of claim 5.
    - **r1: reproduced, exact.** The four recorders are read only through `.count`. A probe over every `createRecorder`
      declaration finds no others. Its control flags the baseline's 14, all converted except these four.
    - **r7a: reproduced, and wider.** Beyond `repeated` at `helpers.test.ts:344`, the diff adds:
      - iterated matrices at `setupStore.test.ts:2581` and `helpers.test.ts:681`;
      - the `exported` pair table at `setupService.test.ts:285`;
      - about 15 parallel input-and-expected literal tables in the new `setupServer.test.ts` proofs (`:1968`, `:2180`,
        `:2265`, `:2742-2767`, `:2816`, `:2897`, `:2910-2937`, `:2955`, `:3001-3093` and others).
    - **r7b: reproduced, exact.** The span shared by `captureProviderRequest` and `captureScenarioRequest` is line for
      line: proxy, `try`, provider, catch, wait, first request, `finally`.
    - **r3: reproduced.** On the baseline, both calls throw `RangeError`. On the worktree, the first call throws and the
      next serves "second". It is the only cursor of its class in the diff.
    - **r8: reproduced, and wider.** The blanket `\s+` stripping in `containsCode` (`setup.ts:565`) accepts every edit
      of whitespace inside a literal in both fences. It also accepts a newline merged into a `//` comment, which
      comments out the next `console.log` in the transcription. Its proof has neither control.
    - **r9: both reproduced.** A scalar `setupFiles` gives `[]` where the array form is caught. A computed `import()`
      reports nothing.
    - **r5's `attachThinking` half: not reproduced as a gap.** The installed Agent 0.0.30 already records thinking on
      the assistant messages it appends. Dropping `attachThinking` is therefore observationally equivalent, so no
      conversation-level assertion can catch it.
  - **Subjective lane round 2: FAIL 1, 3, 5, 7, 8, 9, 10.** Native Workflow `wf_04d77175-c35`, three Opus lenses and a
    synthesizer that reproduced every BROKEN finding. Verdict: `tmp/units/ollama-sweep-2-verdict-subjective-1.md`.
    - **It agrees with the objective lane** on 1, 3a (the cursor), 5, 7b and 7c, 8 and 9.
    - **Held:**
      - claim 2, over about 50 000 differential cases;
      - claim 4: 35 against 35 ticks, 17 against 17, and 400 cancelled runs;
      - claim 6: 182 real `/api/chat` calls;
      - the round-1 closures, verified over 71 000 and 30 500 seeded rows.
    - **New:**
      - **3b.** `readScopeType` recurses once per directory segment, and throws `RangeError` from about 9 000 segments
        up, where the baseline looped.
      - **3c.** `writeConsumerProbe`'s `Array.from(specifiers)` consumes `Symbol.iterator`, where the baseline read
        `entries()`, so a replaced iterator changes the output.
      - **5a, a weaker assertion.** The baseline transcription asserted the delta boundaries and the whole settled
        result `{ content, thinking, usage }`. The sweep's transcription asserts only the logged values.
      - **5b.** Iterator `return()` in `extractTools` and `renderJudgePrompt` is unproved. A forwarder that drops
        `return()` survives.
      - **5c.** The duplicate check is proved only on adjacent duplicates. `result.at(-1)?.token` survives.
      - **7a.** `FAULT` and `CAPITAL` are reused in `page.test.ts`, and `SESSION` needs a factory.
    - **Advisory, folded into OS-G:**
      - A1, `readFenceRegion` returns `''` under a `read*` name;
      - A3, `DONE_RECORD` is spelled out three more times, and `SCENARIO_OPTIONS` repeats `FAST_OPTIONS`;
      - A4, the `createOllama (defaults)` test no longer calls `createOllama`;
      - A5, the fence guard does not bind the lines above its anchor;
      - A6, `globalSetup` is not checked;
      - A7, five surviving mutants.
    - **Advisory, left:**
      - A2, ten setup classes have no `{Entity}Interface`;
      - A8, the title diff matches by substring;
      - A9, the retry predicates are looser in `tools` and `authority`, as they were at baseline;
      - A10, the cost, which is not reachable;
      - A11, `requireStage` is covered only through its consumers.
  - **Fix round OS-G** (`tmp/units/ollama-fix-g-brief.md`). Every item is written failing first, and for the findings
    only the subjective lane reported, that failing test is the Orchestrator's independent reproduction.
    - **OS-G-store** (T3 `ollama-fix-g-store-sonnet-1`): its two recorders, its matrix, and two surviving mutants.
    - **OS-G-main** (T3 `ollama-fix-g-main-sonnet-1`):
      - the recorders;
      - 3a, 3b and 3c;
      - 5a, 5b and 5c;
      - the placement items: the matrices, `FAULT`, `CAPITAL` and `SESSION`, one `captureRequest` that calls
        `createOllama`, and the constants;
      - the fence guard over the whole fence, with six controls;
      - the scalar `setupFiles` and `globalSetup`;
      - computed imports refused;
      - two surviving mutants.
  - **OS-G-store: accepted.**
    - **The recorders.** `closed` now asserts `calls` toEqual `[[]]`, and `reads` asserts its full per-call log.
    - **The matrix.** It is now the exported `STORE_CONTINUATION_INTERRUPTIONS` in `tests/setupStore.ts`, registered
      through `it.each`, with a proof.
    - **The surviving mutants.** A new silent-turn thinking test and strict `end > start` timing assertions, plus a test
      that spans the real delays.
    - **Reproduction by mutant.** These are proof gaps, not behaviour defects, so no test fails on the unmutated tree.
      Each new assertion fails its named mutant instead: `name` read once, the page clear removed, a silent turn
      skipped, and `end: start` at each of the three recording sites.
    - **Checks.** setupStore passes 205, and `check`, format and lint exit 0.
    - **Flake risk, watched at the gates.** `end > start` is strict even for the 0 ms staggered tool. Node's
      `performance.now()` is sub-millisecond and the call crosses async hops, so it is expected to hold.
  - **OS-G-main: accepted.** Every item was written failing first.
    - **3a.** A `ScriptCursor` entity with an interface reads `messages[served]`, then increments. 7 scripts × 6 calls
      are identical to `ba171bd`, and the old iterator form differs on the 4 throwing scripts.
    - **3b.** `ScopeWalk` is iterative, with 94 cases identical to the baseline. It is proved under a frame budget
      (3 000 segments with 300 frames left), because a vitest worker survives 40 000 frames, which would hide a
      recursion. A one-off run at 20 000 segments passed.
    - **3c.** `writeConsumerProbe` reads `entries()` again, with 7 lists identical to the baseline.
    - **5.**
      - `return()` is proved in `extractTools` and `renderJudgePrompt`.
      - `[No, Yes, No]` is covered.
      - The fences are now executed rather than transcribed. They are asserted on the logged values, the deltas, the
        request, and the whole settled result through `drive`.
    - **7.**
      - 16 parallel tables, the `repeated` and `:681` matrices, and the `exported` table moved to setup files.
      - `PAGE_FAULT`, `PAGE_CAPITAL` and `createPageSessionOptions(browser)` replace the page constants.
      - `captureRequest(mode, options, issue, create)` serves all 38 callers in their exact flows, and the
        `createOllama` scenarios call `createOllama` again. Its `finally` is pinned.
      - `DONE_RECORD` and `SHORT_OPTIONS` have one home each.
    - **8.**
      - Executing the fences binds every line, imports included.
      - All 12 control edits, 6 in each fence, fail the guides project, and a reindent does not. The retired
        `containsCode` accepted 6 of the 12.
      - `extractAnchoredFence` returns `undefined` when its block is absent. It was renamed from `extractFence` to
        avoid a `surface` collision.
    - **9.**
      - `listSetupFiles` normalizes a scalar or a list, for `setupFiles` and `globalSetup`.
      - Computed `import()` and `require()` are refused through `findComputedFiles`, with 7 fixtures.
      - A computed `url` or `glob` is reported but not refused, because it loads no module. Accepted.
    - **A7.** `reservePort` and `FixtureDaemon.stop` now have proofs.
    - **Checks:**
      - setup 549 plus 1 skipped, src:core 183, conformance 17, policy 119 plus 1 skipped, guides 46;
      - `check`, `lint:check` and `format:check` exit 0;
      - the probes' `tsc` shows exactly 5 errors, and the title diff is clean.
    - **Owed: OS-G-place** (T3 `ollama-fix-g-place-sonnet-1`). `helpers.test.ts`, a src:core test, imports
      `buildClosingList` from the store module. The generic builders `buildClosingList`, `buildSparseList` and
      `buildIteratorlessList` move into `tests/setup.ts`, with their proofs.
  - **OS-G-place: accepted.**
    - **The move.** `buildSparseList`, `buildIteratorlessList`, `buildClosingList`, `buildWatched` and
      `buildTracedRecord` moved byte-identical into `tests/setup.ts`, with four new direct proofs.
    - **What stayed.** `buildLazyCalls` is typed to `StoreCall`, so it stays in the store module.
    - **The result.** `src:core` no longer imports the store module. `@orkestrel/test` exports none of these builders,
      so there is no duplicate.
    - **Checks.** setup passes 553, src:core 183, and `check`, lint and format exit 0. The title diff is clean.
  - **Gates after OS-G: green.** The run was guarded, with logs at `tmp/units/ollama-fix-g-verify-*.txt`.
    - `format:check`, `lint:check`, `check` and `build` exit 0.
    - **Projects:** src:core 183, setup 553 plus 1 skipped, policy 119, config 227, guides 46, conformance 17,
      distribution 9.
    - **The probes' `tsc`:** exactly 5 errors. The title diff is clean.
    - **The daemon:** no runner and no 11434 socket, before or after.
  - **Live after OS-G: 80 of 80,** in 195.95 s, on a dedicated daemon on 11435: PID 41300. The receipts are in
    `tmp/units/os-daemon-3/`.
    - The one designed compaction retry occurred, as before.
    - Discovery exits 0: setup 554, src:core 183, guides 46, distribution 9, service 80.
    - The daemon was stopped by its PID, with its 2 runners. 11435 is free afterwards, and the user's daemon is
      untouched.
  - **Successor round 3 is running.** Claims: `tmp/units/ollama-sweep-3-claims.md`. Brief:
    `tmp/units/ollama-sweep-3-falsify-brief.md`.
    - **Objective:** Astra xhigh, T3 `ollama-sweep-3-falsify-astra-1`.
    - **Subjective:** native Workflow `wf_8ef49df5-26c`.
    - **Objective lane round 3: FAIL 1, 5, 7, 8, 9, 10.** The first attempt stopped on model capacity before any
      verdict and was retried as `ollama-sweep-3-falsify-astra-2`. Verdict:
      `tmp/units/ollama-sweep-3-verdict-objective-1.md`.
      - **Held:**
        - claim 2, `src` equivalence, with `return()` and non-adjacent duplicates proved;
        - claim 3, the setup repairs: the cursor reads `[0,0]` on both trees, `ScopeWalk` handles 20 000 segments, and
          `writeConsumerProbe` reads `entries()`;
        - claim 4, stream timing: tick 15 against 15, and 39 against 39;
        - claim 6, the live run.
      - **Closed from round 2:** the recorders, 5a–c, the earlier fence controls, and the scalar `setupFiles` and
        `globalSetup` forms, the computed `import()` and `require()` forms, and O1.
      - **New, narrow findings:**
        - **1.** OS-G-place's new builder proofs at `setup.test.ts:648`, `:656` and `:666` are read only through
          `.count`.
        - **5.** The frame-budget instrument `callWithFrames` is unreliable. Warmed up, it throws `RangeError` before
          entering its callback, so it credits an overflow its subject never reached.
        - **7.** The `CaptureMode` `'abort' | 'settle' | 'leave'` selector picks between control flows, which scaffold
          `names.md` § Split behavioral variants (`:53`) forbids. **The OS-G brief suggested the mode argument, so this
          is the Orchestrator's error.**
        - **8.** The fence harness rebinds `createOllama` as `{ ...options, fetch: transport }`. That overrides a
          transport the fence supplies, so a fence edited to reject still passes. It also replaces a project-owned
          import.
        - **9.** Path identity. A backslash `setupFiles` spelling, `./SETUPSERVICE.js`, which resolves on Windows, and
          the query form `./setupService.ts?daemon`, which executes, all escape.
      - **ADVISORY A1** stands.
    - **Subjective lane round 3: FAIL 1, 5, 7, 8, 9, 10; outside the claims: S1.** Native Workflow `wf_8ef49df5-26c`.
      Verdict: `tmp/units/ollama-sweep-3-verdict-subjective-1.md`.
      - **Held:**
        - claim 2, over 156 001 differential rows, where a control produces 8 727 differences;
        - claim 3: `ScriptCursor` over 13 × 6 calls, `ScopeWalk` over 230 rows, `writeConsumerProbe` over 12 cases;
        - claim 4: ticks 42/42, 36/36, 18/18 and 27/27;
        - claim 6: 181 real `/api/chat` calls on the final tree.
      - **It agrees with the objective lane on:** the three recorders (1), the mode selector (7), the fence override
        (8ii), the backslash `setupFiles` (9), and the frame instrument (S1, reproduced as order-dependent in a single
        worker).
      - **New:**
        - **5i. The ruling that `attachThinking` is an equivalent mutant is refuted.** On a mixed turn, native thinking
          plus an inline `<think>span</think>`, `converseStore` returns `thinking: "native "`, where the raw Agent
          record is `"span\n\nnative "`. So `attachThinking` is observable, and no `converseStore` case reads
          `thinking`. The round-2 reproduction tested only the simple case.
        - **5ii.** The abort ending's `await pending` is unpinned, because the call settles in the same turn.
        - **8i.** `guides/ollama.md:538` still describes the retired transcription guard, and so does the title at
          `guides.test.ts:605`.
        - **8ii.** The fence observation records only the model and `wireText`. The `else throw error` arm is never
          reached.
      - **Advisory:**
        - folded into OS-H: A-5, the coherence of the computed `url` form; A-7, the `findModuleSpecifiers` name; A-8,
          the inline constant twins; A-9, exports proved only through their consumers; A-12, cosmetic;
        - left: A-1, the cost; A-2, type-invalid fences, which no gate compiles; A-3, over-pinned property-read
          proofs; A-4, partial bindings of the baseline transcriptions; A-6, unseen import forms; A-10, `read*`
          functions returning `undefined`, a fleet and template naming question; A-11, `#park.abort()`; A-13, one
          unattributed live 500 with no failing test.
  - **Rulings for fix round OS-H.**
    - **Withdrawn: "`attachThinking` is an equivalent mutant".** The baseline had the same wiring, so the equivalence
      target is the baseline's `converseStore` result on the mixed turn. A proof is owed.
    - **Corrected: the OS-G mode-argument prescription.** It broke `names.md:53`, `:75` and `:79`, and the
      Orchestrator owns that error. One lifecycle helper takes the ending as a function, with three named entry
      points, and `CaptureMode` is deleted.
    - **The fence harness** runs the real imports and stubs the global `fetch`, so a transport the fence supplies wins
      and is observed. The observation records whole request bodies, and an erroring scenario reaches the `else` arm.
    - **The title at `guides.test.ts:605` is an intentional rename of a `ba171bd` title.** It now describes a test
      whose meaning changed, and it joins the title diff's known exceptions.
    - **The hermetic guard compares resolved file identity:** normalized separators, the host's real case, and queries
      stripped. `?raw` and `?url` stay assets.
    - **The frame proof must be deterministic** across file orders and in a single worker.
  - **Fix round OS-H** (`tmp/units/ollama-fix-h-brief.md`, T3 `ollama-fix-h-sonnet-1`): one unit, every item written
    failing first.
  - **OS-H: accepted.** Every item was reproduced first, as a failing test or as a mutant passing the old proof and
    failing the new one.
    - **1, the recorders.** Whole histories are asserted, and a search over about 120 declarations finds no other
      count-only recorder.
    - **2, the frame proof.** It now reads stack depth: `readStackDepth` and `recordRecursion`, plus an optional
      `exists` check on `readScopeType`.
      - `readScopeType` is proved over 200 directories, where the 201 depths must be equal. `ScopeWalk` is proved over
        250 000 directories.
      - It is deterministic over 8 shuffled single-worker seeds, and a recursive mutant fails it.
      - The two listed forms were measured non-deterministic, so this third form is accepted.
      - The shuffle also exposed two order dependences, both fixed: an identity assertion, and an explicit
        `{ shuffle: false }` suite.
    - **3, the capture helper.** `captureRequest(end, …)` takes an ending function: `abortCall`, `settleCall` or
      `leaveCall`. Three named entry points sit on top, 39 callers are repointed, and `CaptureMode` is deleted.
    - **4, the abort ending.** A settle 40 ms later pins its `await`.
    - **5, the mixed turn.** `STORE_MIXED_TURN` asserts `"native "`, as `ba171bd` returns, and a dropped
      `attachThinking` fails it.
    - **6, the fences.**
      - They run with the real imports and `runWithFetch`, which replaces the global `fetch`. Only `createAbort` is
        wrapped, to report each entity it creates.
      - The observation records whole bodies, the `messages` binding and the error.
      - A 404 scenario reaches the `else` arm.
      - 21 controls fail, and a reindent passes.
      - `guides/ollama.md:538` is corrected.
      - The title "carries the stream fence lines the transcription copies" is now "keeps the comment on each streaming
        fence line that states what the line returns". It is an intentional rename.
    - **7, path identity.**
      - Resolved files are compared through `SERVICE_MODULE` and `readRealPath` (`realpathSync.native`).
      - Queries and hashes are stripped, `?raw` and `?url` stay assets, and setup files are normalized.
      - On the tree before the fix, 23 tests failed.
    - **8, the folded advisories.**
      - A-5: `url` is a loading form. `vite.config.ts`'s `resolveWorkspacePath` is exempted through
        `COMPUTED_URL_FILES`, which is inspected and bounded to that form.
      - A-7: renamed `scanTreeReferences`.
      - A-8: the constant twins are replaced.
      - A-9: the direct proofs.
      - A-12: the cosmetic fixes.
    - **Checks** with the guard: setup 597, src:core 183, conformance 17, policy 119, guides 47. `check`, lint and format
      exit 0, the probes' `tsc` shows 5 errors, and the title diff shows the 3 known titles plus the rename.
    - **Extra guard.** The builder also set `NODE_USE_ENV_PROXY=1` and `HTTP_PROXY` to a dead port for the fence runs.
  - **Gates and live run after OS-H** (`tmp/units/os-daemon-4/`), all under the guard:
    - format, lint, `check`, build, `test` and `test:distribution` exit 0: src:core 183, setup 597, policy 119, config
      227, guides 47, conformance 17, distribution 9;
    - the title diff against `ba171bd` lists 4 titles: the 3 `STREAM_FENCE_CASES` titles, now registered from
      `tests/setup.ts`, and the intentional rename;
    - **live passes 80 of 80** in 228.88 s on 11435, with PID 41108 stopped by PID along with its children 34588 and
      50004; port 11434 was untouched;
    - discovery against 11435 exits 0, with every project discovered.
  - **The probes' `tsc` shows 5 errors, all predating the sweep**, which changed only `src/core/helpers.ts`:
    - `store-live.test.ts:464` and `wire-dump.test.ts:28` set `format`, which Agent `70c92d7` (2026-10-07) removed from
      `ProviderInterface`. At runtime that field is just `undefined`.
    - `wire-dump.test.ts:22` calls `provider.body`, which Ollama `0a36af3` (2026-10-11) removed. That probe throws at
      runtime on its first turn.
    - This is a follow-up unit, not a blocker.
  - **The closure check** (Astra, T3 `ollama-sweep-closure-astra-1`) closed items 2–8, each by a named mutant, and
    ended `CLOSURE: FAIL 1`. Item 1 reopened at one site: OS-H's own test at `tests/setup.test.ts:615-620` read its
    `depths` recorder only through `toHaveLength(1)`, so the mutant `report(levels === 0 ? -1 : readStackDepth())`
    passed it. The Orchestrator reproduced the finding by reading the code.
    - **The fix:** the test reads the caller's depth and asserts the whole history, `[[callerDepth + 1]]`.
    - **Proof:** the same mutant, applied to `tests/setup.ts` and then reverted (hash checked), now fails it.
    - **Recheck:** the Orchestrator's search found 4 more length reads (`setupServer.test.ts:739`, `:2195` and `:3867`;
      `setupStore.test.ts:2501`). Each reads its history's contents, or is an entity list whose contents are read
      elsewhere.
    - **Gates:** the guarded format, lint, `check` and `test` exit 0 again, and the title diff is unchanged. The live run
      stands, because the change is confined to the hermetic `setup` project.
    - The check added no follow-ups.
  - **Accepted under the exit rule.** Next: the commit, excluding the pins, then the restage into Agent and Study.
  - **Follow-up unit `ollama-probes-drift`, done.** `wire-dump.test.ts:22` now calls `provider.encode`, which
    `0a36af3` renamed from `body`, and both wrappers drop `format`. The probes' `tsc` exits 0.
  - **Rulings for the next fix round, OS-G.**
    - **The `attachThinking` wiring: an equivalent mutant.** No assertion is owed. The baseline has the same wiring,
      and it is kept.
    - **Case matrices, strict under `tests.md:194`:**
      - every iterated matrix that registers tests or drives several assertions moves to a setup file;
      - so does every parallel input-and-expected table, whatever its size;
      - a single literal input inside one `it` stays.
    - **Duplication in scope.** The near-duplicate consolidation covers the two capture helpers in the diff. The
      pre-existing proxy spans (`factories.test.ts:79` and `:138-154`, `OllamaProvider.test.ts:157` and `:553`,
      `integration.test.ts:825`) predate the sweep, are noted, and stay out of scope. `factories.test.ts:142` tests
      `createOllama` itself.
    - **The fence guard.** It binds by a comparison free of position information, through Vite's `parseAst`, or by
      executing the extracted fence. Its controls are an edit of whitespace inside a literal, a newline merged into a
      comment, and `.map(() => 'wrong')`.
- **The equivalence contract** is the one ruled for scaffold's fix round E, at
  `.orkestrel/scaffold/scaffold-fix-audit-verdict.md` § Fix round E, under E1 and E2. Ollama's successor round judges
  against it.
  - **Inside it:** element-level reads, the missing iterator, iterator `return()`, the outcome, and the effects before
    a throw.
  - **For an entry:** the outcome under pure getters.
  - **Outside it:**
    - the count and order of an entry's own property reads;
    - values outside the declared types;
    - Proxy traps other than element `get` and `Symbol.iterator`;
    - global prototype tampering.
  - **The OS-F units exceed it in places,** for example OS-F-store's single-pass `attachThinking` and OS-F-store-2's
    narrow log. That is allowed.
- **Fix round OS-F** (`tmp/units/ollama-fix-brief.md`) runs three Sonnet units on disjoint files:
  - **OS-F-src** (`ollama-fix-src-sonnet-1`): consumption only through the iterator protocol, in `extractTools` and
    `renderJudgePrompt`, and O(n) lazy duplicate detection.
  - **OS-F-store** (`ollama-fix-store-sonnet-1`):
    - single-pass `attachThinking`, `findUnlistedReferences` and `computeRefusals`;
    - an iterative `findContinuedRead`;
    - thinking content captured at emission;
    - `STORE_SEARCH_SEED` exported;
    - a `converseStore` proof.
  - **OS-F-server** (`ollama-fix-server-sonnet-1`):
    - the O1 probe imports, repaired first;
    - the hermetic closure walk, with every import form, `setupFiles` and a derived project list;
    - `FixtureDaemon` `url` and `stop`;
    - the placement moves, the `distribution.test.ts` helpers included;
    - `createLoopback` and `isInteger`;
    - the integration scenario builder;
    - fences executed with the stream loop in the consumer, and `reasoning` read;
    - live predicates aligned with their assertions.

## The deferred Ollama Bindings sweep

The pre-existing banned sites in U4's touched files are inventoried here. Ollama's own Bindings sweep is owed, and is
not part of this campaign's exit criterion.

- **From U4's report.**
  - **`src/core/helpers.ts`:** `:35` `let escaped`; push-built lists at `:70`, `:83`, `:154`, `:194-195` and `:439`.
  - **`tests/setup.ts`:** `:90` and `:96`, `:226`, `:374` and `:380`.
  - **`tests/setup.test.ts`:** `:521`.
  - **`tests/src/core/OllamaProvider.test.ts`:** `:136` and `:811`.
  - **`tests/service/budget.test.ts`:** `:280-286`.
  - **`tests/setupStore.ts`:** many sites; see the report.
  - **`tests/service/lifecycle.test.ts:146`, `:191` and `:224`:** count-only abort recorders.
- **Added from the lane's claim 5, count-only recorders:**
  - `tests/service/conversation.test.ts:29` (`faults`);
  - `tests/setup.test.ts:456` (`invocations`);
  - `tests/src/core/OllamaProvider.test.ts:741` (`signals`);
  - `tests/src/core/integration.test.ts:1119` (`invocations`).
