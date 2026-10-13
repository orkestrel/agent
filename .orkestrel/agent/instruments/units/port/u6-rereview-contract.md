**orkestrel-falsify verdict: u6 ledger fixes, round two, objective lane (package contracts)**

I had no shell in this session, so I could not run `npx vitest run --config vite.config.ts --project src:core tests/src/core/ledgers`. Every ruling comes from reading the code and the test assertions. The gate exit codes in `/home/user/agent-port/tmp/units/u6-fix-last.md:33-41` come only from the writer's report, so they are UNRESOLVED as evidence.

**Verdicts**

1. **CONFIRMED.** `#select` never throws, and a caller abort during classification keeps the usage spent.
   - **No throw:** `/home/user/agent-port/src/core/ledgers/Ledger.ts:517-541` wraps every step in a try. The catch returns `{...filing, messages: view(), fault}`, so usage and judgments survive a fault from `classify` (`:528`) or from `#plan`.
   - **Classifier on abort:** `/home/user/agent-port/src/core/ledgers/Classifier.ts:54-102` returns the completed judgments and the summed usage, plus `fault`.
   - **Agent side:** on an abort, `/home/user/agent-port/src/core/agents/Agent.ts:708-715` charges `spent` before the abort check. On a fault without an abort, `:717-726` emits `fault` and then `select`.
   - **Tests:** `/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:384-389` uses `toEqual` with judgments and a usage of 51, so dropping `...filing` fails it. `Ledger.test.ts:436` fails if `classify` drops usage on a fault. `/home/user/agent-port/tests/src/core/ledgers/Classifier.test.ts:410-413` pins the classifier's partial result.
   - See F2 for a judge-abort partial that the classifier drops.

2. **CONFIRMED.** Per-pass state resets at every pass.
   - **Code:** `Ledger.ts:366-368` resets `#selected`, `#boundary`, and `#usage` before each `generate`.
   - **Replay of the round-one input:** request 2's selection throws, so `#observeTurn` prices `build(undefined)` plus `messages().slice(3)`, which is empty. That equals what the agent sent through `Agent.ts:705`.
   - **Mutation:** deleting `Ledger.ts:367` leaves the boundary at 1. The estimate then counts `First.` and `Second request.` twice, so `Ledger.test.ts:461-463` fails.
   - **Proof gap:** deleting `:366` survives every test, because `Ledger.ts:306` also clears `#selected` before the first pass. No test drives a failed selection in the answer pass.

3. **CONFIRMED.** The constructor validates every option, `createLedger` delegates to it, and `calibrate` refuses both a nonpositive priced prompt and a call during `respond`.
   - **Constructor:** `Ledger.ts:104-130` checks the five threshold keys by name, the shares, capacity, both limits, topics, and lookups. The gauge is checked through `Gauge`.
   - **Factory:** `/home/user/agent-port/src/core/ledgers/factories.ts:18` returns `new Ledger(...)`.
   - **Calibrate:** `Ledger.ts:269` refuses a priced prompt of 0 or less, and `Ledger.ts:250` refuses a call while `#active` is set.
   - **Tests:** `/home/user/agent-port/tests/src/core/ledgers/factories.test.ts:29-74` fails if checking goes back to `Object.values`. `Ledger.test.ts:302-311` and `:331-336` fail if either calibrate check is removed.
   - See F3 for the reverse ordering, a `calibrate` that starts before `respond`.

4. **CONFIRMED.** A throwing `read` handler counts as a failed lookup everywhere it is read.
   - **Containment:** `Ledger.ts:421-430` contains the throw and records `success: false`.
   - **Each reader calls `#readLookups` before it checks `#results`:**
     - filing at `:395-396`;
     - replacement, by skipping the reading at `:415-420`;
     - stubs, where `reading` is computed before the `failed` test;
     - the digest, through `#project`, before the skip at `:1067`.
   - `lookup.read` is called nowhere else (grep `\.read\(` over `src/core/ledgers`).
   - **Test:** `Ledger.test.ts:520-558` fails if a throw is turned into an empty reading, because the seed fact would be replaced.
   - **Proof gap:** no test reaches the digest with a throwing reader.

5. **CONFIRMED (code reading).** After a `respond` that rejects, the next one works, and cancellation and scope restoration still hold.
   - **Recovery:** the only rejection paths are calibration (`Ledger.ts:302`, before any add) and `#buildDigest`. The `finally` at `:359-362` clears `#active`, and `:303-311` resets the per-request state. `Ledger.test.ts:311-314` fails if `#active` were not cleared.
   - **Cancellation:** a classification abort goes through the abort path in `#fold`, then `Agent.ts:401`, then `Ledger.ts:314`, and the answer pass is skipped.
   - **Scope:** the `try`/`finally` at `Ledger.ts:335-339` restores the previous scope, and `#runPass` never throws.
   - **Proof gap:** no test aborts during the answer pass.

6. **BROKEN.** The TSDoc leaves out failure behavior that the code has, and one sentence is false since fix 21. `/home/user/scaffold/.claude/rules/typescript.md:87-88` requires each thrown error and each failure behavior to be stated.
   - **6a. `respond` omits its calibration refusal.**
     - **Input:** construct the ledger without `gauge`, with a provider whose priced call reports `usage.prompt: 0`. `respond('First.')` then rejects with `LedgerError` `GAUGE`, as `Ledger.test.ts:311` pins.
     - **Port:** `/home/user/agent-port/src/core/ledgers/types.ts:289-301` does not mention it, and the `@throws` at `Ledger.ts:291` names only `AgentError`.
     - **Fix:** add "A failed calibration rejects with `LedgerError` code `'GAUGE'`" to `types.ts:293-296`, and add `@throws {LedgerError}` at `Ledger.ts:291`.
   - **6b. The `GAUGE` wording is false for a reported prompt of 0 or less.**
     - **Input:** a priced call with `usage.prompt: -1` reports usage, yet it is refused (`Ledger.ts:267-273`, `Ledger.test.ts:302`).
     - **Port:** `types.ts:315` and `types.ts:610` both say "reports no prompt usage".
     - **Fix:** change both to "reports no prompt usage or a prompt usage of 0 or less".
   - **6c. Two `@throws` tags are missing.**
     - `calibrate` at `Ledger.ts:247` and `types.ts:315` has no `@throws {AgentError}` for `CONCURRENCY`.
     - The constructor TSDoc at `Ledger.ts:98-102` has no `@throws {LedgerError}`, although the constructor now validates.
   - **6d. `fault` is undocumented.**
     - `types.ts:464` describes `ClassifierResult` without `fault`, and the `@returns` at `Classifier.ts:49` omits it.
     - The `@param` at `Classifier.ts:48` says only an abort returns a fault, but `Classifier.ts:92-94` returns one for any throw, for example from an `assign` or `entities` handler.
     - **Fix:** name `fault` in both places, and say "a throw or an abort".
   - **What holds:**
     - The abort wording at `types.ts:299` and `:310`.
     - `LedgerAgentOptions` without `strict` (`types.ts:227-230`, pinned by `factories.test.ts:21`).
     - The documented limits at `types.ts:114` and `:166-167`, which match `Ledger.ts:946-947`, `:395-396`, and `:415-420`.

7. **CONFIRMED.** No fix regresses a round-one CONFIRMED claim.
   - **Concurrency:** the check at `Ledger.ts:294-295` still runs before the first await.
   - **Abort phases:** see verdicts 1 and 5.
   - **Scope restore, answer-pass continuation, and repeat stop:** unchanged at `Ledger.ts:521-525` and `:193-199`.
   - **Calibrate-once:** unchanged at `Ledger.ts:302`.
   - **Barrel:** unchanged.

**Findings outside the claims**

- **F1. The answer-pass handler breaks the fault contract.**
  - **Where:** `Ledger.ts:324-331` filters the tool and call messages out of every selection, including a fault selection.
  - **Problem:** `/home/user/agent-port/src/core/contexts/types.ts:246` and `:257-259` require `messages` to be `view()` when `fault` is set. `Agent.ts:725` builds from the filtered list on a non-abort fault.
  - **Right:** return `selection` unchanged when `selection.fault !== undefined`. If the filtered view is the behavior you want, refer the change to the Orchestrator as a contract change.
- **F2. The classifier drops the partial result of an aborted judge call.**
  - **Input:** a `JudgeInterface` whose `ask` rejects on abort with `JudgeAbortError({ model, answers: { [key]: answer }, usage: { prompt: 40, completion: 1, total: 41 } })`.
  - **Port:** `Classifier.ts:341-345` rethrows. The 41 tokens leave `ClassifierResult.usage`, and `key` leaves `judgments`, even though `/home/user/agent-port/src/core/conversations/JudgmentManager.ts:115-116` recorded the answer.
  - **Contract:** `contexts/types.ts:244` covers usage "on failure alike", and the stock handler folds both at `/home/user/agent-port/src/core/contexts/factories.ts:137-145`.
  - **Scope:** the in-package `AgentJudge` sends a one-question ask with an empty partial, so only a custom judge reaches this.
  - **Right:** in `#ask`, when the error is a `JudgeAbortError`, hand `partial.usage` and the answered key back to `classify` before the fault return. For example, push a result before rethrowing.
- **F3. A `calibrate` that starts before `respond` still overlaps it.**
  - **Input:** call `ledger.calibrate(signal)`, then `ledger.respond('Check the order.')` before calibration settles.
  - **Problem:** `#active` is false at `Ledger.ts:294`, so `respond` proceeds. The calibration then replaces `#gauge` at `:274` in the middle of the request:
    - the briefing was priced with the old gauge;
    - `#recall` and `observe` at `:342` use the new one.
  - Two concurrent `calibrate` calls also race, and the last writer wins.
  - **Right:** hold `#active` for the length of `calibrate`, so that `respond` and a second `calibrate` reject with `CONCURRENCY`.

**Attacked and held**

- **Fault plus caller abort:** the abort wins at `Agent.ts:713-715`. No `select` is emitted and usage is still charged.
- **View changed during the handler:** `/home/user/agent-port/src/core/contexts/AgentContext.ts:271-286` wraps the ledger's handlers. `#select` and `#plan` add no message, so the check never trips.
- **Order of `#flush` before a read failure:** `#readLookups` calls `#flush` first, so a pending result never overwrites a recorded read failure.
- **No double count of usage:** on success, `Agent.ts:587` folds `spent` into the result. On a rejection, `#usage` holds the `select` usage and the per-turn usage, and nothing is summed twice.
- **Calibration abort reason:** the catch at `Ledger.ts:280-282` rethrows the caller's reason, which is pinned by `.rejects.toBe(reason)` at `Ledger.test.ts:323-327`.

VERDICT: FAIL 6