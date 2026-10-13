Lane: subjective (the reviewer on Opus 5.5). I lead on claims 7 and 8 and rule on all 8.

Evidence I read:
- the `tmp/units/falsify-port-3.diff` diff and the claims, lane and round-2 rulings files;
- `tmp/units/falsify2-opus-verdict.md`, for the mutations round 2 named;
- the tip sources and tests and `guides/agent.md` under `/home/user/agent-port`;
- the scaffold rules `AGENTS.md`, `documentation.md` and `writing.md`.

I ran nothing. Mutation survival is argued from the test bodies I read, not from a run.

## 1. Verdicts

**1. Pairing: BROKEN.** The id pairing holds. The clause "no prompt holds a call without its result" fails.
- Failing input: seed `[user 'Read both accounts.', assistant calls [{id:'c1', name:'lookup', arguments:{id:'BW-5512'}}, {id:'c2', name:'lookup', arguments:{id:'LH-81660'}}], tool {call:'c1', content:'…'}, tool {content:'…'} (no call)]`, then `respond('Check Brightwater Studio.')`.
- What happens:
  - `collectToolGroups` puts both tool messages in the leader's group, because a message with no `call` is paired.
  - `resolveLedgerCall` (`src/core/ledgers/helpers.ts:367-369`) pairs by id because one result carries an id, so the id-less result resolves to `undefined`.
  - In `#selectTail` (`src/core/ledgers/Ledger.ts:847-857`), `c2` is a registered lookup with `message === undefined`, so it is kept. The id-less tool message never enters `results`, so it is dropped.
  - The tail therefore sends `assistant calls [c1, c2]` with only `c1`'s result. OpenAI-style chat APIs reject that request.
- A leader that repeats a call id (`[c1 BW-5512, c1 LH-81660]`, answered `t(c1)`, `t(c1)`) fails the same way.
  - `find` resolves both results to the first call, so the second call is kept with no result.
  - `#readLookups` also reads the LH-81660 text with BW-5512's arguments: the O4 misattribution again.
  - `collectToolGroups` treats a repeated id positionally (`src/core/conversations/helpers.ts:214-217`). `resolveLedgerCall` does not, so the codebase has two pairing rules for one concept.
- Fix: at `Ledger.ts:855-856`, return `false` when `message === undefined`, so a call with no paired result leaves the tail. In `resolveLedgerCall`, pair by position when the leader repeats a call id, as `collectToolGroups` does.

**2. Holds: CONFIRMED.**
- Attacks that held:
  - Model A, then B, then A: the spec carries `model` (`Classifier.ts:250`, `:267`, `:277`), and the fingerprint is `JSON.stringify(spec)`.
  - A transient error is not held.
  - An abort rethrows (`:362`).
  - A logprob text inside a cause chain is held. That is within the constant's kind.
- Mutation check, `Classifier.test.ts` "keeps held fingerprints when the judge model alternates A B A":
  - keying by `spec.id` gives 3 requests instead of 2;
  - dropping `model` from the spec gives 1.
  - The assertions tell both apart.

**3. Stub pricing: CONFIRMED.**
- Attacks that held:
  - `'failed'` and `'empty'` don't depend on `shown`, so the plan-time render and the final render agree.
  - Both forms share the head, and `estimateTokens` is `ceil(length/4)` (`agents/helpers.ts:109`), so the longer string never estimates lower.
  - `cap` (`Ledger.ts:606-607`) subtracts the priced tail.
- Mutation check: reverting to `'shown'` pricing fails `Ledger.test.ts:138`. The "always `'hidden'`" mutation survives; see 7b.

**4. Ownership: BROKEN** (the "gauge readings unchanged" clause).
- Failing interleaving, the same as `Ledger.test.ts:185-253` phase `'first pass'`, but with the parked first-pass response carrying `usage: {prompt: 50, completion: 2, total: 52}`:
  1. The active pass emits `turn` (`Agent.ts:415`), and `#observeTurn` pushes `call0`.
  2. The provider parks.
  3. A direct run gets the `'REQUEST'` fault, and its `select` listener aborts it. The `select` filter at `Ledger.ts:218` is correctly skipped.
  4. The aborted run still enters the loop and emits `turn` before its abort check (`Agent.ts:411-437`). `#observeTurn` (`Ledger.ts:919-932`) pushes a foreign `callX` and moves `#position`.
  5. On release, the active usage lands on `#calls.at(-1)`, which is `callX` (`Ledger.ts:224-233`).
- Result: `Gauge.observe` (`Gauge.ts:122-127`) finds `calls[0]` without `prompt` and keeps the old scale instead of 50/`call0.estimate`. The active request's readings change.
- The test cannot catch this. `Ledger.test.ts:229` and `:237` both snapshot `ledger.gauge` before `release.resolve()`, and `observe` runs only at `respond`'s end. `expect(unchanged).toEqual(gauge)` (`:244`) cannot fail for any mutation of the `turn` or `usage` listeners.
- Fix: the emitter events carry no run identity, so the ledger cannot attribute them. Narrow claim 4 to selection and boundary. Extend the concurrent-run limit (`guides/agent.md:543`) to state that any run started during a `respond` call, faulted or planned, adds its turns and usage to that call's gauge readings. Replace the `:244` assertion with one taken after `await pending` that pins the limit.

**5. Calibration replay: BROKEN** (`'all'`).
- Failing input: provider `replay: 'all'`, no `gauge` option, seed `[user 'Read the account.', assistant {content:'Sending the receipt.', thinking:'PRIVATE', calls:[{id:'c1', name:'send_email', arguments:{}}]}, tool {call:'c1', content:'Sent.'}]`, then `respond('Next.')`.
- What happens:
  - Calibration (`Ledger.ts:279-286`) keeps `'PRIVATE'`.
  - `send_email` is unregistered, so `#selectTail` rebuilds the assistant message as `{ id, role, content }` (`Ledger.ts:878`), which drops its thinking. The first request carries none.
  - Under `'all'`, an exchange the tail budget cuts has the same effect.
- Fix: restate the claim as "calibration applies the replay policy at the next user boundary", which is the round-2 ruling and what the guide at `:654` says. The calibration prices the whole view; the request carries only the tail.

**6. Byte identity, restated: BROKEN.**
- Cause: `c5dbac9` prices a tail stub at the longer of its forms (`Ledger.ts:908-911`), where `6981e2d` priced it at `'shown'` (diff line 281). The hidden form is longer whenever the first string argument exceeds 12 characters.
- Failing input:
  - Seed `[user 'Look up the Brightwater refund.', assistant calls [{id:'c1', name:'lookup', arguments:{id:'BW-20931-REFUND-0007'}}], tool {call:'c1', content:'Account BW-20931: Brightwater Studio.'}]`. It opens with a user message, pairs its result in order, and carries no thinking.
  - The hidden stub is 2 tokens longer than the shown one.
  - Choose a `capacity` whose tail share lies between the exchange's shown-priced and hidden-priced estimates, or a briefing within 2 tokens of `cap`.
  - `7f346b5` keeps the exchange or the briefing step, and `c5dbac9` drops it.
- The 8 replayed runs use ids of at most 8 characters, so the replay doesn't exercise this path.
- Fix: add "and whose tail stubs are no longer hidden than shown" to the claim. The change is intended (ruling 4).

**7. Guide: BROKEN.**
- **7a. "Calibration admits no run" has no assertion for `calibrate` after a `respond`** (`guides/agent.md:518`).
  - Mutation: delete `this.#request = undefined` (`Ledger.ts:395`).
  - What the mutation does: run a `respond` whose answer-pass provider call rejects, so the `cue` note stays newest. Then call `ledger.calibrate()` and, while it is parked, `ledger.agent.generate()`. The direct run passes the guard at `:554-558` and returns `#entered` as a planned selection with no fault.
  - The calibrate-time cases don't catch it:
    - `guides.test.ts:1963` adds a fresh user message first;
    - `Ledger.test.ts:224` runs before any `respond`.
  - Right: add that executed case, expecting `'REQUEST'`.
- **7b. "The plan prices each lookup stub in the tail at the longer of its `shown` and `hidden` forms"** (`:522`).
  - Mutation: `shown === undefined ? 'hidden'` at `Ledger.ts:908-911`.
  - No assertion catches it, as far as I read the tests:
    - The only pricing case, `Ledger.test.ts:138`, uses a 400-character argument whose hidden form is longer.
    - The other tight-budget cases (`Ledger.test.ts:310`, `:2244`, `guides.test.ts:1832`) exclude the seed exchange under either pricing, or carry no lookup.
    - The sentence has no presence guard in `guides.test.ts`.
  - Right: add a short-id lookup whose shown form is longer and whose exchange sits at the tail boundary with its result shown. Assert that the tail fits, and pin the sentence.
- **7c. Measured-result sentences remain that a reader cannot check.**
  - The sentences:
    - `guides/agent.md:531`, "the measured wording";
    - `:1283-1287`, "measured wording", "measured text", "measured prompt and tail shares", and "the measured limit of 8" and "of 2".
  - Their sources:
    - `src/core/ledgers/constants.ts:40-41`, "the measured records series … through the Mica judge";
    - `:98`, `:109` and `:117`, "The `a5-records` series of 2026-10-09".
  - Round 2 (9c) ruled this series uncheckable. Outside `tmp/`, the repository holds no record of it; only `constants.ts` names it.
  - Right: drop "measured" and the series citations ("Caps … at 8 turns" is a limit, which `AGENTS.md` § Writing allows), or link a published record of the run.
- Held:
  - The exchange rewrite (`guides.test.ts:865`): `inside` must be `undefined`, which catches a leading exchange folding alone.
  - The round-2 direct-run mutations, inputs A and B: the reply run gets `selections` and `faults` equal to `[]`; reverting the guard changes `asks`.
  - The round-2 no-retirement mutations (`guides.test.ts:2382`): a case-sensitive `identifyLookup` keeps `$148.50`; ignoring a quiet filing keeps the caller line.
  - The plan-bound test (`:2290`).

**8. Coherence: BROKEN. I would not ship `c5dbac9`.**
- Blocking:
  - claim 1, where a tail reaches the provider with a call that has no result;
  - claim 4 and O1, where a misused public `agent` corrupts an active request and the test meant to pin it cannot fail;
  - 7a and 7b, guide claims with no gate;
  - 7c.
- Also required: restate claims 5 and 6.

## 2. Findings outside the claims

- **O1. A concurrent faulted run shares the active request's repeat stop.**
  - Interleaving: the active `respond` is parked in its first-pass stream. A direct run gets the `'REQUEST'` fault, sees the whole view and every tool, and calls `lookup {id:'BW-5512'}`. `#repeat` (`Ledger.ts:958-963`) records the key in `#answered`.
  - Result: the active pass's own `lookup {id:'BW-5512'}` returns the `repeat` note. The ledger sets `#closed` and calls `agent.abort('repeat')` (`:212-215`), which aborts every run (`Agent.ts:248-253`), the owned pass included.
  - Right: the same limit text as claim 4 at `guides/agent.md:543`, naming the repeat stop.
- **A1 (ADVISORY).** `LedgerPlanningGroup = 1 | 2 | 3` (`types.ts:446`) meets ruling 10a's letter, but its members are opaque numbers. The tie-break it documents (`helpers.ts:52-54`) still lives in `#plan` (`Ledger.ts:695-700`), keyed on rank values 0, 1 and 4.
- **A2 (ADVISORY).** The `'REQUEST'` member doc (`types.ts:450`), "whose request belongs to no active respond call or ledger note", says a request can belong to a note. Right: "whose request is neither an active `respond` call's request nor a ledger note".

## 3. Attacked and held

- The answer-pass re-plan against "bounds only … a request's first call": a first selection faults only on an abort, which precedes any provider call, so the answer pass's call is the request's first call.
- A planned concurrent run matches the `:543` limit (`guides.test.ts:1984`).
- `select` filtering keeps `#selected`, `#boundary` and `#usage` for `'REQUEST'` faults, and the judge is never asked before the guard.
- Calibration ordering: `#request` is always `undefined` during the calibration that opens a `respond` call.
- The `LedgerLine`, `LedgerError`, `DETERMINISTIC_JUDGE_ERROR` and `cutListing` rewrites are true of the code.
- No rendered surface is in scope.

VERDICT: FAIL 1, 4, 5, 6, 7, 8; outside the claims: O1
