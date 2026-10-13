I'm in the objective lane, checking parity with the measured method. I worked from the source only: I had no shell, so I ran neither the vitest command nor `git status --porcelain`. Whether the suite passes is not evidenced.

## Verdicts

1. **Claim 1 (briefing text equals the measured render) — BROKEN.**
   - **a) Corrections land under the wrong heading.** Take a loose correction (group 2, category `correction`, in no record) that amends a unit.
     - Port: `/home/user/agent-port/src/core/ledgers/Ledger.ts:521` and `:601` (also `:621`) key every `ruled` unit, rule or correction, to `LEDGER_RULES_KEY`. The correction renders under `## Rules`, one sentence per line.
     - Measured: `#ruled` sends only user `rule` units to `## Rules` (`/home/user/agent/tmp/bench3/bench.mjs:2224-2226`, `:2262-2263`). The correction renders under `## Pinned`.
     - Fix: use `key: unit.ruled && unit.category === 'rule' ? LEDGER_RULES_KEY : unit.source` and keep `ruled` for grouping only.
   - **b) A user rule in an owner record leaks into unscoped requests.** Input: the user rule "Never ship to Brightwater Studio without a signature.", filed into the owner's record. A Rules record exists. The request names no owner.
     - Port: `held` holds only Rules members when unscoped (`Ledger.ts:478-482`). The rule survives as a group 2 unit and renders under `## Rules`.
     - Measured: `recorded` also takes held sources whose unit is `#ruled` (`bench.mjs:2115-2117`), so the rule leaves the briefing.
     - Fix: when `records.length > 0`, add to `held` every record member whose unit is a non-loose user `rule`.
   - **c) Group 3 order differs.** Input: group 3 units A (loose, score 3.2, position 5) and B (decisive, score 0.7, position 9).
     - Port: the comparator at `Ledger.ts:549` puts non-loose before loose in every group, so it renders B, A.
     - Measured: `third` sorts by score alone (`bench.mjs:2124`), so it renders A, B.
     - Fix: apply `Number(left.loose) - Number(right.loose)` only when `group === 1`.
   - **d) Amended corrections no longer render beside their source.**
     - Port: `#render` (`Ledger.ts:646-672`) has no amended-chain step. A correction renders by its own group and position, or not at all.
     - Measured: each kept unit's corrections render right after it (`bench.mjs:2266-2274`).
     - The plan doesn't list this as a removal; only the `[amended by mK]` mark carries a handle. Fix: after each unit, add the live corrections from `classification.amended` that no record holds.
   - **e) Lookup units lose their call lead.**
     - Port: a tool unit under `## Pinned` renders its bare content (`Ledger.ts:653`).
     - Measured: it renders `NAME ARGS: text` once the handle is gone (`bench.mjs:1494`, `:1926-1929`).
     - The brief makes only recall and the digest lead-free. Either rule this a planned departure in the plan or restore the lead.

2. **Claim 2 (budget arithmetic and cut order) — CONFIRMED.**
   - The budget formula, the tail cap, and `cap` (`Ledger.ts:471-475`) match `bench.mjs:2080-2084`.
   - The step order matches `bench.mjs:2128-2151`: off-desk Rules lines, then the units, then on-desk Rules lines, then owner lines with the last record first (`Ledger.ts:582-594`).
   - The per-class cut keys (`Ledger.ts:553-579`) match: group 3 and loose by score ascending then position descending, group 2 non-rule before rule, group 1 by score.
   - The size test joins with `\n\n`, which matches `AgentContext.build` (`/home/user/agent-port/src/core/contexts/AgentContext.ts:254`). That is the normalised separator the plan names.
   - Caveat: the set of units under the budget inherits the defects in claims 1b and 4.

3. **Claim 3 (tail equals the measured `#tail`) — BROKEN.**
   - **a) Seed assistant messages are dropped.** Input: a seed `{role:'assistant', content:'I'll check that order.'}` with no calls.
     - Port: `Ledger.ts:707` drops every assistant message without kept lookup calls. `Ledger.ts:721` blanks the content of seed call messages. The test at `/home/user/agent-port/tests/src/core/ledgers/Ledger.test.ts:75-77` asserts this drop.
     - Measured: under `tail-answers drop`, only loop-written assistant messages drop (`loopWritten` is position ≥ `seedCount`, `bench.mjs:1517-1519`). Seed text stays, and seed call messages keep their content (`bench.mjs:1964-1972`).
     - Fix: keep a pre-first-request assistant message with non-empty text, and keep its content beside kept calls. Then update the test.
   - **b) A superseded user message becomes an empty user turn.**
     - Port: `Ledger.ts:717-719` sets its content to `''` and keeps it, so an exchange can open on an empty user turn.
     - Fix: drop the message from `history`. That serves R2a without inventing a turn.
   - Held: grouping by whole exchange is equivalent to the measured per-group walk plus its final shift (`bench.mjs:1986-1997`), because `estimateMessages` is additive. Stub wording matches `bench.mjs:1878-1884` through `renderStub`, and R6 is honoured.

4. **Claim 4 (loose-unit admission and `#relevance` order) — BROKEN.**
   - **a) Entity matching is whole-name only.** Input: owner "Sigrid Holm" with "Sigrid" carried only by that name, a seed message "Sigrid wants the refund by Friday.", and a request about Sigrid Holm.
     - Port: `Ledger.ts:401` builds `input.entities` with `matchEntities(..., false)`. That set drives record placement (`helpers.ts:640`), unit topics (`Ledger.ts:518`), and recall topics (`Ledger.ts:858`). The message joins no record, misses group 1, and falls to group 3.
     - Measured: `recordInput` and `topics` use `entities(text)` with `partial = true` (`bench.mjs:2040`, `:1613`, `:1636-1641`). The message joins the owner's record and is group 1.
     - Fix: use `true` at `Ledger.ts:401`.
   - **b)** The group 3 ordering defect from 1c also applies here.
   - Held: the specifics test matches `carriesSpecifics` (`bench.mjs:1005-1008`), loose means "not decisive", quiet and superseded messages are excluded, and the score formula matches `bench.mjs:2004-2016`.

5. **Claim 5 (recall equals the measured recall) — BROKEN.**
   - **a) An empty-topic recall doesn't count toward the budget.** Input: `recall({topic:''})`, then `recall({topic:'A'})`, then `recall({topic:'B'})`.
     - Measured: the counter increments before the empty-topic refusal (`bench.mjs:2475-2478`), so the third call is closed.
     - Port: the counter increments after the refusal (`Ledger.ts:811-812`), so the third call runs.
     - Fix: increment `#recalls` before the empty check.
   - **b) The topic match accepts more than the measured one.** Input: topic `Sigrid's refund`.
     - Port: adds `matchEntities(registry, part, true)` (`Ledger.ts:835`), so it matches the owner and lists every message on that owner.
     - Measured: matches only exact ids and label-substring words (`bench.mjs:2517-2518`). No candidate matches, so it falls back to messages containing both words.
     - Fix: replace that term with `extractTokens(part).ids` membership.
   - **c) On-topic tests miss partial-name matches.** Recall topics use whole-name entities (see 4a), while measured `onTopic` uses `topics()` with `partial = true` (`bench.mjs:2555`). With the claim 4 input, the message "Sigrid wants the refund by Friday." is missing from `recall({topic:'Sigrid Holm'})`.
   - **d) Correction order flips.**
     - Measured: a correction follows its source in the same item (`bench.mjs:2534-2544`), giving "S\nC".
     - Port: lists messages separately, newest first, giving "C\nS".
   - **e) The no-match text loses its guidance.**
     - Port: `Ledger.ts:881` returns `nothing on "X"`.
     - Measured: returns `nothing on "X"; recall …topics` (`bench.mjs:2574`). Only the handle example is a planned removal.
   - **f) The port adds a refusal the measured recall lacks.**
     - Port: `Ledger.ts:823-826` refuses when `room <= 0`.
     - Measured: `#cut` always keeps at least one item (`bench.mjs:2586-2588`). Its only room-based closure is `left < 2*reserve` (`bench.mjs:1324`).
     - Either remove the refusal or record it in the plan as a departure.
   - Held: splitting at the measured joints, the closed note bytes, the limit check order, and F8 pricing of `{topic}`.

6. **Claim 6 (answer pass) — BROKEN.**
   - **Empty lookups vanish from the digest.** Input: a lookup in this request returns `No record` and `read` returns `undefined`.
     - Port: the reading exists but isn't live, so `text = ''` and the line is omitted (`Ledger.ts:919-923`). The answer pass removes every tool message, so the model never learns the lookup found nothing.
     - Measured: the digest keeps every successful lookup result verbatim (`bench.mjs:1903-1912`).
     - Fix: when `reading?.result === undefined`, use `message.content`.
   - Held:
     - The trigger matches `bench.mjs:3438` with the F5 widening.
     - Digest then cue order matches `bench.mjs:3391-3393`.
     - The scope uses `tools: []`, and the collapsed filter drops all calls, seed calls included (F4a).
     - The scope is restored afterward.
     - Stable reuse returns the entered briefing and tail plus `#after` (`Ledger.ts:443-448`, matching `bench.mjs:3301-3305`). The test pins it at `Ledger.test.ts:158-159`.

7. **Claim 7 (repeat stop and abort) — CONFIRMED.**
   - Key order and abort: the key is `canonicalStringify([name, args])` (`Ledger.ts:786`), checked and added before execution, as the measured `once` does (`bench.mjs:2780-2790`).
   - Repeat detection: the repeat is read from `result.error === notes.repeat` (`Ledger.ts:167-170`), which fixes F3, and the pass aborts with reason `repeat`.
   - The test at `Ledger.test.ts:91-139` would catch two mutations: going back to call-id detection (the ids are reused) or to `JSON.stringify` (the nested key order differs).
   - Departure: recall identity uses only the trimmed `{topic}` (`Ledger.ts:801`). The measured key keeps the untrimmed topic and any extra arguments (`bench.mjs:2782`), so the port's identity is coarser. This is consistent with F8, but the plan doesn't record it.

## Findings outside the claims

- **Gauge reply reserve (U5, referred to the Orchestrator).** `/home/user/agent-port/src/core/ledgers/Gauge.ts:119-121` sets the reply reserve to the largest completion of any call, tool-call turns included. The measured `measureReply` reads only the answering call (`bench.mjs:1278-1280`, `:3442`). This changes `reserve`, `room`, and the closure test.
- **Seed tool results have no success state.** `#results` fills only from agent `tool` events, so a seed failure or a seed repeat-notice tool message files as `fact` (`Ledger.ts:337-338`). It stays in the tail (`Ledger.ts:695`) and stubs from its reading (`:750-756`), never as `failed`. The measured method knew seed results through `load` and `results` (`bench.mjs:1878-1881`, `:1957`). The application needs a seam to declare seed results; this is unresolved.

## Attacked and held

- The tail cap uses `total * share.tail`, and `cap` subtracts the pre-briefing stub tail, as the measured plan does.
- The Rules record renders last. With no Rules record, the loose rules get a bare `## Rules` heading. Owner records sit under `###` headings inside one `## Pinned`.
- Selecting a continuation by its last user message works: `Agent.ts:353` hands the select the note or cue, and `#annotations` routes it to the entered plan.
- The `tool` event fires before the tool message is appended (`Agent.ts:542-546`). `#pending` therefore keys on the future index, and `#flush` resolves it.
- A caller abort skips the answer pass. A concurrent `respond` throws before any message is added (`Ledger.ts:242`).

VERDICT: FAIL 1 3 4 5 6