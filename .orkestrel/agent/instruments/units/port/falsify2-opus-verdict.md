Lane: subjective (reviewer, Opus 5.5). I lead on claims 9 to 11 and rule on all 11. Evidence: `tmp/units/falsify-port-2.diff` and the tip sources, tests and `guides/agent.md` under `/home/user/agent-port`, plus `../scaffold` `AGENTS.md`, `names.md`, `typescript.md`, `documentation.md` and `writing.md`. I ran nothing.

## 1. Verdicts

**1. Final-text cancel: CONFIRMED.**
- Attacks that held:
  - A `usage` listener abort is pinned by the Agent.test and Ledger.test cases added in the fix.
  - A `deny` listener abort on a final-text turn: `deny` fires at Agent.ts:533, before `partial = abort.signal.aborted` at :591.
  - A conversation `add` listener abort during the final append (:584) also lands before :591.
  - A `tool` listener abort is caught by the loop-top check at :434.
  - A cancel after `#run` returns: `#pump` never reads the signal again (:294-306).
- Mutation check: deleting :591 fails "commits a partial agent result when final usage aborts the caller". Hard-coding `partial = true` fails the completed-run tests. The assertions tell both apart.
- Referred to the objective lane: a construction `budget` that trips on the final turn's usage reconcile (:525) used to report `partial: false` and now reports `true`. The guide's contract 13 counts a budget trip as a cancel, so this holds only if "the caller did not cancel" covers run bounds.

**2. Holds: CONFIRMED.**
- Attacks that held:
  - `JudgeError` with code `'QUESTION'`, the logprob text, a transport error, and a `JudgeError` with another code (Classifier.ts:357-361).
  - An abort rethrows at :362 without a hold.
- The fingerprint is `JSON.stringify(spec)` (:331), which carries question, state and sources.
- Mutation check: the guides.test hold case catches dropping either disjunct and catches holding every failure (the transient count would not double).
- Referred to the objective lane: the fingerprint carries no judge `model`. The model clause holds only because a ledger's judge is fixed, and nothing in `JudgeInterface.model` (types.ts:173) enforces that.

**3. One exchange splitter: BROKEN (ledger tail).**
- The splitter half held. `collectExchanges` is the only splitter, and compaction, selection and `#selectTail` all call it.
- Failing input (a seed whose results arrive out of call order):
  - `user 'Look up order BW-5512.'`
  - `assistant calls [{id:'c1', name:'lookup_order', arguments:{id:'BW-5512'}}, {id:'c2', name:'send_email', arguments:{}}]`
  - `tool {call:'c2'}`, then `tool {call:'c1'}`
  - then `respond('What is next?')`
- What happens:
  - `collectToolGroups` orders a group's results by message order: `[assistant, t(c2), t(c1)]`.
  - `#selectTail` pairs results with calls by position (Ledger.ts:836-845). Call `c1` claims `t(c2)`, and `c2` is dropped as a non-lookup.
  - The tail therefore sends `assistant calls:[c1]` with no `c1` result, and a tool message whose `call` is `c2` with no `c2` call.
- Fix: pair each call with the tool message whose `call` equals `call.id`, and fall back to position only when no tool message carries an id. That is the ownership rule `collectToolGroups` already applies. See O4 for the same positional pairing elsewhere.

**4. Plan bound: BROKEN ("states exactly").**
- guides/agent.md:522 and :547 name only the request and each lookup result as entering whole.
- The plan also leaves these unbounded:
  - the pass's own assistant turns: call-turn content, call arguments and replayed thinking accumulate for up to `limit` turns after the single entry select (Agent.ts:369);
  - the answer note and cue, which `#collectAfter` appends (Ledger.ts:554, :564);
  - the fault path's whole `view()` (Ledger.ts:569).
- Failing input: `capacity: 600`, `gauge: {scale: 1, fixed: 0}`, and a scripted provider that returns 7 call turns, each carrying 400 characters of content and a short lookup result. A later call exceeds the budget even though the request and every lookup result are small.
- Fix: in :522, state that the budget bounds the briefing and tail of the first call alone, and that the request, lookup results, the pass's own turns, the answer note and the fault view enter unbounded. Mirror this in :547.

**5. Direct run: BROKEN.**
- Input A (no fault):
  - `await ledger.respond('A'); await ledger.agent.generate()`
  - The newest message is the assistant reply, so `request` is `undefined` (Agent.ts:363-364) and `context.select` is never called (Agent.ts:698).
  - Result: no fault selection, no `fault` event and no `select` event.
- Input B (plans for the wrong request and asks the judge):
  - `ledger.conversation.add({role:'user', content:'B'})`, then start `ledger.calibrate(signal)` with the provider parked on a gate, then call `ledger.agent.generate()`.
  - `calibrate` sets `#active` (Ledger.ts:266-267), so `#select` passes the guard at :551, plans for `this.#request ?? request` (the previous request A, :558), and runs `classify`, which asks the judge.
  - The same happens during `respond`'s first pass. The ledger's agent has no `window`, and a `budget` is optional, so Agent.ts:184-192 admits the concurrent run.
  - That run also overwrites `#entered`, `#selected` and `#boundary`, which the answer pass and the gauge then read.
- Fix: at Ledger.ts:551, fault unless `this.#active && (request.id === this.#request?.id || this.#annotations.has(request.id))`. Narrow the guide as in 9a.

**6. One mapping and one rank: BROKEN (byte-identity overreach).**
- The `#plan` refactor alone preserves bytes:
  - `#buildUnitRecord` is pure over `input`, `projection` and `held`, and `held` is not mutated after Ledger.ts:612;
  - `rankLedgerCut` equals the removed ternary.
- What changes the bytes is the same commit's tail. A seed that opens with an assistant message:
  - at `7f346b5`, that exchange was skipped (`exchange[0]?.role !== 'user'`);
  - at `6981e2d`, it enters the tail when it fits (pinned by "sends a leading assistant seed exchange when it fits the tail");
  - that lowers `cap` at Ledger.ts:595-596, so a briefing sized between the two caps loses a step.
- Interleaved call groups change the tail the same way.
- Fix: restate the claim for seeds that open with a user message and interleave no call group, which is what the rulings' bound already assumes.

**7. Renames: CONFIRMED.**
- Attack: a search of `src`, `guides` and `tests` finds no `cutItems`, no `requests:` topic option and no `topic.requests`, and no alias exists.
- Mutation check: Classifier.ts:66 reading `topic.requests` would fail Classifier.test, which pins asking order with `requested: false`. The assertion tells the rename apart.

**8. Thinking replay: BROKEN (`'turn'`).**
- Failing input:
  - `provider.replay = 'turn'`, no `gauge` option;
  - seed `[user 'Order BW-5512 is late.', assistant {content:'Noted.', thinking:'Check the carrier.'}]`;
  - then `respond('Status?')`.
- Calibration applies `stripThinking([system, ...view], 'turn')` (Ledger.ts:277-283). The assistant message follows the last user message there, so its thinking stays.
- In the first request, the new request is the last user message, so `'turn'` drops that thinking (helpers.ts:104-107).
- Under `'all'`, calibration carries the thinking of every seed message, while the request carries only the tail's.
- Fix: apply the policy as the next request will, for example by stripping `[...view, request placeholder]` and dropping the placeholder. Alternatively, restate the claim.

**9. Guide: BROKEN.**
- **9a.** guides/agent.md:516 says a run the ledger didn't start "gets a faulted selection, so the agent emits `fault`… and the ledger asks its judge nothing". Inputs A and B in claim 5 falsify both halves.
  - The test "faults a direct agent run…" covers only a direct run after `respond`, with a newly added user message.
  - Right: "A direct run whose newest message is a user message gets a faulted selection…; a run whose newest message isn't a user message gets no selection and builds from the whole view." Add the code fix from claim 5, or name the concurrent case as a limit.
- **9b.** guides/agent.md:546 says "A message stays in its record for the ledger's life unless a later message supersedes it or makes its sentences stale". Two counterexamples:
  - A later reading with the same `identifyLookup` identity, an empty one included, removes the earlier reading from every record (ledgers/helpers.ts:664-676). The guide's own :524 says "the second reading replaces the first in the records".
  - A message whose category question failed transiently is not quiet, so it sits in an owner record. When a later request files it `chatter`, it leaves (helpers.ts:685).
  - The test "keeps a seed rule in the briefing of every request" cannot fail on either path.
  - Right: "No age or request count retires a message: it leaves the records only when a later message supersedes it or makes its sentences stale, a later reading of the same lookup replaces it, or a later answer files it quiet." Add an assertion on the replacement path.
- **9c.** Two measured-result claims a reader cannot check:
  - guides/agent.md:520 "the measured series injected Mica". The `6981e2d` removal of the benchmark paragraph left this phrase pointing at nothing. Right: delete the clause.
  - guides/agent.md:1287, changed by the fix: "the judge error the `a5-records` series of 2026-10-09 holds as deterministic" cites a series with no published record. It replaced one uncheckable citation with another. Right: "Matches the logprob decoding failure `invalid or duplicate top logprob token`, which the ledger holds for the ledger's life." Change the parity source at ledgers/constants.ts:610 to match.
- **9d.** guides/agent.md:524 "The repeat stop's identity compares string arguments as written" contradicts :542 and the code: `recall` compares the trimmed topic (Ledger.ts:958-959). Right: "For a lookup, the repeat stop's identity compares string arguments as written."
- **9e.** guides/agent.md:522 and :547 under-state what the plan leaves unbounded. See claim 4.
- Mutation checks:
  - The leading-exchange, recall-order, no-note, hold, amends/supersedes, pronoun, repeat-stop, over-budget and seed-tail tests each distinguish their mutation.
  - The direct-run and no-retirement tests do not, per 9a and 9b.

**10. API: BROKEN.**
- **10a.** ledgers/helpers.ts:33 `rankLedgerCut(group: number, …)` puts an untyped numeric code in the public API.
  - The doc lists 1, 2 and 3. The type admits any number, and `rankLedgerCut(7, false, 'rule')` returns 4 silently.
  - The callee also does not own the rank's meaning: the score tie-break keys on the returned values 0, 1 and 4 at Ledger.ts:687, so renumbering the helper silently reorders cuts.
  - This breaks the AGENTS.md laws "Real domain states only" and "define public types in `*/types.ts`", and names.md "Name the axis a discriminant varies".
  - Right: declare the planning group as a named literal union in ledgers/types.ts and accept it. Either move the tie-break into the helper's contract, or fold the helper back into `#plan`.
- **10b.** ledgers/helpers.ts:518, :526 and :527: the `cutListing` doc block says "items" while its parameter is `entries`, two terms for one concept. The guide row at :1325 repeats "Cuts items". Right: "entries" throughout. The cut-line text is wire data and stays as it is.
- Held:
  - `collectExchanges` has named consumers (`compact`, `filterSelectionMessages`, `#selectTail`), follows the `collect*` prefix, and has full TSDoc.
  - `LedgerTopic.requested` is a past participle with a "If `true`… Default" doc (see A1).
  - The `quiet` and `decisive` `@returns` now use the "True if…; false otherwise" shape.

**11. Coherence: BROKEN. I would not ship `6981e2d`.**
- Blocking:
  - claim 3, a tail that reaches the provider with unpaired call messages;
  - claim 5 input B, a public `agent` that plans for the wrong request and corrupts an active `respond`;
  - the false guide sentences in 9a, 9b, 9c and O1.
- Also required: 4, 6, 8, 9d, 10a, 10b, O2, O3 and O4.

## 2. Findings outside the claims

- **O1. The 10a "verbatim" falsehood survives in the parity row.**
  - guides/agent.md:1253 (`LedgerLine`: "a verbatim sentence of a live message"), with its sources ledgers/types.ts:372 and ledgers/helpers.ts:332.
  - These contradict guides/agent.md:521 and the pronoun test, which expects `'Dana Whitcombe: She approved the refund.'`.
  - Right: "a sentence of a live message, verbatim except that a pronoun-opening sentence opens with its party and a colon", in all three places.
- **O2. One guide, two definitions of an exchange.**
  - guides/agent.md:218 and contract 22 at :1727 say a message before the first user message "belongs to the first exchange", and that a cut "moves back to the user message that opens it".
  - :459, Conversation.ts:48-50 and conversations/types.ts:403-405 say leading messages form their own exchange.
  - The two are behaviourally equivalent for compaction because of the guard at Conversation.ts:233, but the concept now has two definitions.
  - Right: in :218 and :1727, "Leading messages form their own exchange, which folds only together with the first user exchange; a cut inside an exchange moves back to its start."
- **O3. The direct-run fault is a plain `Error`.**
  - Ledger.ts:551 `throw new Error('ledger agent generation requires an active respond call')`.
  - A `fault` listener cannot narrow it with `isLedgerError` or a code. This breaks typescript.md: "Programmer error… Throw an `AppError`" and "Error classes expose a machine-readable `code`".
  - Right: `new LedgerError('<CODE>', …)` with the code added to `LedgerErrorCode` (ledgers/types.ts:652) and documented.
- **O4. Positional call pairing misattributes reordered seed results.**
  - Input: seed calls `[c1 lookup_order {id:'BW-5512'}, c2 lookup_order {id:'LH-81660'}]` answered `t(c2)`, then `t(c1)`.
  - `#readLookups` (Ledger.ts:442-444) reads `t(c2)` with `c1`'s arguments, so the BW-5512 record carries LH-81660's text.
  - `#renderTailStub` (Ledger.ts:884-885) names the wrong call in the stub.
  - Right: pair by `message.call`, as in claim 3.
- **A1 (ADVISORY).** `LedgerTopic.requested` (ledgers/types.ts:74) reads as "the topic was requested", not "ask this topic about requests". It meets names.md's letter but not its "predict without documentation".

## 3. Attacked and held

- `collectExchanges` keeps the leading exchange separate and joins overlapping groups transitively.
- The single-pass `filterSelectionMessages` equals the removed fixpoint, except for the intended leading-exchange change.
- `compact`:
  - a cut inside the leading exchange, or at the first user message, folds nothing (Conversation.ts:233);
  - with no user message, nothing folds, as before;
  - a group spanning the newest user message moves the cut to the joined exchange's start.
- Recall excludes earlier requests (Ledger.ts:1009), so an earlier request does not reach a later prompt through recall.
- The answer-pass reuse of `#entered` and the new `#buildUnitRecord` keep the briefing bytes for the same tail.
- The guide inventory rows for `collectExchanges`, `cutListing` and `rankLedgerCut` exist. Summary parity is taken as established by `test:guides` 116/116.
- There is no rendered surface in scope.

VERDICT: FAIL 3, 4, 5, 6, 8, 9, 10, 11; outside the claims: O1, O2, O3, O4
