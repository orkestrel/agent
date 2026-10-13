1. **CONFIRMED.** Cancellation from final usage, the last content delta, a tool listener, and provider-stream completion produced `partial: true`. An uncancelled final answer and cancellation from the post-commit `finish` listener remained non-partial. Mutation: remove the final signal check at [Agent.ts:591](/home/user/agent-port/src/core/agents/Agent.ts:591); the existing final-usage assertion distinguishes it.

2. **BROKEN.** Lifetime holds forget earlier fingerprints. With one category question, a judge that refuses with `QUESTION`, and model identities `A, A, B, B, A`, the executed probe recorded asks `A, B, A`. The final A should remain held. [Classifier.ts:361](/home/user/agent-port/src/core/ledgers/Classifier.ts:361) overwrites the fingerprint stored for that question ID. Smallest fix: retain a set of held complete fingerprints for the classifier’s lifetime. Different fingerprints must remain independently eligible.

3. **BROKEN.** The shared splitter exists, but tail filtering can destroy a complete tool pair before splitting. Seed calls `[c1: unregistered, c2: lookup]` followed by results `[c2, c1]` produced a provider prompt containing only call `c2` and result `c1`. Both pairs existed in the input. [Ledger.ts:836](/home/user/agent-port/src/core/ledgers/Ledger.ts:836) associates results by position; stub rendering repeats that assumption. Smallest fix: resolve uniquely identified results by call ID consistently across filtering, reading, and rendering, preserving positional handling for genuinely ambiguous IDs. The universal ordering claim exceeds the positional restriction documented on `Message`.

4. **BROKEN.** Final stub rendering can overflow an otherwise feasible plan. Executed fixture: capacity `400`, predict `0`, gauge `{ scale: 1, fixed: 0 }`, shares `{ prompt: 0.7, tail: 1 }`, and a seed lookup whose string argument contains `400` characters. The budget was `264.1509433962264`; the returned seed tail alone cost `341`, excluding the request and system message. The briefing was empty, and dropping the seed exchange would fit. The plan prices a “shown” stub, then [Ledger.ts:739](/home/user/agent-port/src/core/ledgers/Ledger.ts:739) replaces it with a longer “hidden” stub. Smallest fix: price the final stubs and refit whole exchanges, or reserve the larger stub cost before selection.

5. **BROKEN.** Direct-run admission has two holes:
   - During calibration, `#active` is true. A direct generation received an unfaulted selection and issued judge requests.
   - With no trailing user message, direct generation bypassed selection altogether and reached the provider without a fault.

   The executed recovery control—a normal `respond` after direct generation—held. Smallest fix: identify runs actually admitted by `respond`, independently of calibration’s busy flag, and enforce that ownership even when selection would otherwise be skipped. See [Ledger.ts:551](/home/user/agent-port/src/core/ledgers/Ledger.ts:551) and [Agent.ts:698](/home/user/agent-port/src/core/agents/Agent.ts:698).

6. **BROKEN.** Mapping and rank extraction held under source comparison, but universal briefing equality did not. Fixture: a large user seed, a lookup call, the user statement `For Mira, refund AB-12 is $20.`, then the earlier call’s result. Ask `For Mira, what is the refund?`. Replaying the historical Ledger/helpers produced no briefing and retained the later seed exchange. The current implementation joined the exchanges, dropped that tail, and produced:
   ```
   ## Pinned
   For Mira, refund AB-12 is $20.
   ```
   Smallest correct repair: constrain the equivalence claim to identical tail decisions and add this differential assertion. Preserve the tool-group repair; reverting it would restore the earlier split. The changed tail affects briefing eligibility at [Ledger.ts:639](/home/user/agent-port/src/core/ledgers/Ledger.ts:639).

7. **CONFIRMED.** The scoped search found no old helper or topic-option spelling. Executed request-topic controls yielded one ask when `requested` was omitted, zero when false, and one when true. Mutation: treat omission as false; the omitted-option assertion distinguishes it. The renamed condition retains its previous `=== false` semantics.

8. **BROKEN.** Under `turn`, calibration can carry thinking that the next request drops. Seed `[user: "Seed.", assistant: "Earlier.", thinking: "PRIVATE"]`, calibrate, then respond `"Next."`: the calibration body contained `PRIVATE`; the next provider body contained no thinking. The same probe held for `none` and retained thinking in both bodies for `all`. [Ledger.ts:277](/home/user/agent-port/src/core/ledgers/Ledger.ts:277) filters the view before the next user boundary exists. Smallest fix: apply the upcoming request boundary when preparing calibration replay, with a regression assertion comparing retained thinking.

9. **BROKEN.** The changed guide’s direct-run and bounded-plan statements are false for the executed cases in claims 4 and 5. The existing direct-run proof tests an idle ledger with a trailing user message; it does not distinguish calibration admission or selection bypass. See [guides/agent.md:517](/home/user/agent-port/guides/agent.md:517) and [tests/guides.test.ts:1884](/home/user/agent-port/tests/guides.test.ts:1884). Smallest fix: repair those mechanisms and add assertions for these concrete counterexamples before retaining the universal wording.

10. **CONFIRMED.** The added or renamed exports have named consumers: `collectExchanges` serves compaction, selection, and tail construction; `rankLedgerCut` serves planning; `cutListing` serves recall; `requested` serves classification. Their helper/member names and applicable TSDoc satisfy the cited naming and documentation shapes. The attack for unused exports, compatibility aliases, missing parameter documentation, and missing boolean-default semantics found none.

11. **BROKEN.** I would not ship `6981e2d`. The reproduced failures include malformed tool pairing, a plan exceeding its own bound, and direct generation entering ledger planning without ownership. Repair those mechanisms and the lifetime-hold defect, resolve the replay and equivalence claims, and assert the counterexamples before publication.

Outside the claims: none substantiated. No cost advisory.

Attacked and held: ordinary final-text cancellation; cancellation after commit; normal `respond` recovery after a faulted direct run; consecutive reuse of the same held fingerprint; omitted/false/true topic-option behavior; and removal of recorded thinking from both calibration and provider bodies under `none`. The shared exchange splitter and the extracted ranking logic are present; their existence does not repair the surrounding failures.

VERDICT: FAIL 2, 3, 4, 5, 6, 8, 9, 11; outside the claims: none