**orkestrel-falsify verdict: u6 ledger entity, objective lane (correctness against the package contracts)**

I had no shell in this session, so I could not run the `npx vitest run ... tests/src/core/ledgers` command. Every ruling below comes from reading the code and the test assertions. No pass or fail of a test is claimed.

**Verdicts**

1. **BROKEN.** The select handler throws where the contract requires a fault selection, and it loses the judge usage already spent.
   - **Input:** the judge answers the first category question with usage `{prompt: 50, completion: 1, total: 51}`. The caller then aborts during the second judge call.
   - **Port:** `/home/user/agent-port/src/core/ledgers/Classifier.ts:336` rethrows and drops the `results` it built at `Classifier.ts:54`. `/home/user/agent-port/src/core/ledgers/Ledger.ts:450` awaits `classify` with no catch, so `#select` rejects.
   - **What happens next:** `/home/user/agent-port/src/core/agents/Agent.ts:699-706` takes the throw path, so `spent` is never charged and `LedgerResult.usage` leaves out the 51 tokens. The same loss happens on any non-abort throw after `classify` succeeds. One example is a lookup `read` handler that throws inside `#readings` (`Ledger.ts:362`), reached through `#plan` (`Ledger.ts:451`).
   - **Contract:** `/home/user/agent-port/src/core/contexts/types.ts:244` and `:257-260` say a handler that spent judge calls before giving up returns `fault`, `messages` as `view()`, and the usage spent, instead of throwing. `Agent.ts:685-686` charges usage before the abort check because judge calls were spent either way.
   - **What holds:** "Never mutates the conversation while awaiting the judge" is true. `#select` and `#plan` add no message, so the check at `/home/user/agent-port/src/core/contexts/AgentContext.ts:262-286` never trips.
   - **Smallest fix:**
     - Wrap `Ledger.ts:450-452` in try/catch. On any error, return `{ messages: this.#conversation.view(), judgments, usage, fault }`.
     - Patch `Classifier.classify` (report-only) so that on abort it returns the judgments and usage it has gathered so far, plus the error, instead of rethrowing at `Classifier.ts:336`. `ClassifierResult` in `types.ts:460` gains `fault?: Error`.
   - **Proof gap:** no test drives a selection failure.

2. **CONFIRMED.** A second `respond` is refused before any message is added.
   - `Ledger.ts:242-243` checks and sets `#active` synchronously, before the first `await`, so the second call rejects with `AgentError` `CONCURRENCY` (`/home/user/agent-port/src/core/agents/errors.ts:87`) before `Ledger.ts:251` adds anything.
   - The `finally` at `Ledger.ts:304-307` clears `#active` on every path. The per-request state is reset at `:253-259`.
   - Test: `/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:215-225`. Moving the check after the add makes the count assertion at `:225` fail.
   - **Proof gap:** no test covers recovery after a failure, for example a respond that rejects with `GAUGE` followed by another respond.

3. **CONFIRMED (code reading).** A caller abort in each of the three phases settles without an answer pass.
   - **During classification:** `Classifier.ts:319` or `:336` throws, `Agent.ts:700` sees the signal aborted and builds `view()`, and `Agent.ts:401` marks the run partial with no provider call. `Ledger.ts:262` then skips the answer pass.
   - **During the first pass:** the run ends partial and `Ledger.ts:262` skips the answer pass.
   - **During the answer pass:** the continuation branch at `Ledger.ts:443-448` has no await, and the run settles partial.
   - **Consistency:** after an abort the notes stay in the conversation, recorded in `#annotations`, and `#tail` excludes them.
   - **Test:** only `Ledger.test.ts:215-232`, which aborts at turn 0 of the first pass. Deleting `!caller.aborted &&` at `Ledger.ts:262` breaks `:227`. No test aborts during classification or during the answer pass.

4. **CONFIRMED.** The previous scope is restored after the answer pass on every path.
   - The `try/finally` at `Ledger.ts:283-287` restores it, including `undefined` (`AgentContext.ts:163`).
   - `#pass` (`Ledger.ts:310-321`) never throws, so no path skips the restore.
   - Test: `Ledger.test.ts:160` breaks if the restore is removed.

5. **CONFIRMED.** `createLedger` refuses every invalid option the brief lists with the matching code.
   - Rules: `/home/user/agent-port/src/core/ledgers/factories.ts:20-45`. Tests: `/home/user/agent-port/tests/src/core/ledgers/factories.test.ts:28-113`.
   - Codes covered: `THRESHOLD` (with `-0` and `1` at the edges), `SHARE`, `CAPACITY`, `LIMIT` (with 0 accepted), `TOPIC` (empty, whitespace-only, duplicate), and `LOOKUP` (duplicate names, `recall`).
   - `GAUGE` comes from `/home/user/agent-port/src/core/ledgers/Gauge.ts:38-43` through the Ledger constructor (`Ledger.ts:107-108`).
   - The defaults are accepted (`factories.test.ts:21`).
   - Mutations to `<= 0` or `> 1` break `factories.test.ts:28-42`.
   - See finding F5 for a key-omission gap.

6. **CONFIRMED.** `calibrate` stores a gauge only when both calls report finite prompt usage and the bare call's prompt usage is above 0, and `respond` calibrates once.
   - `Ledger.ts:220-225` requires finite prompt usage from both calls and a bare prompt above 0, otherwise it throws `GAUGE`, and stores nothing on failure.
   - `Ledger.ts:250` calibrates only while no gauge is held.
   - Tests: `Ledger.test.ts:234-258` (4 provider calls over 2 responds) and `:260-267`.
   - **Weak proof:** the no-usage test strips usage from both calls, so dropping either finite check alone survives it.
   - See finding F4 for a priced call that reports 0.

7. **BROKEN.** `#boundary` from one request leaks into the next when a selection fails.
   - **Mechanism:** `#boundary` and `#selected` are set only by the `select` event (`Ledger.ts:172-176`). The fault and throw paths emit no `select` (`Agent.ts:699-706`, `:717-723`), and nothing resets `#boundary` per request or per pass.
   - **Input:** request 1 runs normally, and one of its lookup results makes `read` throw. In request 2, the classifier's entities handler calls `#readings`, which throws, so the selection fails and the agent builds the full `view()`.
   - **Effect:** `#observeTurn` (`Ledger.ts:764-768`) prices `build(undefined)`, which is the full view, plus `messages().slice(<request 1's boundary>)`. Request 1's tail and request 2's request are counted twice.
   - **Persistence:** if request 2 answers in the first pass, `Ledger.ts:289` passes that inflated first estimate to `Gauge.observe`. `Gauge.ts:114-116` then lowers `#scale`, and every later briefing (`Ledger.ts:472-475`, `:610`) uses the lowered value.
   - **What holds:** no listener or timer outlives a respond. The emitter listeners are added once in the constructor. `createAbort` links signals through `AbortSignal.any` and adds no listener. The agent clears its timeout at `Agent.ts:288`.
   - **Smallest fix:** at the start of `#pass` (`Ledger.ts:311`), set `this.#selected = undefined` and `this.#boundary = this.#conversation.messages().length`.

8. **CONFIRMED.** The barrel follows the rule, and no name collides with the guides available here.
   - `/home/user/agent-port/src/core/ledgers/index.ts:1-8` holds only star rows. `/home/user/agent-port/src/core/index.ts:12` adds one row.
   - `Ledger`, `Classifier`, and `Gauge` can each be built from values a consumer holds, and each has an `@example`, as `/home/user/scaffold/.claude/rules/architecture.md:267-292` requires.
   - I searched every ledger export name against `/home/user/scaffold/guides/*.md` and the installed `@orkestrel` `.d.ts` files under `/home/user/agent/node_modules/@orkestrel` and found no match.
   - The search covers only the guides present on this host.

**Findings outside the claims**

- **F1.** The public `Ledger` constructor skips validation.
  - **Where:** `Ledger.ts:102`, and its own `@example` at `Ledger.ts:67` calls `new Ledger(provider, options)`.
  - **Problem:** all checks live in `factories.ts:20-45`. `new Ledger(p, {...o, thresholds: {...t, category: 0}})` or `capacity: -1` with no gauge is accepted. The capacity error only surfaces at the first `respond` (`Gauge.ts:44`), and a duplicate lookup name reaches the tool manager instead of raising `LOOKUP`.
  - **Right:** run the checks in the constructor, as `Gauge.ts:37-50` does, and have `createLedger` return `new Ledger(...)`.
- **F2.** A caller abort during calibration rejects `respond` instead of settling.
  - **Where:** `Ledger.ts:250`.
  - **Problem:** `/home/user/agent-port/src/core/ledgers/types.ts:296` promises that an abort ends the request partial.
  - **Right:** amend `types.ts:290-297` (report-only) to state that an abort during calibration rejects with the abort reason.
- **F3.** A lookup `read` handler that throws is not contained.
  - **Where:** `Ledger.ts:362`.
  - **Problem:** once such a result is in the conversation, every later selection fails, and `#digest` (`Ledger.ts:893`) rejects any `respond` whose first pass needs an answer pass. This is also how the claim 7 leak starts.
  - **Right:** treat a throw from `read` as `result: undefined` in `#readings`, or document in `types.ts:154` that `read` must not throw.
- **F4.** `calibrate` accepts a priced call that reports 0 prompt tokens.
  - **Where:** `Ledger.ts:220-224` refuses a bare prompt of 0 or less but not a priced one, and `:229` clamps `fixed` to 0.
  - **Problem:** this conflicts with the "no prompt usage" rule at `types.ts:310`.
  - **Right:** refuse `priced.usage.prompt <= 0` the same way.
- **F5.** A missing threshold key passes validation.
  - **Where:** `factories.ts:20` iterates `Object.values`, so an untyped caller that omits `correction` passes.
  - **Problem:** `Classifier.ts:69-70` then compares against `undefined`, the comparison is always false, and the classifier asks pair questions about every user message that names a shared entity or topic.
  - **Right:** check the five named keys explicitly.
- **F6.** `LedgerAgentOptions` offers `strict`, but the ledger always overrides it.
  - **Where:** `types.ts:226` picks `strict`, and `Ledger.ts:161` forces `strict: false`, so a caller's `strict: true` is silently dropped.
  - **Right:** remove `'strict'` from the `Pick` (report-only patch), in line with `types.ts:220-222`.
- **F7.** `calibrate` does not check `#active`.
  - **Where:** `Ledger.ts:208`.
  - **Problem:** a direct `calibrate()` during a `respond` replaces `#gauge` mid-request and throws away its history before `Ledger.ts:289` calls `observe`.
  - **Right:** refuse with `CONCURRENCY` while `#active` is set.

**Attacked and held**

- **Repeat detection:** it reads `result.error` and never a call id, so a reused call id with reordered nested arguments is still caught (`Ledger.ts:167`, `:786`; `Ledger.test.ts:91-161`).
- **Repeat abort vs caller abort:** `agent.abort('repeat')` does not set `caller.aborted`, so the answer pass still runs after a repeat.
- **Tool result receipts:** `#pending` indexing matches the order at `Agent.ts:542-546` (emit, then add), with no index drift across several calls in one turn.
- **Answer-pass request:** the agent's run-entry request is the cue note (`Agent.ts:353-354`), so the continuation branch at `Ledger.ts:443` returns the plan the request entered with and asks the judge nothing (`Ledger.test.ts:158-159`).
- **Abort window before the answer pass:** no `await` sits between the `caller.aborted` check at `Ledger.ts:262` and `#pass`, so a caller abort cannot land there.
- **Answer pass with no tools:** `tools: []` advertises nothing (`Agent.ts:436`), and a reply's calls are refused rather than dispatched.

VERDICT: FAIL 1 7