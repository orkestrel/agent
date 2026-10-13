Lane: subjective (reviewer, Opus 5.5). I lead on claims 10 to 12 and rule on all 12. Evidence comes from `tmp/units/falsify-port.diff`, the tip sources under `/home/user/agent-port/src/core`, the tests, `guides/agent.md`, `tmp/units/records-port-plan.md`, and `../scaffold` `AGENTS.md`, `names.md`, `typescript.md`, `architecture.md`, `writing.md` and `documentation.md`. Nothing was run.

## 1. Verdicts

**1. Abort — CONFIRMED.**
- Attacks that held:
  - An abort during filing makes `Classifier.classify` return a fault. `#select` then returns a fault selection, `caller.aborted` is true, and no answer pass runs (Ledger.ts:342).
  - An abort through `options.agent.signal` takes the same path, because it is folded into `caller`.
  - An abort during a lookup: the result is recorded, and `#pending` is flushed in `finally`.
  - Re-entry after an abort: `#active` is reset, and `#answered`, `#recalled`, `#calls`, `#position`, `#recalls`, `#closed` and `#entered` are cleared at the next start (Ledger.ts:332-339).
  - Completed judgments stay in the store, and `#ask` keeps the partial answers.
- Mutation: drop `!caller.aborted` at Ledger.ts:342. Ledger.test.ts:1019-1023 asserts one pass and no cue note, so it catches this.

**2. Concurrency — CONFIRMED.**
- Attack: `respond` during `calibrate`, `calibrate` during `respond`, and a second `respond`. The check and the set of `#active` run synchronously before the first `await` (Ledger.ts:265, 321), so nothing changes before the rejection.
- Mutation: set `#active` after `#measureGauge`. Ledger.test.ts:1067-1092 catches it.

**3. Answer pass — CONFIRMED.**
- Attacks that held:
  - `think: true`, `false` and omitted: the answer pass always calls `#runPass(caller, false)`.
  - The answer scope has `tools: []`, so no tool is advertised.
  - The trigger is `partial || content.trim() === ''` with no caller abort.
- Mutations:
  - Pass `this.#options.think` to the answer pass: guides.test "selects first-pass thinking…" expects `{ think: false }`, so it catches this.
  - Omit `tools: []`: Ledger.test.ts:961 and 1000 assert `tools` is undefined, so they catch this.

**4. Budget invariant — BROKEN (second half).**
- The first half held. Capacity enters the first-pass request only through `(capacity - predict)` at Ledger.ts:589.
- Failing input: `capacity: 600`, `gauge: { scale: 1, fixed: 0 }`, then `respond('x'.repeat(4000))`.
  - The tail starts as `[request]` whatever the cap (Ledger.ts:895), so the first call estimates at more than 1,000 units.
  - The same happens with an unbounded lookup result inside a pass.
  - It also happens when the briefing loop runs out of steps (Ledger.ts:742-769 sends anyway).
  - It also happens on the fault path, which sends the whole `view()` (Ledger.ts:564-569).
- Fix: narrow the claim to the plan budget. Document "no over-window refusal", which records-port-plan.md:29 ruled "documented" but the guide does not carry (see 10f).

**5. Recall — BROKEN ("amenders after their source").**
- Failing input: the repository's own Ledger.test.ts:1538-1636. The correction amends `old` and also matches the topic, so it is listed first, as its own item. The output is `correction\nharmless\nretired\nold`, and `old` is not followed by its amender.
- Cause: the `done` set in Ledger.ts:1070-1087 lists a topic-matching amender before its source when walking newest first.
- Fix (wording, not code; this is the measured behaviour): "each source is followed by the amenders the topic does not itself match; an amender the topic matches lists as its own newer item."
- The limit, repeat, closed-note and cut-notice parts held (Ledger.test.ts:1396-1512).

**6. Briefing — CONFIRMED.**
- Attacks that held:
  - A party-prefixed line.
  - A stale sentence inside a rule unit rendered through `#renderSource`: it renders by line index when lines are fewer than sentences.
  - The answer pass reusing `#entered.briefing`.
  - A faulted selection, which drops the briefing (AgentContext `build`).
  - Stubs, recall text, the recall description and the error texts carry no handle.
- Mutation: make `#renderSource` always return `message.content`. Ledger.test.ts:1629-1630 and guides.test "drops a stale sentence…" catch it. helpers.test.ts:785 guards handles.
- "Stale" is evaluated by the code's own definition (shared token); 10h covers what that definition hides.

**7. Judge failures — BROKEN.**
- Failing input: a judge whose ask always fails with an error that will fail the same way every time but whose text is not the one the hold regex matches. Examples: `JudgeError('QUESTION', …)` (the package's own "refused before inference" code), or an HTTP 400 context-size error for an over-long message state. That item is asked again on every request, because only `DETERMINISTIC_JUDGE_ERROR` (`/invalid or duplicate top logprob token/`, constants.ts:136) sets a hold (Classifier.ts:356-357).
- Fix: also hold when the error is a `JudgeError` with code `'QUESTION'`, keep the measured regex as an addition for the System One wire, and state in the guide which failures hold.
- The other parts held:
  - a transient error is asked again;
  - an abort keeps partial answers (Classifier.ts:347-358);
  - `createSelection` faults only when every subject asked fails (contexts/factories.ts `errors.length > 0 && judgments.length === 0`).
- The ledger's own handler never faults when the judge is down (Classifier.ts:358-359, by design in types.ts:489). The claim's "selection" therefore holds only if it means `createSelection`.

**8. Thinking replay — BROKEN (the last clause as worded).**
- Failing input: `provider.replay = 'all'` and a seed assistant message carrying `thinking`, then `calibrate`. The calibration body carries the recorded thinking (Ledger.ts:276-282 applies `#replay`).
- The guide says calibration applies the policy, so the code and the guide agree. Fix: restate the claim as "under `'none'`, never reaches a calibration body". No code change.
- The summary, the judge state (`#renderState` and the selection state) and the `'none'`/`'turn'` wire all held.

**9. Selection and compaction — BROKEN (ledger tail).**
- Failing input, as a seed: `user 'Look up order BW-5512. ' + 'x'.repeat(40000)`, then `assistant calls [{ id: 'c1', name: 'lookup_order' }]`, then `user 'The printer needs paper.'`, then `tool call 'c1'`. Then `respond(...)` at `capacity: 32_768`.
- `#selectTail` groups exchanges by user boundary only (Ledger.ts:890-902). The second exchange `[user, tool c1]` fits and the first does not, so the tail sends a tool message whose call is absent from the prompt.
- `filterSelectionMessages` and `compact()` both join a group that spans two exchanges. The ledger does not.
- Fix: in `#selectTail`, join exchanges that a kept tool group spans before cutting. Better, route all three through one exchange helper (see O2).
- No-fold-after-abort held (Agent.ts `#trim` guard; the guides.test mutation check catches its removal).

**10. Guide — BROKEN.**
Each item names what is wrong and what right looks like.
- a. guides/agent.md:519, types.ts:369 and helpers.ts:309 say "Each line is a verbatim sentence". helpers.ts:818 writes `${party}: ${sentence}`, and the `buildLines` example shows `'Odile Marlow: She wants a refund.'`. Right: "a sentence of a live message, verbatim except that a pronoun-opening sentence opens with its party and a colon."
- b. guides/agent.md:521 says "each followed by the messages that amend it". This is false per claim 5. Right: the wording given in claim 5.
- c. guides/agent.md:514 says "An earlier request and its reply never re-enter the prompt". On a selection fault the agent builds from the full `view()` (Ledger.ts:564-569, pinned by Ledger.test.ts:1129-1130). Right: state the fault fallback.
- d. guides/agent.md:514 says "no request reads all of it". This is false for the guide's own first request: the conversation is the seed rule plus the request, and both are sent. Right: delete the sentence.
- e. guides/agent.md:523 and types.ts:309-311 say "adds an answer note". The note is added only when `#buildDigest()` returns text (Ledger.ts:343-345). Right: "adds an answer note when the pass's lookups or recalls returned anything."
- f. guides/agent.md:536-542 lack the limits the plan ruled "Documented" (records-port-plan.md:26, 29):
  - T10: only messages added before the first request form the seed tail; a later application message reaches the model only through the briefing or `recall`.
  - T11: no retirement.
  - No refusal of an over-window prompt.
  Right: add the three bullets.
- g. guides/agent.md:544 reports the research harness's `a5-records` series as "the records design" inside the package's method section. records-port-plan.md:59 and 103 rule that the port's behaviour rests on U9, and no run artifact is cited. Right: remove the paragraph until U9 reports, then cite that run.
- h. guides/agent.md:518 says the classification "reads the filing back at the cutoffs". An `amends` answer at its cutoff marks a pair only when the two texts share an id or a number (Classifier.ts:204-211). The guide's own test pair ("$100" / "$250") never marks. Right: state the token gate in the guide and in types.ts:356-359.
- i. guides/agent.md:1283 cites `tmp/bench3/bench.mjs:867`, which is gitignored (.gitignore:11) and missing from the package. Right: drop the path.
- j. guides/agent.md:522 says "canonical arguments", but two identities exist (see O3).
- Proof check on the new guide tests:
  - The amends-topic test catches dropping topics from `#collectNear`.
  - The tail-share test catches removing `- fixed`.
  - The W+P test catches removing `- this.#predict`.
  The assertions distinguish these mutations.

**11. API — BROKEN.**
- constants.ts:135-136 with Classifier.ts:356: the hold predicate is a measured, server-specific setting, fixed in code, for a judge the caller injects. Right: the fix given in claim 7.
- helpers.ts:511 `cutItems`: names.md § Rejected naming bans `item`. Right: a name such as `cutListing(entries, room)`, with `matchesCutLine` unchanged.
- types.ts:74 `LedgerTopic.requests?: boolean`: names.md requires a boolean to be an adjective or past participle that reads as an assertion. Right: rename it to such an assertion.
- types.ts:520, types.ts:527, Classifier.ts:136 and Classifier.ts:149: the `@returns` of `quiet` and `decisive` read "Whether…" or "`true` when…". typescript.md requires "True if …; false otherwise".
- constants.ts:99, 110, 119, 129-131 and 135 cite unpublished `tmp/` paths. writing.md: claim only what the reader can check. Right: cite the series and the date in prose, or a committed record.
- The helper exports with no outside consumer (`collectLive`, `placeMember`, `collectStale`, `buildLines`) are required by architecture.md:51, so they held.

**12. Coherence — BROKEN. I would not ship 7f346b5.**
- Blocking:
  - the claim 9 tail split, a code defect that reaches the provider;
  - the claim 7 hold coupling;
  - the false guide sentences in 10a to 10e and 10g;
  - finding O1.
- Also required: O2, O3, O4, 10f, 10h, and the 11 naming and TSDoc items.

## 2. Findings outside the claims

**O1. Running `ledger.agent` directly answers the previous request.**
- Input: `await ledger.respond('A')`, then `ledger.conversation.add({ role: 'user', content: 'B' })`, then `await ledger.agent.generate()`.
- `#select` plans for `this.#request ?? request` (Ledger.ts:556), so the tail carries A, not B, and B is filed as a statement.
- types.ts:299-300 exposes the agent with no warning.
- Fix: in `#select`, return a fault selection when `!this.#active`. A run the ledger did not start then fails visibly.

**O2. "Exchange" is implemented three times with different meanings.**
- The three places:
  - `compact()` (Conversation.ts:220-246) puts leading messages in the first exchange;
  - `filterSelectionMessages` (contexts/helpers.ts:150-153) puts them in no exchange;
  - `#selectTail` (Ledger.ts:890-902) makes them a separate group that never enters the tail.
- Input: a seed opening with `assistant 'Enjoy the break.'`. Compaction folds it with the first exchange, selection can drop it alone, and the ledger never sends it.
- Rules broken: architecture.md:64 ("route every duplicate through it") and the one-concept-one-term law.
- Fix: one exported exchange helper in conversations/helpers.ts, used by all three. It also closes claim 9.

**O3. Two identities for "the same lookup".**
- `identifyLookup` trims and uppercases top-level string arguments (helpers.ts:165-173). The repeat stop uses raw `canonicalStringify([name, args])` (Ledger.ts:969).
- Input: `lookup_order {id:'bw-5512'}` then `{id:'BW-5512'}` in one request. Both run with no repeat stop, while the projection treats the second as replacing the first.
- Fix: route `#repeat` through `identifyLookup`, or name the two identities apart in the guide and TSDoc.

**O4. Duplicated code in `#plan`.**
- The unit-to-record mapping is copied at Ledger.ts:724-741 and 751-768.
- The cut-rank ternary is written twice at Ledger.ts:682-701.
- architecture.md:54 forbids duplicate implementations. Fix: extract one mapping and one exported, tested rank helper.

**Advisory (cost and minor naming):**
- **A1.** Every `#assign` of a tool message rescans all tool groups and re-invokes the application's `read` handlers (Ledger.ts:424-426). `classification()` calls `quiet` and `category` for each message (Classifier.ts:183-186), so each projection makes about 2T² read calls for T lookups. Cache readings per conversation length.
- **A2.** Gauge `#history` grows without bound, and `rate` scans all of it on every call (Gauge.ts:29, 82, 128).
- **A3.** `LEDGER_SCALE_DRIFT` was measured on one model and cannot be overridden (constants.ts:124-133).
- **A4.** `GaugeCall.tools` holds a count. `left` is not a noun, so it breaks the bare-noun accessor rule.
- **A5.** `placeMember` exposes its recursion accumulator `seen` in its public signature.

## 3. Attacked and held

- `build` appends the briefing only without a fault (AgentContext.ts).
- A compaction cut inside a group that spans two exchanges moves before the group, and a request alone folds nothing.
- `stripThinking` writes no `undefined` member.
- The merge and rollup summarizer calls read summaries only, so no thinking reaches them.
- Calibration recovers after `GAUGE` with no request appended.
- `createSelection` faults with the first judge error as its cause.
- The relay double-strip keeps only what both policies keep.
- The diff's guides/scaffold.md and guides/test.md changes are mirror refreshes.
- There is no rendered surface in scope.

VERDICT: FAIL 4, 5, 7, 8, 9, 10, 11, 12; outside the claims: O1, O2, O3, O4
